import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

function run(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  return new Promise(resolve => {
    // Include Claude Code's auth env so graphify can use --backend claude
    const ccAuthDir = process.env.CLAUDE_CONFIG_DIR
    const extraEnv: Record<string, string> = {}
    if (ccAuthDir) extraEnv['CLAUDE_CONFIG_DIR'] = ccAuthDir
    if (process.env.ANTHROPIC_API_KEY) extraEnv['ANTHROPIC_API_KEY'] = process.env.ANTHROPIC_API_KEY

    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...extraEnv },
    })
    let out = ''
    proc.stdout.on('data', (c: Buffer) => { out += c.toString() })
    proc.stderr.on('data', (c: Buffer) => { out += c.toString() })
    proc.on('close', code => resolve({ ok: code === 0, output: out.trim() }))
    proc.on('error', err => resolve({ ok: false, output: err.message }))
  })
}

// GET /api/workspace/graphify?id=xxx  — check graph status
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const reportPath = path.join(ws.path, 'graphify-out', 'GRAPH_REPORT.md')
    const hasGraph = fs.existsSync(reportPath)

    if (!hasGraph) return NextResponse.json({ hasGraph: false })

    // Extract summary line from report
    const report = fs.readFileSync(reportPath, 'utf8')
    const summaryMatch = report.match(/^- (\d+ nodes[^\n]+)$/m)
    const summary = summaryMatch ? summaryMatch[1] : ''
    const commitMatch = report.match(/Built from commit: `([a-f0-9]+)`/)
    const builtAt = commitMatch ? commitMatch[1] : ''

    return NextResponse.json({ hasGraph: true, summary, builtAt })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/workspace/graphify  body: { id: string }
// Runs `graphify . --update` (or `graphify .` if no graph yet)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { id?: string }
    const id = body.id
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const graphDir = path.join(ws.path, 'graphify-out')
    const hasExisting = fs.existsSync(graphDir)

    // --update is AST-only (no LLM needed); full build uses --backend claude
    const args = hasExisting
      ? ['.', '--update']
      : ['.', '--backend', 'claude']

    // Try `graphify` — falls back to npx graphify if not global
    let result = await run('graphify', args, ws.path)
    if (!result.ok && (result.output.includes('not found') || result.output.includes('command not found'))) {
      result = await run('npx', ['graphify', ...args], ws.path)
    }

    // Re-read summary after build
    const reportPath = path.join(ws.path, 'graphify-out', 'GRAPH_REPORT.md')
    let summary = ''
    if (fs.existsSync(reportPath)) {
      const report = fs.readFileSync(reportPath, 'utf8')
      const m = report.match(/^- (\d+ nodes[^\n]+)$/m)
      summary = m ? m[1] : ''
    }

    return NextResponse.json({
      ok: result.ok,
      output: result.output,
      hasGraph: fs.existsSync(reportPath),
      summary,
      mode: hasExisting ? 'update' : 'full',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
