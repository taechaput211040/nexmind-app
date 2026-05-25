import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getWorkspace, updateWorkspaceBranch } from '@/lib/db'

export const runtime = 'nodejs'

function runGit(args: string[], cwd: string): Promise<{ out: string; err: string; code: number }> {
  return new Promise(resolve => {
    const proc = spawn('git', args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    proc.stdout.on('data', (c: Buffer) => { out += c.toString() })
    proc.stderr.on('data', (c: Buffer) => { err += c.toString() })
    proc.on('close', code => resolve({ out: out.trim(), err: err.trim(), code: code ?? 0 }))
    proc.on('error', e => resolve({ out: '', err: e.message, code: 1 }))
  })
}

// GET /api/workspace/git?id=xxx
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const [branchR, statusR, logR, remoteR, branchesR] = await Promise.all([
      runGit(['rev-parse', '--abbrev-ref', 'HEAD'], ws.path),
      runGit(['status', '--porcelain'], ws.path),
      runGit(['log', '--oneline', '-10'], ws.path),
      runGit(['rev-parse', '--abbrev-ref', '@{upstream}'], ws.path),
      runGit(['branch', '--format=%(refname:short)'], ws.path),
    ])

    const branch = branchR.out
    let ahead = 0, behind = 0
    if (remoteR.out && !remoteR.out.includes('no upstream') && !remoteR.err) {
      const ab = await runGit(['rev-list', '--left-right', '--count', `${remoteR.out}...HEAD`], ws.path)
      const parts = ab.out.split(/\s+/)
      behind = parseInt(parts[0] ?? '0') || 0
      ahead  = parseInt(parts[1] ?? '0') || 0
    }

    const commits = logR.out.split('\n').filter(Boolean).map(line => {
      const [hash, ...rest] = line.split(' ')
      return { hash: hash ?? '', message: rest.join(' ') }
    })

    const branches = branchesR.out.split('\n').filter(Boolean)
    const dirty = statusR.out.length > 0
    const changedFiles = statusR.out.split('\n').filter(Boolean).length

    if (branch && branch !== ws.branch) updateWorkspaceBranch(id, branch)

    return NextResponse.json({ branch, dirty, changedFiles, ahead, behind, commits, branches })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/workspace/git  — mutations (commit, push, pull, checkout, create-branch)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string
      action: 'commit' | 'push' | 'pull' | 'checkout' | 'create-branch' | 'fetch'
      message?: string
      branch?: string
    }
    const { id, action, message, branch } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    let result: { out: string; err: string; code: number }

    switch (action) {
      case 'commit': {
        if (!message?.trim()) return NextResponse.json({ error: 'commit message required' }, { status: 400 })
        // Stage all changes then commit
        const stageR = await runGit(['add', '-A'], ws.path)
        if (stageR.code !== 0) return NextResponse.json({ ok: false, output: stageR.err || stageR.out })
        result = await runGit(['commit', '-m', message.trim()], ws.path)
        break
      }
      case 'push':
        result = await runGit(['push'], ws.path)
        break
      case 'pull':
        result = await runGit(['pull', '--rebase'], ws.path)
        break
      case 'fetch':
        result = await runGit(['fetch', '--all', '--prune'], ws.path)
        break
      case 'checkout': {
        if (!branch) return NextResponse.json({ error: 'branch required' }, { status: 400 })
        result = await runGit(['checkout', branch], ws.path)
        if (result.code === 0) updateWorkspaceBranch(id, branch)
        break
      }
      case 'create-branch': {
        if (!branch) return NextResponse.json({ error: 'branch name required' }, { status: 400 })
        result = await runGit(['checkout', '-b', branch], ws.path)
        if (result.code === 0) updateWorkspaceBranch(id, branch)
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 })
    }

    const ok = result.code === 0
    const output = [result.out, result.err].filter(Boolean).join('\n')
    return NextResponse.json({ ok, output })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
