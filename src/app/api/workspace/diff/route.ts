import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

function run(args: string[], cwd: string): Promise<string> {
  return new Promise(resolve => {
    const proc = spawn('git', args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    proc.stdout.on('data', (c: Buffer) => { out += c.toString() })
    proc.stderr.on('data', () => { /* ignore */ })
    proc.on('close', () => resolve(out))
    proc.on('error', () => resolve(''))
  })
}

interface FileStat {
  path: string
  added: number
  removed: number
}

// Parse git diff --stat output into per-file stats
function parseStats(statOut: string): FileStat[] {
  const results: FileStat[] = []
  for (const line of statOut.split('\n')) {
    const m = line.match(/^\s+(.+?)\s*\|\s*\d+\s*([+\-]*)/)
    if (m) {
      const plusMinus = m[2] ?? ''
      results.push({
        path: m[1].trim(),
        added:   (plusMinus.match(/\+/g) ?? []).length,
        removed: (plusMinus.match(/-/g)  ?? []).length,
      })
    }
  }
  return results
}

// Extract raw diff for a single file path
function extractFileDiff(fullDiff: string, filePath: string): string {
  const chunks = fullDiff.split(/^(?=diff --git )/m)
  return chunks.find(c => c.includes(`b/${filePath}`) || c.includes(`"b/${filePath}"`)) ?? ''
}

// GET /api/workspace/diff?id=xxx
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const isGitCheck = await run(['rev-parse', '--git-dir'], ws.path)
    if (!isGitCheck.trim()) {
      return NextResponse.json({ isGit: false, isClean: true, files: [], untracked: [], fileDiffs: {}, summary: 'Not a git repository' })
    }

    const [statOut, fullDiff, untrackedOut] = await Promise.all([
      run(['diff', 'HEAD', '--stat'], ws.path),
      run(['diff', 'HEAD', '--unified=4'], ws.path),
      run(['ls-files', '--others', '--exclude-standard'], ws.path),
    ])

    const files: FileStat[] = parseStats(statOut)
    const untracked: string[] = untrackedOut.split('\n').filter(Boolean)

    // Map path → raw diff chunk (for diff2html on frontend)
    const fileDiffs: Record<string, string> = {}
    for (const f of files) {
      fileDiffs[f.path] = extractFileDiff(fullDiff, f.path)
    }

    const isClean = files.length === 0 && untracked.length === 0
    const summary = statOut.split('\n').find(l => l.includes('changed'))?.trim() ?? ''

    return NextResponse.json({ isGit: true, isClean, files, untracked, fileDiffs, summary })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
