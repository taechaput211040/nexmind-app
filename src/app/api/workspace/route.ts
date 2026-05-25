import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getWorkspaces, addWorkspace, removeWorkspace, touchWorkspace, type Workspace } from '@/lib/db'

export const runtime = 'nodejs'

const WORKSPACES_DIR = path.resolve(process.cwd(), '..', 'workspaces')

// Ensure workspaces directory exists
if (!fs.existsSync(WORKSPACES_DIR)) fs.mkdirSync(WORKSPACES_DIR, { recursive: true })

// GET /api/workspace — list all workspaces
export async function GET() {
  try {
    const workspaces = getWorkspaces()
    return NextResponse.json({ workspaces, workspacesDir: WORKSPACES_DIR })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/workspace — register an existing local path as workspace
// Body: { name, path, gitUrl? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: string; path?: string; gitUrl?: string }
    const { name, path: wsPath, gitUrl } = body

    if (!name || !wsPath) {
      return NextResponse.json({ error: 'name and path are required' }, { status: 400 })
    }

    const absPath = path.isAbsolute(wsPath) ? wsPath : path.join(WORKSPACES_DIR, wsPath)

    if (!fs.existsSync(absPath)) {
      return NextResponse.json({ error: `Path does not exist: ${absPath}` }, { status: 400 })
    }

    const workspace: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      path: absPath,
      git_url: gitUrl,
      branch: 'main',
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
    }

    addWorkspace(workspace)
    return NextResponse.json({ workspace })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH /api/workspace?id=xxx — update last_used (touch)
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    touchWorkspace(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/workspace?id=xxx — remove workspace from registry (does NOT delete files)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    removeWorkspace(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
