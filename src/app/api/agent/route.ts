import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { buildSystemPrompt } from '@/lib/agentPrompts'
import { getAgentModel } from '@/lib/models'

export const runtime = 'nodejs'

const DEFAULT_WORK_DIR = path.resolve(process.cwd())
const IS_WIN = process.platform === 'win32'

function getEnv() {
  const npmGlobal = IS_WIN
    ? path.join(process.env.APPDATA ?? 'C:\\Users\\Default\\AppData\\Roaming', 'npm')
    : path.join(process.env.HOME ?? '/home/user', '.npm-global', 'bin')
  const env = { ...process.env, PATH: [npmGlobal, process.env.PATH].filter(Boolean).join(IS_WIN ? ';' : ':') }
  delete (env as Record<string, string | undefined>).ANTHROPIC_API_KEY
  return env
}

function spawnCC(extraArgs: string[], cwd: string) {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions', ...extraArgs]
  return spawn('claude', args, { cwd, env: getEnv(), shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
}

// Pre-load key project files server-side (zero tokens)
function buildProjectContext(cwd: string): string {
  const parts: string[] = []
  try {
    const css = fs.readFileSync(path.join(cwd, 'src/app/globals.css'), 'utf8')
    parts.push(`## globals.css (PRE-LOADED — do NOT re-read):\n\`\`\`css\n${css}\n\`\`\``)
  } catch { /* not found */ }
  try {
    const graph = fs.readFileSync(path.join(cwd, 'graphify-out/GRAPH_REPORT.md'), 'utf8')
    parts.push(`## Codebase Graph (PRE-LOADED — do NOT re-read):\n${graph}`)
  } catch { /* not found */ }
  return parts.join('\n\n')
}

function buildAgentPrompt(agentId: string, message: string, workspaceCtx?: string, sharedCtx?: string): string {
  const persona = buildSystemPrompt(agentId, 'dm')
  const sections = [
    persona,
    sharedCtx ? `## PRE-LOADED FILES (use directly — skip re-reading):\n${sharedCtx}` : '',
    workspaceCtx ? `## WORKSPACE CONTEXT:\n${workspaceCtx}` : '',
    `## YOUR TASK:\n${message}`,
    `## EXECUTION RULES:
1. READ before you WRITE — read the full target file before editing
2. MINIMAL DIFF — change only what the task requires
3. PRESERVE existing behaviour — never break working functionality
4. TypeScript MUST compile — run: npx tsc --noEmit after every file write; fix ALL errors
5. VERIFY — re-read changed lines to confirm correctness
6. REPORT — list every file changed and confirm TypeScript passes`,
  ]
  return sections.filter(Boolean).join('\n\n')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { message, agentId = 'nova', workDir, workspaceContext, projectContext } = body as {
    message?: string
    agentId?: string
    workDir?: string
    workspaceContext?: string
    projectContext?: string
  }

  const cwd = workDir ?? DEFAULT_WORK_DIR
  const encoder = new TextEncoder()

  // If 'auto' mode is requested, just use nova as single agent
  // (auto pipeline is handled by /api/claude-code with pipeline:true)
  const effectiveAgentId = agentId === 'auto' ? 'nova' : agentId

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      try {
        const sharedCtx = buildProjectContext(cwd)
        const mergedCtx = [workspaceContext, projectContext].filter(Boolean).join('\n\n') || undefined
        const prompt = buildAgentPrompt(effectiveAgentId, message ?? '', mergedCtx, sharedCtx)

        send({ type: 'agent_start', agentId: effectiveAgentId, role: effectiveAgentId.toUpperCase() })

        const proc = spawnCC(['--model', getAgentModel(effectiveAgentId)], cwd)
        proc.stdin?.write(prompt, 'utf8')
        proc.stdin?.end()

        let buf = ''
        proc.stdout.on('data', (chunk: Buffer) => {
          buf += chunk.toString('utf8')
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            try {
              const ev = JSON.parse(line)
              if (ev.type === 'assistant' && ev.message?.content) {
                for (const block of ev.message.content) {
                  if (block.type === 'text' && block.text) {
                    send({ type: 'text', text: block.text, agentId: effectiveAgentId })
                  }
                  if (block.type === 'tool_use') {
                    send({ type: 'tool_call', toolName: block.name, toolId: block.id, input: block.input ?? {}, agentId: effectiveAgentId })
                  }
                }
              }
              if (ev.type === 'user' && ev.message?.content) {
                for (const block of ev.message.content) {
                  if (block.type === 'tool_result') {
                    const content = Array.isArray(block.content)
                      ? block.content.map((c: { text?: string }) => c.text ?? '').join('')
                      : String(block.content ?? '')
                    send({ type: 'tool_result', toolId: block.tool_use_id, result: content.slice(0, 500), success: !block.is_error, agentId: effectiveAgentId })
                  }
                }
              }
              if (ev.type === 'result') {
                if (ev.is_error && ev.result) send({ type: 'error', error: ev.result, agentId: effectiveAgentId })
              }
            } catch { /* skip malformed lines */ }
          }
        })

        proc.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf8').trim()
          if (text) send({ type: 'cc_log', text })
        })

        await new Promise<void>((resolve, reject) => {
          proc.on('close', resolve)
          proc.on('error', reject)
        })

        send({ type: 'agent_done', agentId: effectiveAgentId })

      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
