import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/agentPrompts'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

export const runtime = 'nodejs'
const execAsync = promisify(exec)

const PROJECT_ROOT = process.cwd()

// ── Project context — read once at module load ────────────────
let PROJECT_CONTEXT_CACHE: string | null = null

async function getProjectContext(): Promise<string> {
  if (PROJECT_CONTEXT_CACHE) return PROJECT_CONTEXT_CACHE

  const parts: string[] = []

  // package.json — tech stack
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    const stack = Object.keys(deps).filter(d =>
      ['next','react','typescript','tailwindcss','@anthropic-ai'].some(k => d.includes(k))
    ).map(d => `${d}@${deps[d]}`)
    parts.push(`## Project: ${pkg.name ?? 'nexmind-app'}\nStack: ${stack.join(', ')}`)
  } catch { /* skip */ }

  // globals.css — CSS variables (first 60 lines)
  try {
    const css = await fs.readFile(path.join(PROJECT_ROOT, 'src/app/globals.css'), 'utf-8')
    const relevant = css.split('\n').slice(0, 60).join('\n')
    parts.push(`## globals.css (theme variables):\n${relevant}`)
  } catch { /* skip */ }

  // src/ file tree (shallow)
  try {
    const SKIP = new Set(['node_modules', '.git', '.next', 'dist'])
    const files: string[] = []
    async function walk(dir: string, depth: number) {
      if (depth > 2 || files.length > 60) return
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const e of entries) {
        if (SKIP.has(e.name)) continue
        const rel = path.join(dir, e.name).replace(PROJECT_ROOT + path.sep, '')
        files.push(e.isDirectory() ? `${rel}/` : rel)
        if (e.isDirectory()) await walk(path.join(dir, e.name), depth + 1)
      }
    }
    await walk(path.join(PROJECT_ROOT, 'src'), 0)
    parts.push(`## src/ structure:\n${files.join('\n')}`)
  } catch { /* skip */ }

  PROJECT_CONTEXT_CACHE = parts.join('\n\n')
  return PROJECT_CONTEXT_CACHE
}

function safePath(filePath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, filePath.replace(/^\//, ''))
  if (!resolved.startsWith(PROJECT_ROOT)) throw new Error(`Path not allowed: ${filePath}`)
  return resolved
}

const ALLOWED_COMMANDS = [
  /^npm run (build|lint|type-check|test)$/,
  /^npx tsc(?: --noEmit)?$/,
  /^npx eslint .+/,
  /^ls .*/,
  /^find .+ -type f.*/,
]
function isCommandAllowed(cmd: string): boolean {
  return ALLOWED_COMMANDS.some(r => r.test(cmd.trim()))
}

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from the project. Use relative paths from project root.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root, e.g. src/app/page.tsx' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file. Creates parent directories automatically.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory. Returns file tree.',
    input_schema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Directory path relative to project root, e.g. src/app' },
        depth: { type: 'number', description: 'Max depth to traverse (default 2)' },
      },
      required: ['dir'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a whitelisted npm/build command. Allowed: npm run build, npm run lint, npx tsc --noEmit',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run' },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for a pattern in the codebase. Returns matching lines with file paths.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Text or regex pattern to search' },
        dir: { type: 'string', description: 'Directory to search in (default: src)' },
      },
      required: ['pattern'],
    },
  },
]

