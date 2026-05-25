import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache', '__pycache__', '.venv', 'venv'])

interface FileNode {
  name: string
  path: string   // relative to workspace root
  type: 'file' | 'dir'
  size?: number
  children?: FileNode[]
}

function readDir(absPath: string, relPath: string, depth: number): FileNode[] {
  if (depth <= 0) return []
  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true })
    return entries
      .filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        // Dirs first, then files, alphabetically
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map(e => {
        const childAbs = path.join(absPath, e.name)
        const childRel = relPath ? `${relPath}/${e.name}` : e.name
        if (e.isDirectory()) {
          return {
            name: e.name,
            path: childRel,
            type: 'dir' as const,
            children: readDir(childAbs, childRel, depth - 1),
          }
        }
        const stat = fs.statSync(childAbs)
        return {
          name: e.name,
          path: childRel,
          type: 'file' as const,
          size: stat.size,
        }
      })
  } catch {
    return []
  }
}

// GET /api/workspace/files?id=xxx&depth=2&sub=src/components
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const sub = req.nextUrl.searchParams.get('sub') ?? ''
    const depth = Math.min(parseInt(req.nextUrl.searchParams.get('depth') ?? '2', 10), 4)

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const basePath = sub ? path.join(ws.path, sub) : ws.path

    if (!fs.existsSync(basePath)) {
      return NextResponse.json({ error: `Path not found: ${sub}` }, { status: 404 })
    }

    const tree = readDir(basePath, sub, depth)
    return NextResponse.json({ tree, rootPath: ws.path, sub })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
