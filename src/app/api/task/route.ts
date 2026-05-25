import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/agentPrompts'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const PIPELINE_AGENTS: Record<string, { agents: string[]; roles: string[]; outputFile?: string }> = {
  landing:   { agents: ['scout', 'luna', 'nova'], roles: ['research brief', 'UX plan + sections', 'write TSX code'], outputFile: 'tsx' },
  component: { agents: ['rex', 'nova'],            roles: ['architecture plan', 'write TSX code'],                   outputFile: 'tsx' },
  api:       { agents: ['rex', 'byte'],             roles: ['API design', 'write backend code'],                     outputFile: 'ts' },
  content:   { agents: ['scout', 'ink'],            roles: ['research + outline', 'write full article'],             outputFile: 'md' },
  analysis:  { agents: ['scout', 'atlas'],          roles: ['data gathering', 'analysis + insights'],               outputFile: 'md' },
}

// ARIA pipeline planner prompt
const PIPELINE_PLANNER = `You are ARIA, pipeline planner at NEXMIND.

Analyze the user's request and return ONLY a JSON object (no markdown, no explanation):

{
  "pipelineType": "landing|component|api|content|analysis|custom",
  "agents": ["agent1", "agent2", "agent3"],
  "roles": ["role1 description", "role2 description", "role3 description"],
  "outputFile": "filename.ext",
  "taskSummary": "one line Thai summary of what will be built"
}

Available agents: nova(frontend), byte(backend), rex(architect), luna(UX), pixel(visual), scout(research), ink(writer), hawk(trading), sage(risk), atlas(data), coin(finance)

Rules:
- Max 3 agents
- Last agent in chain should produce the final deliverable (code/content)
- outputFile should be the actual filename like "affiliate/page.tsx" or "blog-post.md"
- For landing pages: scout→luna→nova
- For components: rex→nova
- For APIs: rex→byte
- For articles: scout→ink`

async function callClaude(
  agentId: string,
  systemPrompt: string,
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'

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
      max_tokens: agentId === 'nova' || agentId === 'byte' ? 2000 : 600,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    }),
    signal,
  })

  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callClaudeStream(
  agentId: string,
  systemPrompt: string,
  userMessage: string,
  signal: AbortSignal,
  onChunk: (text: string) => void,
  isCodeOutput = false,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!
  // code output ใช้ sonnet ถ้ามี ไม่งั้นใช้ haiku แต่เพิ่ม tokens
  const model = isCodeOutput
    ? (process.env.CLAUDE_MODEL_CODE ?? process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001')
    : 'claude-haiku-4-5-20251001'

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
      max_tokens: isCodeOutput ? 4000 : agentId === 'nova' || agentId === 'byte' ? 2000 : 600,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    }),
    signal,
  })

  if (!res.ok) throw new Error(await res.text())

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return fullText
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          fullText += parsed.delta.text
          onChunk(parsed.delta.text)
        }
      } catch { /* skip */ }
    }
  }
  return fullText
}

// Extract code block from agent output — strips ALL surrounding text
function extractCode(text: string, ext: string): string | null {
  // 1. Try fenced code block (handles ``` tsx, ```typescript, etc.)
  const fenceRegex = /```(?:[a-z]*)\n([\s\S]+?)```/i
  const match = text.match(fenceRegex)
  if (match) return match[1].trim()

  // 2. Find first real code line and take everything from there
  if (ext === 'tsx' || ext === 'ts' || ext === 'js' || ext === 'jsx') {
    const lines = text.split('\n')
    const codeStart = lines.findIndex(l =>
      l.trim().startsWith("'use client'") ||
      l.trim().startsWith('"use client"') ||
      l.trim().startsWith('import ') ||
      l.trim().startsWith('export default') ||
      l.trim().startsWith('export const') ||
      l.trim().startsWith('const ') ||
      l.trim().startsWith('function ')
    )
    if (codeStart !== -1) return lines.slice(codeStart).join('\n').trim()
  }

  if (ext === 'md') return text.trim()
  return null
}

