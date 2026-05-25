import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { addWorkspace, type Workspace } from '@/lib/db'

export const runtime = 'nodejs'

const WORKSPACES_DIR = path.resolve(process.cwd(), '..', 'workspaces')
if (!fs.existsSync(WORKSPACES_DIR)) fs.mkdirSync(WORKSPACES_DIR, { recursive: true })

function getGitBranch(cwd: string): Promise<string> {
  return new Promise(resolve => {
    const proc = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, shell: true })
    let out = ''
    proc.stdout.on('data', (c: Buffer) => { out += c.toString() })
    proc.on('close', () => resolve(out.trim() || 'main'))
    proc.on('error', () => resolve('main'))
  })
}

// POST /api/workspace/clone
// Body: { url: string, name?: string }
// Returns: SSE stream with { type: 'progress'|'done'|'error', ... }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { url?: string; name?: string }
  const { url, name } = body

  if (!url) {
    return new Response(JSON.stringify({ error: 'url required' }), { status: 400 })
  }

  // Derive repo name from URL
  const repoName = (name?.trim() || url.split('/').pop()?.replace(/\.git$/, '') || 'repo').replace(/[^a-zA-Z0-9._-]/g, '-')
  const destPath = path.join(WORKSPACES_DIR, repoName)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }

      try {
        if (fs.existsSync(destPath)) {
          return send({ type: 'error', error: `Folder "${repoName}" already exists in workspaces` })
        }

        send({ type: 'progress', text: `Cloning ${url} → workspaces/${repoName}...` })

        await new Promise<void>((resolve, reject) => {
          const proc = spawn('git', ['clone', '--progress', url, destPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
          })

          // git clone writes progress to stderr
          proc.stderr.on('data', (chunk: Buffer) => {
            const text = chunk.toString('utf8').replace(/\r/g, '\n').trim()
            if (text) send({ type: 'progress', text })
          })

          proc.stdout.on('data', (chunk: Buffer) => {
            const text = chunk.toString('utf8').trim()
            if (text) send({ type: 'progress', text })
          })

          proc.on('close', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`git clone failed with exit code ${code}`))
          })

          proc.on('error', (err: Error) => reject(err))
        })

        const branch = await getGitBranch(destPath)

        const workspace: Workspace = {
          id: `ws_${Date.now()}`,
          name: repoName,
          path: destPath,
          git_url: url,
          branch,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
        }

        addWorkspace(workspace)
        send({ type: 'done', workspace })

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        send({ type: 'error', error: msg })
        // Clean up partial clone
        if (fs.existsSync(destPath)) {
          try { fs.rmSync(destPath, { recursive: true, force: true }) } catch { /* ignore */ }
        }
      } finally {
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
