import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'

const IS_WIN = process.platform === 'win32'
const DEFAULT_START = process.env.USERPROFILE ?? process.env.HOME ?? (IS_WIN ? 'C:\\Users' : '/home')

// Drives to show at the top level on Windows
const WIN_DRIVES = ['C:\\', 'D:\\', 'E:\\', 'F:\\']

interface BrowseEntry {
  name: string
  path: string
  type: 'dir' | 'drive'
}

interface BrowseResult {
  path: string
  parent: string | null
  entries: BrowseEntry[]
  isRoot: boolean
}

function listDrives(): BrowseEntry[] {
  return WIN_DRIVES.filter(d => {
    try { fs.readdirSync(d); return true } catch { return false }
  }).map(d => ({ name: d, path: d, type: 'drive' as const }))
}

export async function GET(req: NextRequest): Promise<NextResponse<BrowseResult | { error: string }>> {
  try {
    const raw = req.nextUrl.searchParams.get('path')

    // Windows root: show drives
    if (!raw || raw === '/') {
      if (IS_WIN) {
        return NextResponse.json({ path: '/', parent: null, entries: listDrives(), isRoot: true })
      }
    }

    const absPath = path.resolve(raw ?? DEFAULT_START)

    if (!fs.existsSync(absPath)) {
      return NextResponse.json({ error: `Path not found: ${absPath}` }, { status: 404 })
    }

    const stat = fs.statSync(absPath)
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
    }

    const SKIP = new Set(['.git', 'node_modules', '$Recycle.Bin', 'System Volume Information', 'Windows', 'AppData'])

    const entries: BrowseEntry[] = fs.readdirSync(absPath, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map(e => ({
        name: e.name,
        path: path.join(absPath, e.name),
        type: 'dir' as const,
      }))

    // Parent: go up, or to drive list on Windows
    const parentPath = path.dirname(absPath)
    let parent: string | null = null
    if (parentPath !== absPath) {
      // If we're at a drive root (C:\) on Windows, parent = drive list
      parent = IS_WIN && /^[A-Z]:\\?$/.test(absPath) ? '/' : parentPath
    }

    return NextResponse.json({ path: absPath, parent, entries, isRoot: false })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