export async function POST(req: NextRequest) {
  const { request, projectContext } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'No API key' }), { status: 500 })

  const abort = new AbortController()
  req.signal.addEventListener('abort', () => abort.abort())

  const encoder = new TextEncoder()

  function send(controller: ReadableStreamDefaultController, event: object) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Step 1: ARIA plans the pipeline ──
        send(controller, { type: 'status', text: '🔮 ARIA กำลังวิเคราะห์งาน...' })

        let plan: { agents: string[]; roles: string[]; outputFile: string; taskSummary: string }

        try {
          const planText = await callClaude('aria', PIPELINE_PLANNER, request, abort.signal)
          const jsonMatch = planText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0])
          } else throw new Error('no json')
        } catch {
          // fallback plan
          plan = {
            agents: ['scout', 'luna', 'nova'],
            roles: ['research brief', 'UX plan', 'write TSX code'],
            outputFile: 'landing/page.tsx',
            taskSummary: 'สร้าง landing page',
          }
        }

        send(controller, {
          type: 'plan',
          agents: plan.agents,
          roles: plan.roles,
          outputFile: plan.outputFile,
          taskSummary: plan.taskSummary,
        })

        // ── Step 2: Run each agent in chain ──
        const agentOutputs: Record<string, string> = {}

        for (let i = 0; i < plan.agents.length; i++) {
          const agentId = plan.agents[i]
          const role = plan.roles[i]
          const isLast = i === plan.agents.length - 1

          if (abort.signal.aborted) break

          send(controller, { type: 'agent_start', agentId, role })

          // Build context from previous agents
          const prevContext = Object.entries(agentOutputs)
            .map(([id, out]) => `=== ${id.toUpperCase()} OUTPUT ===\n${out}`)
            .join('\n\n')

          // Build prompt for this agent
          const agentPrompt = buildSystemPrompt(agentId, 'dm')

          let taskPrompt = `TASK: ${request}\n\n`
          if (projectContext) taskPrompt += `PROJECT CONTEXT:\n${projectContext}\n\n`
          if (prevContext) taskPrompt += `PREVIOUS AGENTS' WORK:\n${prevContext}\n\n`

          if (isLast && (plan.outputFile.endsWith('.tsx') || plan.outputFile.endsWith('.ts'))) {
            taskPrompt += `YOUR ROLE: ${role}\n\nIMPORTANT: Output ONLY complete, production-ready code in a single \`\`\`tsx code block. No explanation outside the code block. The code must be immediately usable.`
          } else if (isLast && plan.outputFile.endsWith('.md')) {
            taskPrompt += `YOUR ROLE: ${role}\n\nWrite the complete final content now. Make it production-ready.`
          } else {
            taskPrompt += `YOUR ROLE: ${role}\n\nBe concise and structured. Your output will be passed to the next agent.`
          }

          // Stream this agent's response
          let agentFull = ''
          try {
            agentFull = await callClaudeStream(agentId, agentPrompt, taskPrompt, abort.signal, chunk => {
              send(controller, { type: 'agent_chunk', agentId, text: chunk })
            }, isLast)
          } catch (err: unknown) {
            if (err instanceof Error && err.name !== 'AbortError') {
              send(controller, { type: 'agent_error', agentId, error: err.message })
            }
            break
          }

          agentOutputs[agentId] = agentFull
          send(controller, { type: 'agent_done', agentId })

          // Small pause between agents
          await new Promise(r => setTimeout(r, 200))
        }

        // ── Step 3: Save file directly to workspace ──
        const lastAgent = plan.agents[plan.agents.length - 1]
        const lastOutput = agentOutputs[lastAgent]
        if (lastOutput && !abort.signal.aborted) {
          const ext = plan.outputFile.split('.').pop() ?? 'txt'
          const code = extractCode(lastOutput, ext) ?? lastOutput

          try {
            // Save inside nexmind-app/src/app/ for TSX pages,
            // or workspace root for other files
            let filePath: string
            let displayPath: string

            if (ext === 'tsx' || ext === 'ts') {
              // e.g. "affiliate/page.tsx" → src/app/affiliate/page.tsx
              filePath = path.join(process.cwd(), 'src', 'app', plan.outputFile)
              displayPath = `nexmind-app/src/app/${plan.outputFile}`
            } else {
              // md, html etc → workspace generated folder
              filePath = path.join(process.cwd(), '..', 'generated', plan.outputFile)
              displayPath = `AGENT-COMPANY/generated/${plan.outputFile}`
            }

            await fs.mkdir(path.dirname(filePath), { recursive: true })
            await fs.writeFile(filePath, code, 'utf-8')

            // Windows path for computer:// link
            const winPath = filePath.replace(/\//g, '\\')

            send(controller, {
              type: 'file_saved',
              path: winPath,
              displayPath,
              name: plan.outputFile,
              code,
            })
          } catch (err) {
            send(controller, { type: 'file_error', error: String(err) })
          }
        }

        send(controller, { type: 'done' })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          send(controller, { type: 'error', error: err.message })
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
