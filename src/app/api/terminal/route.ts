import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'

// POST /api/terminal  body: { command: string, cwd?: string }
// Streams command output as SSE: { type: 'stdout'|'stderr'|'exit'|'error'|'done', text?, code? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { command, cwd } = body as { command?: string; cwd?: string }

  if (!command || !command.trim()) {
    return new Response(JSON.stringify({ error: 'No command provided' }), { status: 400 })
  }

  const workDir = cwd ? path.resolve(cwd) : process.cwd()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const proc = spawn(command.trim(), [], {
          cwd: workDir,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        })

        proc.stdout.on('data', (chunk: Buffer) => {
          send({ type: 'stdout', text: chunk.toString('utf8') })
        })

        proc.stderr.on('data', (chunk: Buffer) => {
          send({ type: 'stderr', text: chunk.toString('utf8') })
        })

        await new Promise<void>((resolve, reject) => {
          proc.on('close', (code: number | null) => {
            send({ type: 'exit', code: code ?? 0 })
            resolve()
          })
          proc.on('error', (err: Error) => {
            send({ type: 'error', text: err.message })
            resolve()
          })
        })
      } catch (err: unknown) {
        send({ type: 'error', text: err instanceof Error ? err.message : String(err) })
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
