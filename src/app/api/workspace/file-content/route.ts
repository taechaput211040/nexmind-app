import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

const MAX_SIZE = 512 * 1024  // 512 KB
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.mp4', '.mp3', '.wav', '.mov', '.avi',
])

const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
  '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
  '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.cs': 'csharp',
  '.css': 'css', '.scss': 'scss', '.sass': 'scss', '.less': 'css',
  '.html': 'html', '.htm': 'html', '.vue': 'vue', '.svelte': 'svelte',
  '.json': 'json', '.jsonc': 'json',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.toml': 'toml', '.ini': 'ini', '.cfg': 'ini',
  '.md': 'markdown', '.mdx': 'markdown',
  '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash', '.fish': 'bash',
  '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
  '.xml': 'xml', '.svg': 'xml',
  '.dockerfile': 'dockerfile', '.env': 'dotenv',
  '.tf': 'hcl', '.hcl': 'hcl',
  '.kt': 'kotlin', '.swift': 'swift', '.rb': 'ruby',
  '.php': 'php', '.lua': 'lua', '.r': 'r',
}

// GET /api/workspace/file-content?id=xxx&filePath=src/app/page.tsx
export async function GET(req: NextRequest) {
  try {
    const id       = req.nextUrl.searchParams.get('id')
    const filePath = req.nextUrl.searchParams.get('filePath')

    if (!id || !filePath) {
      return NextResponse.json({ error: 'id and filePath are required' }, { status: 400 })
    }

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    // Security: resolve and ensure file is inside workspace
    const absPath    = path.resolve(ws.path, filePath)
    const wsResolved = path.resolve(ws.path)
    if (!absPath.startsWith(wsResolved + path.sep) && absPath !== wsResolved) {
      return NextResponse.json({ error: 'Access denied — path outside workspace' }, { status: 403 })
    }

    if (!fs.existsSync(absPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stat = fs.statSync(absPath)
    if (stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is a directory' }, { status: 400 })
    }

    const ext = path.extname(filePath).toLowerCase()

    if (BINARY_EXT.has(ext)) {
      return NextResponse.json({ error: 'Binary file — cannot display', binary: true })
    }

    if (stat.size > MAX_SIZE) {
      return NextResponse.json({
        error: `File too large (${Math.round(stat.size / 1024)}KB — max 512KB)`,
        tooLarge: true,
        size: stat.size,
      })
    }

    const content  = fs.readFileSync(absPath, 'utf8')
    const language = LANG_MAP[ext] ?? (path.basename(filePath).toLowerCase() === 'dockerfile' ? 'dockerfile' : 'text')
    const lines    = content.split('\n').length

    return NextResponse.json({ content, language, lines, size: stat.size })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