async function executeTool(name: string, input: Record<string, string | number>): Promise<string> {
  try {
    switch (name) {
      case 'read_file': {
        const filePath = safePath(input.path as string)
        const content = await fs.readFile(filePath, 'utf-8')
        return content.length > 6000 ? content.slice(0, 6000) + '\n... [truncated]' : content
      }
      case 'write_file': {
        const filePath = safePath(input.path as string)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, input.content as string, 'utf-8')
        return `✅ Saved: ${input.path}`
      }
      case 'list_files': {
        const dirPath = safePath(input.dir as string)
        const maxDepth = (input.depth as number) ?? 3
        const SKIP = new Set(['node_modules', '.git', '.next', 'dist', '.turbo'])
        const results: string[] = []
        async function walk(dir: string, depth: number) {
          if (depth > maxDepth || results.length >= 80) return
          let entries: import('fs').Dirent[]
          try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
          for (const e of entries) {
            if (SKIP.has(e.name)) continue
            const full = path.join(dir, e.name)
            const rel = full.replace(PROJECT_ROOT + path.sep, '').replace(PROJECT_ROOT + '/', '')
            if (e.isDirectory()) {
              results.push(`${rel}/`)
              await walk(full, depth + 1)
            } else {
              results.push(rel)
            }
          }
        }
        await walk(dirPath, 0)
        return results.join('\n') || 'empty'
      }
      case 'run_command': {
        const cmd = input.command as string
        if (!isCommandAllowed(cmd)) return `❌ Command not allowed: ${cmd}`
        try {
          const { stdout, stderr } = await execAsync(cmd, { cwd: PROJECT_ROOT, timeout: 30000 })
          const out = (stdout + stderr).trim()
          return out.length > 3000 ? out.slice(-3000) : out || '✅ No output (success)'
        } catch (err: unknown) {
          const e = err as { stdout?: string; stderr?: string; message?: string }
          const out = ((e.stdout ?? '') + (e.stderr ?? '')).trim()
          return out.length > 3000 ? out.slice(-3000) : (out || (e.message ?? 'Command failed'))
        }
      }
      case 'search_code': {
        const searchDir = input.dir ? safePath(input.dir as string) : path.join(PROJECT_ROOT, 'src')
        const pattern = input.pattern as string
        const SKIP = new Set(['node_modules', '.git', '.next', 'dist'])
        const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json'])
        const matches: string[] = []
        async function searchDir_(dir: string) {
          if (matches.length >= 50) return
          let entries: import('fs').Dirent[]
          try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
          for (const e of entries) {
            if (SKIP.has(e.name)) continue
            const full = path.join(dir, e.name)
            if (e.isDirectory()) { await searchDir_(full); continue }
            if (!CODE_EXTS.has(path.extname(e.name))) continue
            let content: string
            try { content = await fs.readFile(full, 'utf-8') } catch { continue }
            const lines = content.split('\n')
            const rel = full.replace(PROJECT_ROOT + path.sep, '').replace(PROJECT_ROOT + '/', '')
            let fileMatches = 0
            for (let i = 0; i < lines.length && fileMatches < 5; i++) {
              if (lines[i].includes(pattern)) {
                matches.push(`${rel}:${i + 1}: ${lines[i].trim()}`)
                fileMatches++
              }
            }
          }
        }
        await searchDir_(searchDir)
        return matches.length ? matches.join('\n') : 'No matches found'
      }
      default:
        return `Unknown tool: ${name}`
    }
  } catch (err: unknown) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ── ARIA Pipeline Planner ─────────────────────────────────────
const PIPELINE_PLANNER = `You are ARIA, orchestrator at NEXMIND Command Center.
Analyze the user's request and return ONLY a JSON object — no markdown, no explanation:

{
  "agents": ["agentId1", "agentId2"],
  "roles": ["specific role description 1", "specific role description 2"],
  "summary": "สรุปงานเป็นภาษาไทย 1 บรรทัด"
}

Available agents:
- nova: frontend/React/Next.js — writes TSX/CSS files
- byte: backend/API/Node.js — writes server files
- rex: architecture & planning — outputs specs only
- luna: UX/user flows — outputs design specs only
- pixel: visual design & color — outputs exact hex values and CSS variable mappings only
- scout: research — outputs findings only
- ink: writing/content — writes markdown files
- atlas: data analysis — outputs analysis only
- coin: finance — outputs reports only

Rules:
- 1-3 agents max. Last agent ALWAYS writes files.
- Color/theme change: pixel → nova
  - pixel role: "Output new hex values for each CSS variable in globals.css to match [theme]. List every variable: --purple: #..., --pink: #... etc. No code, just values."
  - nova role: "Read globals.css, replace CSS variable hex values with pixel's spec, write_file to save"
- New UI feature: luna → nova OR rex → nova
- Backend: rex → byte
- Content: scout → ink
- Single focused task (e.g. fix a bug, add one component): just nova or byte alone
- nova for React/TSX, byte for API/server`

