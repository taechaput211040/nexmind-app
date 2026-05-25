import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'

export const runtime = 'nodejs'

const execAsync = promisify(exec)
const REPOS_DIR = path.join(process.cwd(), 'data', 'repos')

// GET /api/git?action=tree&repo=xxx  or  ?action=file&repo=xxx&file=path
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const repoName = searchParams.get('repo')

  if (!repoName) return NextResponse.json({ error: 'repo required' }, { status: 400 })

  const repoPath = path.join(REPOS_DIR, repoName)

  if (action === 'tree') {
    try {
      const { stdout } = await execAsync(
        `find "${repoPath}" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" | sort | head -200`,
        { maxBuffer: 1024 * 1024 }
      )
      const files = stdout.trim().split('\n').filter(Boolean).map(f =>
        f.replace(repoPath + '/', '')
      )
      return NextResponse.json({ files })
    } catch {
      return NextResponse.json({ error: 'Repo not found. Clone it first.' }, { status: 404 })
    }
  }

  if (action === 'file') {
    const filePath = searchParams.get('file')
    if (!filePath) return NextResponse.json({ error: 'file required' }, { status: 400 })

    // Security: prevent path traversal
    const fullPath = path.resolve(repoPath, filePath)
    if (!fullPath.startsWith(repoPath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    try {
      const content = await fs.readFile(fullPath, 'utf-8')
      // Limit to 8000 chars for context
      return NextResponse.json({ content: content.slice(0, 8000), truncated: content.length > 8000 })
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
  }

  if (action === 'list') {
    try {
      await fs.mkdir(REPOS_DIR, { recursive: true })
      const entries = await fs.readdir(REPOS_DIR, { withFileTypes: true })
      const repos = entries.filter(e => e.isDirectory()).map(e => e.name)
      return NextResponse.json({ repos })
    } catch {
      return NextResponse.json({ repos: [] })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// POST /api/git  { url: 'https://github.com/...', name: 'myrepo' }
export async function POST(req: NextRequest) {
  const { url, name } = await req.json()

  if (!url || !name) {
    return NextResponse.json({ error: 'url and name required' }, { status: 400 })
  }

  // Validate URL
  if (!url.startsWith('https://github.com/') && !url.startsWith('https://gitlab.com/')) {
    return NextResponse.json({ error: 'Only GitHub/GitLab URLs supported' }, { status: 400 })
  }

  const repoPath = path.join(REPOS_DIR, name)

  try {
    await fs.mkdir(REPOS_DIR, { recursive: true })

    // Remove if already exists
    try { await fs.rm(repoPath, { recursive: true }) } catch { /* ok */ }

    // Clone (shallow, no history needed)
    await execAsync(
      `git clone --depth 1 "${url}" "${repoPath}"`,
      { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    )

    // Return file tree
    const { stdout } = await execAsync(
      `find "${repoPath}" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" | sort | head -200`,
      { maxBuffer: 1024 * 1024 }
    )
    const files = stdout.trim().split('\n').filter(Boolean).map(f =>
      f.replace(repoPath + '/', '')
    )

    return NextResponse.json({ success: true, name, files })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Clone failed: ${msg}` }, { status: 500 })
  }
}

// DELETE /api/git  { name: 'myrepo' }
export async function DELETE(req: NextRequest) {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const repoPath = path.join(REPOS_DIR, name)
  try {
    await fs.rm(repoPath, { recursive: true })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
  }
}
