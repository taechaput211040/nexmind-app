import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getWorkspace } from '@/lib/db'

export const runtime = 'nodejs'

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache',
  '__pycache__', '.venv', 'venv', '.DS_Store', 'coverage', '.turbo'])

function buildTree(absPath: string, prefix = '', depth = 0, maxDepth = 3): string {
  if (depth >= maxDepth) return ''
  try {
    const entries = fs.readdirSync(absPath, { withFileTypes: true })
    const filtered = entries
      .filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, 25)

    return filtered.map((e, i) => {
      const isLast = i === filtered.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPfx  = prefix + (isLast ? '    ' : '│   ')
      const suffix = e.isDirectory() ? '/' : ''
      const line = `${prefix}${connector}${e.name}${suffix}`
      if (e.isDirectory()) {
        const children = buildTree(path.join(absPath, e.name), childPfx, depth + 1, maxDepth)
        return children ? `${line}\n${children}` : line
      }
      return line
    }).join('\n')
  } catch {
    return ''
  }
}

function readFileSafe(filePath: string, maxLines = 50): string {
  try {
    if (!fs.existsSync(filePath)) return ''
    const lines = fs.readFileSync(filePath, 'utf8').split('\n')
    const kept = lines.slice(0, maxLines)
    return kept.join('\n') + (lines.length > maxLines ? '\n...(truncated)' : '')
  } catch {
    return ''
  }
}

// GET /api/workspace/context?id=xxx
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const ws = getWorkspace(id)
    if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const sections: string[] = []

    sections.push(`## ACTIVE WORKSPACE: ${ws.name}`)
    sections.push(`Path: ${ws.path}`)
    if (ws.git_url) sections.push(`Git: ${ws.git_url}`)
    if (ws.branch)  sections.push(`Branch: ${ws.branch}`)

    // ARIA Memory (highest priority)
    const memPath = path.join(ws.path, 'ARIA_MEMORY.md')
    if (fs.existsSync(memPath)) {
      const mem = readFileSafe(memPath, 80)
      if (mem.trim()) sections.push(`\n### ARIA MEMORY (past sessions)\n${mem}`)
    }

    // package.json
    const pkgPath = path.join(ws.path, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
        const info: string[] = []
        if (pkg.name)            info.push(`name: ${pkg.name}`)
        if (pkg.version)         info.push(`version: ${pkg.version}`)
        if (pkg.description)     info.push(`description: ${pkg.description}`)
        if (pkg.scripts)         info.push(`scripts: ${Object.keys(pkg.scripts as object).join(', ')}`)
        if (pkg.dependencies)    info.push(`dependencies: ${Object.keys(pkg.dependencies as object).join(', ')}`)
        if (pkg.devDependencies) info.push(`devDependencies: ${Object.keys(pkg.devDependencies as object).join(', ')}`)
        sections.push(`\n### package.json\n${info.join('\n')}`)
      } catch { /* ignore */ }
    }

    // pyproject.toml or requirements.txt
    const pyproject = path.join(ws.path, 'pyproject.toml')
    const requirements = path.join(ws.path, 'requirements.txt')
    if (fs.existsSync(pyproject)) {
      sections.push(`\n### pyproject.toml (first 20 lines)\n${readFileSafe(pyproject, 20)}`)
    } else if (fs.existsSync(requirements)) {
      sections.push(`\n### requirements.txt\n${readFileSafe(requirements, 20)}`)
    }

    // Cargo.toml (Rust)
    const cargoToml = path.join(ws.path, 'Cargo.toml')
    if (fs.existsSync(cargoToml)) {
      sections.push(`\n### Cargo.toml (first 20 lines)\n${readFileSafe(cargoToml, 20)}`)
    }

    // go.mod
    const goMod = path.join(ws.path, 'go.mod')
    if (fs.existsSync(goMod)) {
      sections.push(`\n### go.mod\n${readFileSafe(goMod, 10)}`)
    }

    // README
    const readmePaths = ['README.md', 'README.txt', 'README', 'readme.md']
    const readmePath = readmePaths.map(f => path.join(ws.path, f)).find(p => fs.existsSync(p))
    if (readmePath) {
      sections.push(`\n### README (first 40 lines)\n${readFileSafe(readmePath, 40)}`)
    }

    // Graphify knowledge graph — replaces raw file tree when available
    const graphReportPath = path.join(ws.path, 'graphify-out', 'GRAPH_REPORT.md')
    const hasGraph = fs.existsSync(graphReportPath)

    if (hasGraph) {
      try {
        const raw = fs.readFileSync(graphReportPath, 'utf8')
        // Inject key sections only — skip the full community node dump to save tokens
        const lines = raw.split('\n')
        const kept: string[] = []
        let inCommunities = false
        let communityCount = 0
        for (const line of lines) {
          if (line.startsWith('## Communities')) { inCommunities = true }
          if (inCommunities) {
            if (line.startsWith('### Community')) {
              communityCount++
              if (communityCount > 6) continue
            }
            if (communityCount > 6 && line.trim() && !line.startsWith('###')) continue
          }
          kept.push(line)
        }
        sections.push(`\n### Knowledge Graph (Graphify)\n${kept.join('\n')}`)
        sections.push('\n> TIP: graph is pre-indexed — use god nodes as entry points, no need to read every file.')
      } catch {
        const tree = buildTree(ws.path, '', 0, 3)
        if (tree) sections.push(`\n### File Structure\n${tree}`)
      }
    } else {
      const tree = buildTree(ws.path, '', 0, 3)
      if (tree) sections.push(`\n### File Structure\n${tree}`)
      sections.push('\n> TIP: Click ⬡ GRAPH in the toolbar to build a knowledge graph for smarter context (free after first run).')
    }

    const contextString = sections.join('\n')
    return NextResponse.json({ contextString, workspaceName: ws.name, workspacePath: ws.path, hasGraph })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