// ── Agentic loop (reusable per-agent) ────────────────────────
type FullMessage = { role: string; content: unknown }

async function runAgentLoop(
  agentId: string,
  systemPrompt: string,
  messages: FullMessage[],
  apiKey: string,
  model: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  abort: AbortController,
): Promise<{ text: string; finalMessages: FullMessage[] }> {
  function send(ev: object) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
  }

  const msgs: FullMessage[] = [...messages]
  let iterations = 0
  const MAX_ITERATIONS = 8
  let fullText = ''

  while (iterations < MAX_ITERATIONS) {
    if (abort.signal.aborted) break
    iterations++

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages: msgs,
      }),
      signal: abort.signal,
    })

    if (!res.ok) {
      send({ type: 'error', error: await res.text(), agentId })
      break
    }

    const data = await res.json()
    const content = data.content as Array<{
      type: string; text?: string; name?: string; id?: string
      input?: Record<string, string | number>
    }>

    for (const block of content) {
      if (block.type === 'text' && block.text) {
        fullText += block.text
        send({ type: 'text', text: block.text, agentId })
      }
    }

    if (data.stop_reason === 'end_turn') break
    if (data.stop_reason !== 'tool_use') break

    const toolUseBlocks = content.filter(b => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) break

    msgs.push({ role: 'assistant', content })

    const toolResults = []
    for (const block of toolUseBlocks) {
      if (!block.name || !block.id) continue

      send({ type: 'tool_call', toolName: block.name, toolId: block.id, input: block.input, agentId })

      const result = await executeTool(block.name, block.input ?? {})

      send({
        type: 'tool_result',
        toolId: block.id,
        toolName: block.name,
        result: result.slice(0, 500),
        success: !result.startsWith('Error:') && !result.startsWith('❌'),
        agentId,
      })

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    msgs.push({ role: 'user', content: toolResults })
  }

  if (iterations >= MAX_ITERATIONS) {
    send({ type: 'text', text: '\n⚠️ Reached max iterations', agentId })
  }

  return { text: fullText, finalMessages: msgs }
}

