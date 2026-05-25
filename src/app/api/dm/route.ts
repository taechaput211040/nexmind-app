import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
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
  delete env.ANTHROPIC_API_KEY
  return env
}

function spawnCC(cwd: string, model: string) {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions', '--model', model]
  return spawn('claude', args, { cwd, env: getEnv(), shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { message, agentId, history, workspacePath, workspaceContext, docContext } = body as {
    message?: string
    agentId?: string
    history?: Array<{ role: string; content: string }>
    workspacePath?: string
    workspaceContext?: string
    docContext?: string
  }

  if (!message || !agentId) {
    return new Response(JSON.stringify({ error: 'Missing message or agentId' }), { status: 400 })
  }

  const cwd = workspacePath ?? DEFAULT_WORK_DIR
  const encoder = new TextEncoder()
  const systemPrompt = buildSystemPrompt(agentId, 'dm')
  const model = getAgentModel(agentId)

  const historyText = (history ?? [])
    .slice(-10)
    .map(m => `${m.role === 'taec' ? 'User (TAEC)' : 'Agent'}: ${m.content}`)
    .join('\n\n')

  // Prepend workspace context when available
  const workspaceBlock = workspaceContext
    ? `\n\n## ACTIVE WORKSPACE:\n${workspaceContext}\n\nUse the workspace context above to understand the project structure and tech stack before responding.`
    : ''
  const docBlock = docContext
    ? `\n\n## ATTACHED DOCUMENT (อ่านก่อนตอบ):\n${docContext}\n\nอ้างอิงเนื้อหาในเอกสารด้านบนเพื่อตอบคำถามของ TAEC`
    : ''

  const fullPrompt = [
    systemPrompt,
    workspaceBlock,
    docBlock,
    historyText ? `\n\n---\nCONVERSATION HISTORY:\n${historyText}` : '',
    `\n\n---\nUser (TAEC): ${message}`,
    `\nAgent (${agentId.toUpperCase()}):`,
  ].join('')

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawnCC(cwd, model)
          proc.stdin?.write(fullPrompt, 'utf8')
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
                      send({ type: 'text', text: block.text, agentId })
                    }
                  }
                }
                if (ev.type === 'result' && ev.is_error && ev.result) {
                  send({ type: 'error', error: ev.result })
                }
              } catch { /* skip */ }
            }
          })

          proc.stderr.on('data', () => { /* ignore */ })
          proc.on('close', () => resolve())
          proc.on('error', reject)
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        send({ type: 'error', error: msg })
      } finally {
        send({ type: 'done' })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