// ── Main handler ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { message, agentId = 'nova', history = [], fullHistory, projectContext } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500 })

  const model = process.env.CLAUDE_MODEL_CODE ?? process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'
  const abort = new AbortController()
  req.signal.addEventListener('abort', () => abort.abort())

  const encoder = new TextEncoder()

  const projectCtx = await getProjectContext()

  const TOOL_INSTRUCTIONS = `

## TOOL ACCESS — project root: ${PROJECT_ROOT}
Tools: read_file, write_file, list_files, run_command, search_code

${projectCtx}

## RULES:
1. Use the project context above — don't re-read files you already know about.
2. Act immediately — never ask "should I?". If told to fix/build/change, DO IT.
3. No clarifying questions — make reasonable assumptions and execute.
4. Always write files via write_file — never just describe changes.
5. After writing code, run \`npx tsc --noEmit\` and fix any errors automatically.`

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      try {
        // ════════════════════════════════════════════════════
        // AUTO PIPELINE MODE
        // ════════════════════════════════════════════════════
        if (agentId === 'auto') {
          send({ type: 'status', text: '🔮 ARIA กำลังวิเคราะห์งาน...' })

          let plan: { agents: string[]; roles: string[]; summary: string } = {
            agents: ['nova'],
            roles: ['analyze and implement the task'],
            summary: message,
          }

          try {
            const planRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: PIPELINE_PLANNER,
                messages: [{ role: 'user', content: message }],
              }),
              signal: abort.signal,
            })
            if (planRes.ok) {
              const planData = await planRes.json()
              const planText = planData.content?.[0]?.text ?? ''
              const jsonMatch = planText.match(/\{[\s\S]*\}/)
              if (jsonMatch) plan = JSON.parse(jsonMatch[0])
            }
          } catch { /* use fallback */ }

          send({ type: 'pipeline_plan', agents: plan.agents, roles: plan.roles, summary: plan.summary })

          // Run each agent sequentially with tool access
          let prevContext = ''

          for (let i = 0; i < plan.agents.length; i++) {
            if (abort.signal.aborted) break
            const agId = plan.agents[i]
            const role = plan.roles[i]

            send({ type: 'agent_start', agentId: agId, role })

            const systemPrompt = buildSystemPrompt(agId, 'dm', projectContext) + TOOL_INSTRUCTIONS

            const isLast = i === plan.agents.length - 1
            let userContent = `TASK: ${message}\n`
            if (projectContext) userContent += `\nPROJECT CONTEXT:\n${projectContext}\n`
            if (prevContext) userContent += `\nPREVIOUS AGENTS' WORK:\n${prevContext}\n`

            if (isLast) {
              // Last agent = implementer — must write files
              userContent += `\nYOUR ROLE: ${role}

You are the FINAL agent in this pipeline. You MUST:
1. Call write_file to save every change to disk — outputting text alone is NOT enough
2. The project context already contains globals.css and file structure — use that, don't re-read files you already know
3. Apply all changes from previous agents' work above
4. Run npx tsc --noEmit after writing, fix any errors
5. Confirm exactly which files were written`
            } else {
              // Non-last agent = planner/designer — output a spec, no file writes needed
              userContent += `\nYOUR ROLE: ${role}
You are a SPECIALIST agent. Output a detailed spec/plan — exact values, no ambiguity.
Do NOT call write_file. Your output becomes the next agent's instructions.`
            }

            const agentMsgs: FullMessage[] = [{ role: 'user', content: userContent }]
            const agResult = await runAgentLoop(agId, systemPrompt, agentMsgs, apiKey, model, controller, encoder, abort)
            prevContext += `\n\n[${agId.toUpperCase()} OUTPUT]:\n${agResult.text.slice(0, 800)}`
            send({ type: 'agent_done', agentId: agId })
          }

        } else {
          // ════════════════════════════════════════════════════
          // SINGLE AGENT MODE
          // ════════════════════════════════════════════════════
          const systemPrompt = buildSystemPrompt(agentId, 'dm', projectContext) + TOOL_INSTRUCTIONS

          let msgs: FullMessage[]
          if (fullHistory && Array.isArray(fullHistory) && fullHistory.length > 0) {
            msgs = [...(fullHistory as FullMessage[]), { role: 'user', content: message }]
          } else {
            const histText = (history as Array<{role:string;content:string}>)
              .slice(-6).map(m => `${m.role === 'taec' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
            msgs = [{ role: 'user', content: histText ? `${histText}\nUser: ${message}` : message }]
          }

          const result = await runAgentLoop(agentId, systemPrompt, msgs, apiKey, model, controller, encoder, abort)

          // Send trimmed history back (cap tool_result content)
          const trimmed = result.finalMessages.slice(-20).map(m => {
            if (m.role !== 'user' || !Array.isArray(m.content)) return m
            return {
              ...m,
              content: (m.content as Array<{type:string;content?:unknown}>).map(b =>
                b.type === 'tool_result' && typeof b.content === 'string'
                  ? { ...b, content: b.content.slice(0, 800) }
                  : b
              ),
            }
          })
          send({ type: 'conversation_history', messages: trimmed })
          void projectContext
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`))
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
