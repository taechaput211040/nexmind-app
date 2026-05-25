'use client'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { agents, getAgentModelTier, MODEL_TIER_COLOR } from '@/data/agents'
import AgentChat from '@/components/AgentChat'

type Tab = 'cc' | 'dm'
type Msg = {
  id: string
  role: 'taec' | 'agent'
  agentId?: string
  content: string
  ts: string
}

// ── Workspace + File types ─────────────────────────────────────────────────────
interface Workspace {
  id: string
  name: string
  path: string
  git_url?: string
  branch?: string
  created_at: string
  last_used: string
}

interface GitInfo {
  branch: string
  dirty: boolean
  changedFiles: number
  ahead: number
  behind: number
  commits: { hash: string; message: string }[]
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  children?: FileNode[]
}

interface FileContent {
  content: string
  language: string
  lines: number
  size: number
}



// ── Browse types ───────────────────────────────────────────────────────────────
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

// ── Diff types ─────────────────────────────────────────────────────────────────
interface FileStat {
  path: string
  added: number
  removed: number
}

interface DiffResult {
  isGit: boolean
  isClean: boolean
  files: FileStat[]
  untracked: string[]
  fileDiffs: Record<string, string>   // path → raw unified diff chunk
  summary: string
}

// ── Workspace API helpers ──────────────────────────────────────────────────────
async function fetchWorkspaces(): Promise<Workspace[]> {
  try {
    const r = await fetch('/api/workspace')
    if (!r.ok) return []
    const d = await r.json() as { workspaces: Workspace[] }
    return d.workspaces ?? []
  } catch { return [] }
}

async function fetchWorkspaceContext(id: string): Promise<{ contextString: string; hasGraph: boolean } | null> {
  try {
    const r = await fetch(`/api/workspace/context?id=${id}`)
    if (!r.ok) return null
    const d = await r.json() as { contextString: string; hasGraph?: boolean }
    return { contextString: d.contextString ?? '', hasGraph: d.hasGraph ?? false }
  } catch { return null }
}

async function runGraphify(id: string): Promise<{ ok: boolean; output: string; summary: string }> {
  try {
    const r = await fetch('/api/workspace/graphify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return await r.json() as { ok: boolean; output: string; summary: string }
  } catch (e: unknown) { return { ok: false, output: String(e), summary: '' } }
}

async function registerWorkspace(name: string, wsPath: string): Promise<Workspace | null> {
  try {
    const r = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path: wsPath }),
    })
    const d = await r.json() as { workspace?: Workspace; error?: string }
    if (!r.ok) throw new Error(d.error ?? 'Failed')
    return d.workspace ?? null
  } catch { return null }
}

async function removeWorkspace(id: string) {
  try { await fetch(`/api/workspace?id=${id}`, { method: 'DELETE' }) } catch {}
}

async function touchWorkspace(id: string) {
  try { await fetch(`/api/workspace?id=${id}`, { method: 'PATCH' }) } catch {}
}

async function fetchGitInfo(id: string): Promise<GitInfo | null> {
  try {
    const r = await fetch(`/api/workspace/git?id=${id}`)
    if (!r.ok) return null
    return await r.json() as GitInfo
  } catch { return null }
}

// ── DM API helpers ─────────────────────────────────────────────────────────────
async function fetchDMHistory(agentId: string): Promise<Msg[]> {
  try {
    const r = await fetch(`/api/history/dm?agentId=${agentId}&limit=100`)
    if (!r.ok) return []
    const data = await r.json() as { messages: Array<{ id: string; agent_id: string; role: string; content: string; ts: string }> }
    return (data.messages ?? []).map(m => ({
      id: m.id, role: m.role as 'taec' | 'agent',
      agentId: m.agent_id, content: m.content, ts: m.ts,
    }))
  } catch { return [] }
}

async function persistDMMessage(msg: Msg, agentId: string) {
  try {
    await fetch('/api/history/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { id: msg.id, agent_id: agentId, role: msg.role, content: msg.content, ts: msg.ts },
      }),
    })
  } catch { /* non-critical */ }
}

async function clearDMHistoryAPI(agentId: string) {
  try { await fetch(`/api/history/dm?agentId=${agentId}`, { method: 'DELETE' }) } catch {}
}

// ── FileExplorer ───────────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, string> = {
  ts:'🔷', tsx:'⚛️', js:'🟡', jsx:'⚛️', mjs:'🟡', cjs:'🟡',
  py:'🐍', rs:'🦀', go:'🐹', java:'☕', kt:'📱', swift:'🍎',
  css:'🎨', scss:'🎨', sass:'🎨', html:'🌐', vue:'💚', svelte:'🧡',
  json:'{}', yaml:'📄', yml:'📄', toml:'📄', env:'🔑',
  md:'📝', mdx:'📝', txt:'📄', sh:'💻', bash:'💻',
  sql:'🗄️', graphql:'📡', gql:'📡',
  png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', svg:'🖼️', ico:'🖼️',
  pdf:'📕', zip:'📦', gz:'📦',
  dockerfile:'🐳',
}

function getFileIcon(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return '🐳'
  if (lower === '.env' || lower.startsWith('.env.')) return '🔑'
  if (lower === 'makefile') return '⚙️'
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : ''
  return FILE_ICONS[ext] ?? '📄'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / 1024 / 1024).toFixed(1)}M`
}

function FileExplorer({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName?: string
}) {
  // dirMap: path -> children[] ('' = root)
  const [dirMap, setDirMap]       = useState<Map<string, FileNode[]>>(new Map())
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(['']))
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent]   = useState<FileContent | null>(null)
  const [loadingFile, setLoadingFile]   = useState(false)
  const [fileError, setFileError]       = useState<string | null>(null)

  // Load a directory's direct children
  async function loadDir(dirPath: string) {
    if (loadingDirs.has(dirPath)) return
    setLoadingDirs(prev => new Set([...prev, dirPath]))
    try {
      const sub = dirPath ? `&sub=${encodeURIComponent(dirPath)}` : ''
      const r = await fetch(`/api/workspace/files?id=${workspaceId}&depth=1${sub}`)
      const d = await r.json() as { tree: FileNode[] }
      setDirMap(prev => { const m = new Map(prev); m.set(dirPath, d.tree ?? []); return m })
    } catch { /* ignore */ } finally {
      setLoadingDirs(prev => { const s = new Set(prev); s.delete(dirPath); return s })
    }
  }

  // Load root on mount or workspace change
  useEffect(() => {
    setDirMap(new Map())
    setExpanded(new Set(['']))
    setSelectedFile(null)
    setFileContent(null)
    void loadDir('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  // Refs so the stable event listener always calls the latest loadDir + sees current expanded
  // Updated in a layout-effect (not during render) to satisfy React 19's ref rules
  const loadDirRef = useRef<typeof loadDir>(loadDir)
  const expandedRef = useRef(expanded)
  useLayoutEffect(() => {
    loadDirRef.current = loadDir
    expandedRef.current = expanded
  })

  // Auto-refresh when a CC pipeline finishes — reload root + all expanded dirs
  useEffect(() => {
    function onPipelineDone() {
      void loadDirRef.current('')
      for (const p of expandedRef.current) {
        if (p !== '') void loadDirRef.current(p)
      }
    }
    window.addEventListener('nexmind:pipeline-done', onPipelineDone)
    return () => window.removeEventListener('nexmind:pipeline-done', onPipelineDone)
  }, [])

  async function toggleDir(node: FileNode) {
    if (expanded.has(node.path)) {
      setExpanded(prev => { const s = new Set(prev); s.delete(node.path); return s })
    } else {
      setExpanded(prev => new Set([...prev, node.path]))
      if (!dirMap.has(node.path)) await loadDir(node.path)
    }
  }

  async function viewFile(node: FileNode) {
    setSelectedFile(node.path)
    setFileContent(null)
    setFileError(null)
    setLoadingFile(true)
    try {
      const r = await fetch(`/api/workspace/file-content?id=${workspaceId}&filePath=${encodeURIComponent(node.path)}`)
      const d = await r.json() as { content?: string; language?: string; lines?: number; size?: number; error?: string; binary?: boolean; tooLarge?: boolean }
      if (d.error) setFileError(d.error)
      else setFileContent({ content: d.content ?? '', language: d.language ?? 'text', lines: d.lines ?? 0, size: d.size ?? 0 })
    } catch { setFileError('Failed to load file') } finally {
      setLoadingFile(false)
    }
  }

  function renderNode(node: FileNode, depth: number): React.ReactNode {
    const isDir      = node.type === 'dir'
    const isExp      = expanded.has(node.path)
    const isSel      = selectedFile === node.path
    const isLoading  = loadingDirs.has(node.path)
    const children   = dirMap.get(node.path) ?? []

    return (
      <div key={node.path}>
        <button
          onClick={() => isDir ? void toggleDir(node) : void viewFile(node)}
          style={{
            width: '100%',
            padding: `3px 8px 3px ${8 + depth * 14}px`,
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSel ? 'color-mix(in srgb, var(--magic-cyan) 12%, transparent)' : 'transparent',
            border: 'none',
            borderLeft: isSel ? '2px solid var(--magic-cyan)' : '2px solid transparent',
            cursor: 'pointer', textAlign: 'left',
            transition: 'background .1s',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--cmd-label)', flexShrink: 0, width: 10, textAlign: 'center' }}>
            {isDir ? (isLoading ? '·' : isExp ? '▾' : '▸') : ''}
          </span>
          <span style={{ fontSize: 13, flexShrink: 0 }}>
            {isDir ? (isExp ? '📂' : '📁') : getFileIcon(node.name)}
          </span>
          <span style={{
            fontSize: 10, fontFamily: "'Space Mono',monospace",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            color: isSel ? 'var(--magic-cyan)' : isDir ? 'var(--cmd-text)' : 'var(--cmd-text-soft)',
            fontWeight: isDir ? 600 : 400,
          }}>{node.name}</span>
          {!isDir && node.size !== undefined && (
            <span style={{ fontSize: 9, color: 'var(--cmd-label)', flexShrink: 0, marginLeft: 2 }}>
              {formatSize(node.size)}
            </span>
          )}
        </button>

        {/* Children */}
        {isDir && isExp && (
          <div>
            {isLoading && (
              <p style={{ padding: `2px 8px 2px ${22 + depth * 14}px`, fontSize: 9, color: 'var(--cmd-label)', margin: 0, fontFamily: "'Space Mono',monospace" }}>loading…</p>
            )}
            {!isLoading && children.length === 0 && (
              <p style={{ padding: `2px 8px 2px ${22 + depth * 14}px`, fontSize: 9, color: 'var(--cmd-label)', margin: 0, fontFamily: "'Space Mono',monospace" }}>empty</p>
            )}
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootNodes = dirMap.get('') ?? []
  const isRootLoading = loadingDirs.has('')

  return (
    <>
      {/* Sidebar panel */}
      <div style={{
        width: 240, flexShrink: 0,
        borderLeft: '1px solid var(--magic-glass-border)',
        display: 'flex', flexDirection: 'column',
        background: 'color-mix(in srgb, var(--nebula-bg) 70%, transparent)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '9px 12px', borderBottom: '1px solid var(--magic-glass-border)',
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11 }}>📁</span>
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700,
            color: 'var(--magic-cyan)', letterSpacing: 1, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {(workspaceName ?? '').toUpperCase()}
          </span>
          <button
            onClick={() => { setDirMap(new Map()); void loadDir('') }}
            title="Refresh tree"
            style={{ background: 'none', border: 'none', color: 'var(--cmd-label)', cursor: 'pointer', fontSize: 12, padding: 2, lineHeight: 1 }}
          >↺</button>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {isRootLoading ? (
            <p style={{ padding: '12px 14px', fontSize: 10, color: 'var(--cmd-label)', margin: 0, fontFamily: "'Space Mono',monospace" }}>Loading…</p>
          ) : rootNodes.length === 0 ? (
            <p style={{ padding: '12px 14px', fontSize: 10, color: 'var(--cmd-label)', margin: 0, fontFamily: "'Space Mono',monospace" }}>Empty workspace</p>
          ) : (
            rootNodes.map(n => renderNode(n, 0))
          )}
        </div>
      </div>

      {/* File content viewer — fixed overlay */}
      {selectedFile && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(7,7,26,0.88)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setSelectedFile(null); setFileContent(null) }}
        >
          <div
            style={{
              width: '82%', maxWidth: 900, maxHeight: '84vh',
              background: 'var(--magic-glass)',
              border: '1px solid var(--magic-glass-border)',
              boxShadow: 'var(--magic-glow-soft)',
              backdropFilter: 'blur(var(--magic-glass-blur))',
              borderRadius: 'var(--cmd-card-radius)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* File header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--magic-glass-border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: 16 }}>{getFileIcon(selectedFile?.split('/').pop() ?? '')}</span>
              <span style={{
                fontFamily: "'Space Mono',monospace", fontSize: 11,
                color: 'var(--magic-cyan)', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{selectedFile}</span>

              {fileContent && (
                <>
                  <span style={{
                    fontSize: 9, padding: '2px 7px', borderRadius: 4,
                    background: 'color-mix(in srgb, var(--magic-purple) 14%, transparent)',
                    color: 'var(--magic-purple)', fontFamily: "'Space Mono',monospace",
                  }}>{fileContent.language}</span>
                  <span style={{ fontSize: 9, color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace", whiteSpace: 'nowrap' }}>
                    {fileContent.lines} lines · {formatSize(fileContent.size)}
                  </span>
                  <button
                    onClick={() => void navigator.clipboard.writeText(fileContent.content)}
                    style={{
                      padding: '3px 9px', borderRadius: 5,
                      border: '1px solid var(--magic-glass-border)',
                      background: 'transparent', color: 'var(--cmd-text-soft)',
                      cursor: 'pointer', fontSize: 9,
                      fontFamily: "'Space Mono',monospace", whiteSpace: 'nowrap',
                    }}
                  >📋 COPY</button>
                </>
              )}

              <button
                onClick={() => { setSelectedFile(null); setFileContent(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--cmd-label)', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
              {loadingFile && (
                <p style={{ color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>Loading…</p>
              )}
              {fileError && (
                <p style={{ color: 'var(--magic-pink)', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>❌ {fileError}</p>
              )}
              {fileContent && (
                <pre style={{
                  margin: 0, fontSize: 11, lineHeight: 1.65,
                  color: 'var(--cmd-text)', fontFamily: "'Space Mono',monospace",
                  whiteSpace: 'pre', overflowX: 'auto',
                  tabSize: 2,
                }}>{fileContent.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── DiffViewer ─────────────────────────────────────────────────────────────────
type DiffLineKind = 'add' | 'del' | 'hunk' | 'header' | 'ctx'

interface ParsedLine { kind: DiffLineKind; text: string; lineNo?: number }

function parseDiffChunk(raw: string): ParsedLine[] {
  const lines = raw.split('\n')
  const out: ParsedLine[] = []
  let addNo = 0, delNo = 0

  for (const line of lines) {
    if (line.startsWith('diff ') || line.startsWith('index ') ||
        line.startsWith('--- ') || line.startsWith('+++ ')) {
      out.push({ kind: 'header', text: line })
    } else if (line.startsWith('@@')) {
      // Parse hunk header @@ -a,b +c,d @@
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) { delNo = parseInt(m[1]); addNo = parseInt(m[2]) }
      out.push({ kind: 'hunk', text: line })
    } else if (line.startsWith('+')) {
      out.push({ kind: 'add', text: line.slice(1), lineNo: addNo++ })
    } else if (line.startsWith('-')) {
      out.push({ kind: 'del', text: line.slice(1), lineNo: delNo++ })
    } else if (line.startsWith(' ') || line === '') {
      out.push({ kind: 'ctx', text: line.slice(1), lineNo: (addNo === delNo ? addNo++ : addNo) })
      delNo++
    }
  }
  return out
}

function DiffContent({ raw }: { raw: string }) {
  const lines = parseDiffChunk(raw)

  const BG: Record<DiffLineKind, string> = {
    add:    'color-mix(in srgb, #22c55e 12%, transparent)',
    del:    'color-mix(in srgb, #f43f5e 11%, transparent)',
    hunk:   'color-mix(in srgb, #06b6d4 9%, transparent)',
    header: 'color-mix(in srgb, var(--magic-purple) 8%, transparent)',
    ctx:    'transparent',
  }
  const FG: Record<DiffLineKind, string> = {
    add:    '#4ade80',
    del:    '#fb7185',
    hunk:   '#22d3ee',
    header: 'var(--cmd-label)',
    ctx:    'var(--cmd-text-soft)',
  }
  const BORDER: Record<DiffLineKind, string> = {
    add:    '#22c55e',
    del:    '#f43f5e',
    hunk:   '#06b6d4',
    header: 'transparent',
    ctx:    'transparent',
  }
  const PREFIX: Record<DiffLineKind, string> = {
    add: '+', del: '-', hunk: '', header: '', ctx: ' ',
  }

  return (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 1.6 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'stretch',
            background: BG[l.kind],
            borderLeft: `2px solid ${BORDER[l.kind]}`,
          }}
        >
          {/* Prefix column */}
          <span style={{
            width: 18, flexShrink: 0, textAlign: 'center',
            color: FG[l.kind], opacity: 0.8, userSelect: 'none',
            padding: '0 2px',
          }}>
            {PREFIX[l.kind]}
          </span>
          {/* Line number */}
          {l.lineNo !== undefined && (
            <span style={{
              width: 38, flexShrink: 0, textAlign: 'right',
              color: 'var(--cmd-label)', paddingRight: 10,
              userSelect: 'none', borderRight: '1px solid var(--magic-glass-border)',
              marginRight: 10,
            }}>
              {l.lineNo}
            </span>
          )}
          {l.lineNo === undefined && l.kind !== 'header' && (
            <span style={{ width: 48, flexShrink: 0, borderRight: '1px solid var(--magic-glass-border)', marginRight: 10 }} />
          )}
          {/* Content */}
          <span style={{
            color: FG[l.kind],
            whiteSpace: 'pre', flex: 1, overflow: 'hidden',
            padding: '0 4px',
          }}>
            {l.text}
          </span>
        </div>
      ))}
    </div>
  )
}

function DiffViewer({
  workspaceId,
  onClose,
}: {
  workspaceId: string
  onClose?: () => void
}) {
  const [diff, setDiff]         = useState<DiffResult | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null); setDiff(null); setSelected(null)
    fetch(`/api/workspace/diff?id=${workspaceId}`)
      .then(r => r.json())
      .then((d: DiffResult) => { setDiff(d); setLoading(false) })
      .catch(() => { setError('Failed to load diff'); setLoading(false) })
  }, [workspaceId])

  const selectedRaw = selected && diff?.fileDiffs ? (diff.fileDiffs[selected] ?? '') : ''

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(7,7,26,0.90)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose ?? undefined}
    >
      <div
        style={{ width:'92%', maxWidth:1100, height:'90vh', background:'var(--magic-glass)', border:'1px solid var(--magic-glass-border)', boxShadow:'var(--magic-glow-soft)', backdropFilter:'blur(var(--magic-glass-blur))', borderRadius:'var(--cmd-card-radius)', display:'flex', flexDirection:'column', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:18 }}>📊</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, color:'var(--magic-cyan)' }}>GIT DIFF</p>
            {diff && !loading && (
              <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>
                {diff.isClean ? '✓ No changes' : `${(diff.files ?? []).length} changed · ${(diff.untracked ?? []).length} untracked`}
                {diff.summary ? ` · ${diff.summary}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose ?? undefined} style={{ background:'none', border:'none', color:'var(--cmd-label)', cursor: onClose ? 'pointer' : 'default', fontSize:18, lineHeight:1, display: onClose ? 'block' : 'none' }}>×</button>
        </div>

        {loading && <p style={{ padding:'24px 20px', color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", fontSize:11 }}>Loading diff…</p>}
        {error   && <p style={{ padding:'24px 20px', color:'var(--magic-pink)', fontFamily:"'Space Mono',monospace", fontSize:11 }}>❌ {error}</p>}

        {diff && !loading && (
          <div style={{ flex:1, display:'flex', minHeight:0 }}>

            {/* File list */}
            <div style={{ width:260, flexShrink:0, borderRight:'1px solid var(--magic-glass-border)', overflowY:'auto', padding:'8px 0' }}>
              {diff.isClean && (
                <div style={{ padding:'40px 20px', textAlign:'center' }}>
                  <p style={{ fontSize:28, marginBottom:8 }}>✅</p>
                  <p style={{ fontSize:12, color:'var(--cmd-text-soft)', fontFamily:"'Space Mono',monospace" }}>Working tree clean</p>
                  <p style={{ fontSize:10, color:'var(--cmd-label)' }}>No uncommitted changes</p>
                </div>
              )}

              {(diff.files ?? []).length > 0 && (
                <>
                  <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, padding:'6px 14px 4px', margin:0 }}>MODIFIED ({diff.files.length})</p>
                  {(diff.files ?? []).map(f => (
                    <button key={f.path} onClick={() => setSelected(f.path === selected ? null : f.path)}
                      style={{ width:'100%', padding:'7px 14px', display:'flex', alignItems:'center', gap:6, background: selected===f.path ? 'color-mix(in srgb, var(--magic-cyan) 10%, transparent)' : 'transparent', border:'none', borderLeft: selected===f.path ? '2px solid var(--magic-cyan)' : '2px solid transparent', cursor:'pointer', textAlign:'left', transition:'all .1s' }}
                    >
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: selected===f.path ? 'var(--magic-cyan)' : 'var(--cmd-text-soft)' }}>
                        {f.path?.split('/').pop() ?? f.path}
                      </span>
                      <span style={{ fontSize:9, color:'#4ade80', fontFamily:"'Space Mono',monospace", flexShrink:0 }}>+{f.added}</span>
                      <span style={{ fontSize:9, color:'#fb7185', fontFamily:"'Space Mono',monospace", flexShrink:0, marginLeft:3 }}>-{f.removed}</span>
                    </button>
                  ))}
                </>
              )}

              {(diff.untracked ?? []).length > 0 && (
                <>
                  <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, padding:'12px 14px 4px', margin:0 }}>UNTRACKED ({diff.untracked.length})</p>
                  {(diff.untracked ?? []).map(f => (
                    <div key={f} style={{ padding:'5px 14px', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:'color-mix(in srgb, var(--arcane-gold) 12%, transparent)', color:'var(--arcane-gold)', fontFamily:"'Space Mono',monospace", flexShrink:0 }}>NEW</span>
                      <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--cmd-text-soft)' }}>{f?.split('/').pop() ?? f}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Diff content */}
            <div style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
              {!selected ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:10 }}>
                  <p style={{ fontSize:28 }}>⬅️</p>
                  <p style={{ color:'var(--cmd-label)', fontSize:11, fontFamily:"'Space Mono',monospace" }}>Select a file to see its diff</p>
                </div>
              ) : !selectedRaw ? (
                <p style={{ padding:20, color:'var(--cmd-label)', fontSize:11, fontFamily:"'Space Mono',monospace" }}>No diff data for this file</p>
              ) : (
                <>
                  <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--magic-glass-border)', position:'sticky', top:0, background:'var(--magic-glass)', backdropFilter:'blur(8px)', zIndex:1 }}>
                    <span style={{ color:'var(--magic-cyan)', fontSize:11, fontFamily:"'Space Mono',monospace" }}>{selected}</span>
                  </div>
                  <DiffContent raw={selectedRaw} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FolderBrowserTab ──────────────────────────────────────────────────────────
function FolderBrowserTab({
  openPath, openName, opening, openError, inputStyle,
  onPathChange, onNameChange, onOpen,
}: {
  openPath: string
  openName: string
  opening: boolean
  openError: string
  inputStyle: React.CSSProperties
  onPathChange: (v: string) => void
  onNameChange: (v: string) => void
  onOpen: () => void
}) {
  const [browsePath, setBrowsePath] = useState<string | null>(null)
  const [entries, setEntries]       = useState<BrowseEntry[]>([])
  const [parent, setParent]         = useState<string | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)

  async function navigate(p: string | null) {
    setBrowseLoading(true)
    try {
      const url = p ? `/api/workspace/browse?path=${encodeURIComponent(p)}` : '/api/workspace/browse?path=/'
      const r = await fetch(url)
      const d = await r.json() as BrowseResult
      setBrowsePath(d.path === '/' ? null : d.path)
      setEntries(d.entries)
      setParent(d.parent ?? null)
    } catch { /* ignore */ } finally { setBrowseLoading(false) }
  }

  // Init browse on first render
  useEffect(() => { void navigate(null) }, [])

  function selectDir(p: string) {
    onPathChange(p)
    void navigate(p)
    // Auto-fill name from folder name if empty
    if (!openName) {
      const name = p.split(/[\\/]/).filter(Boolean).pop() ?? ''
      if (name) onNameChange(name)
    }
  }

  return (
    <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Folder browser */}
      <div>
        <p style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', letterSpacing: 1.5, fontWeight: 700, margin: '0 0 6px' }}>
          BROWSE — {browsePath ?? 'Root'}
        </p>
        <div style={{
          border: '1px solid var(--magic-glass-border)', borderRadius: 8,
          background: 'color-mix(in srgb, var(--nebula-bg) 60%, transparent)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {/* Up button */}
          {parent !== undefined && parent !== null && (
            <button
              onClick={() => void navigate(parent)}
              style={{ width: '100%', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', borderBottom: '1px solid var(--magic-glass-border)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 12 }}>⬆️</span>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)' }}>.. (up)</span>
            </button>
          )}
          {browseLoading && (
            <p style={{ padding: '10px 12px', fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', margin: 0 }}>Loading…</p>
          )}
          {!browseLoading && entries.length === 0 && (
            <p style={{ padding: '10px 12px', fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', margin: 0 }}>No folders</p>
          )}
          {!browseLoading && entries.map(e => {
            const isSel = openPath === e.path
            return (
              <button key={e.path}
                onClick={() => selectDir(e.path)}
                style={{
                  width: '100%', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7,
                  background: isSel ? 'color-mix(in srgb, var(--magic-cyan) 10%, transparent)' : 'transparent',
                  border: 'none', borderLeft: isSel ? '2px solid var(--magic-cyan)' : '2px solid transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .1s',
                }}
              >
                <span style={{ fontSize: 12 }}>{e.type === 'drive' ? '💿' : '📁'}</span>
                <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: isSel ? 'var(--magic-cyan)' : 'var(--cmd-text-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                {e.type === 'dir' && <span style={{ fontSize: 9, color: 'var(--cmd-label)' }}>▸</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Manual path + name inputs */}
      <div>
        <label style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', letterSpacing: 1 }}>SELECTED PATH</label>
        <input
          value={openPath}
          onChange={e => onPathChange(e.target.value)}
          placeholder="C:\Users\you\my-project"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', letterSpacing: 1 }}>WORKSPACE NAME</label>
        <input
          value={openName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="my-project"
          style={inputStyle}
        />
      </div>

      {openError && <p style={{ margin: 0, fontSize: 11, color: 'var(--magic-pink)', fontFamily: "'Space Mono',monospace" }}>❌ {openError}</p>}

      <button
        onClick={onOpen}
        disabled={opening || !openPath.trim() || !openName.trim()}
        style={{
          padding: '10px 16px', borderRadius: 8, border: 'none', cursor: opening || !openPath.trim() || !openName.trim() ? 'not-allowed' : 'pointer',
          background: opening || !openPath.trim() || !openName.trim() ? 'var(--magic-glass)' : 'linear-gradient(135deg, var(--magic-cyan), var(--magic-purple))',
          color: opening || !openPath.trim() || !openName.trim() ? 'var(--cmd-label)' : '#fff',
          fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono',monospace", letterSpacing: 1,
          transition: 'all .15s',
        }}
      >
        {opening ? '⏳ OPENING…' : '📂 OPEN WORKSPACE'}
      </button>
    </div>
  )
}

// ── WorkspaceModal ─────────────────────────────────────────────────────────────
function WorkspaceModal({
  onClose,
  onSelect,
  activeId,
}: {
  onClose: () => void
  onSelect: (ws: Workspace) => void
  activeId: string | null
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [tab, setTab] = useState<'list' | 'clone' | 'open'>('list')
  const [loading, setLoading] = useState(true)
  const [cloneUrl, setCloneUrl]   = useState('')
  const [cloneName, setCloneName] = useState('')
  const [cloning, setCloning]     = useState(false)
  const [cloneLog, setCloneLog]   = useState<string[]>([])
  const [openPath, setOpenPath]   = useState('')
  const [openName, setOpenName]   = useState('')
  const [openError, setOpenError] = useState('')
  const [opening, setOpening]     = useState(false)
  const [gitInfo, setGitInfo]     = useState<Record<string, GitInfo>>({})

  useEffect(() => {
    fetchWorkspaces().then(ws => {
      setWorkspaces(ws)
      setLoading(false)
      ws.forEach(w => {
        fetchGitInfo(w.id).then(info => {
          if (info) setGitInfo(prev => ({ ...prev, [w.id]: info }))
        })
      })
    })
  }, [])

  async function doClone() {
    if (!cloneUrl.trim()) return
    setCloning(true); setCloneLog([])
    try {
      const res = await fetch('/api/workspace/clone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cloneUrl.trim(), name: cloneName.trim() || undefined }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const ev = JSON.parse(data) as { type: string; text?: string; workspace?: Workspace; error?: string }
            if (ev.type === 'progress' && ev.text) setCloneLog(p => [...p, ev.text!])
            if (ev.type === 'done' && ev.workspace) {
              setWorkspaces(p => [ev.workspace!, ...p])
              onSelect(ev.workspace!)
              setCloneLog(p => [...p, '✅ Clone complete!'])
            }
            if (ev.type === 'error' && ev.error) setCloneLog(p => [...p, `❌ ${ev.error}`])
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      setCloneLog(p => [...p, `❌ ${err instanceof Error ? err.message : String(err)}`])
    } finally { setCloning(false) }
  }

  async function doOpen() {
    if (!openPath.trim() || !openName.trim()) { setOpenError('Path and name are required'); return }
    setOpening(true); setOpenError('')
    const ws = await registerWorkspace(openName.trim(), openPath.trim())
    if (ws) { setWorkspaces(p => [ws, ...p]); onSelect(ws) }
    else setOpenError('Failed — check that the path exists on this machine')
    setOpening(false)
  }

  async function doRemove(id: string) {
    await removeWorkspace(id)
    setWorkspaces(p => p.filter(w => w.id !== id))
  }

  const panel: React.CSSProperties = {
    width: 680, maxHeight: '86vh',
    background: 'var(--magic-glass)',
    border: '1px solid var(--magic-glass-border)',
    boxShadow: 'var(--magic-glow-soft)',
    backdropFilter: 'blur(var(--magic-glass-blur))',
    borderRadius: 'var(--cmd-card-radius)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8,
    background: 'color-mix(in srgb, var(--cmd-text) 4%, transparent)',
    border: '1px solid var(--magic-glass-border)',
    color: 'var(--cmd-text)', fontSize: 12, outline: 'none',
    fontFamily: "'Space Mono',monospace", boxSizing: 'border-box',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(7,7,26,0.85)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🗂️</span>
          <div>
            <p style={{ margin:0, fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, color:'var(--magic-cyan)' }}>WORKSPACES</p>
            <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)' }}>Select a project for agents to work in</p>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--cmd-label)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex', gap:0, padding:'10px 16px 0', borderBottom:'1px solid var(--magic-glass-border)' }}>
          {(['list','clone','open'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'6px 14px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer',
              background: tab===t ? 'color-mix(in srgb, var(--magic-cyan) 12%, transparent)' : 'transparent',
              borderBottom: tab===t ? '2px solid var(--magic-cyan)' : '2px solid transparent',
              color: tab===t ? 'var(--magic-cyan)' : 'var(--cmd-label)',
              fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:1,
            }}>
              {t==='list' ? '📋 MY WORKSPACES' : t==='clone' ? '⬇️ GIT CLONE' : '📂 OPEN LOCAL'}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* LIST */}
          {tab==='list' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {loading && <p style={{ color:'var(--cmd-label)', fontSize:12, fontFamily:"'Space Mono',monospace" }}>Loading…</p>}
              {!loading && workspaces.length===0 && (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <p style={{ fontSize:32, marginBottom:10 }}>🗂️</p>
                  <p style={{ color:'var(--cmd-text-soft)', fontSize:13 }}>No workspaces yet</p>
                  <p style={{ color:'var(--cmd-label)', fontSize:11 }}>Clone a repo or open a local folder to get started</p>
                </div>
              )}
              {workspaces.map(ws => {
                const isActive = ws.id === activeId
                const gi = gitInfo[ws.id]
                return (
                  <div key={ws.id} onClick={() => { void touchWorkspace(ws.id); onSelect(ws) }} style={{
                    padding:'12px 14px', borderRadius:10, cursor:'pointer',
                    background: isActive ? 'color-mix(in srgb, var(--magic-cyan) 8%, transparent)' : 'color-mix(in srgb, var(--cmd-text) 4%, transparent)',
                    border: isActive ? '1px solid color-mix(in srgb, var(--magic-cyan) 30%, transparent)' : '1px solid var(--magic-glass-border)',
                    transition:'all .15s',
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:22, flexShrink:0, marginTop:2 }}>{ws.git_url ? '🔗' : '📁'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:12, color: isActive ? 'var(--magic-cyan)' : 'var(--cmd-text)' }}>{ws.name}</span>
                          {isActive && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:'color-mix(in srgb, var(--magic-cyan) 16%, transparent)', color:'var(--magic-cyan)', fontFamily:"'Space Mono',monospace" }}>ACTIVE</span>}
                          {gi?.dirty && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:'color-mix(in srgb, var(--arcane-gold) 14%, transparent)', color:'var(--arcane-gold)', fontFamily:"'Space Mono',monospace" }}>DIRTY({gi.changedFiles})</span>}
                          {gi && gi.ahead>0 && <span style={{ fontSize:9, color:'var(--arcane-emerald)', fontFamily:"'Space Mono',monospace" }}>↑{gi.ahead}</span>}
                          {gi && gi.behind>0 && <span style={{ fontSize:9, color:'var(--magic-pink)', fontFamily:"'Space Mono',monospace" }}>↓{gi.behind}</span>}
                        </div>
                        <p style={{ fontSize:10, color:'var(--cmd-label)', margin:'0 0 4px', fontFamily:"'Space Mono',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ws.path}</p>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          {gi?.branch && <span style={{ fontSize:10, color:'var(--magic-purple)', fontFamily:"'Space Mono',monospace" }}>⎇ {gi.branch}</span>}
                          {ws.git_url && <span style={{ fontSize:10, color:'var(--cmd-label)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:260 }}>{ws.git_url}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); void doRemove(ws.id) }} style={{ padding:'3px 8px', borderRadius:6, border:'1px solid var(--magic-glass-border)', background:'transparent', color:'var(--cmd-label)', cursor:'pointer', fontSize:10, fontFamily:"'Space Mono',monospace", flexShrink:0 }}>✕</button>
                    </div>
                    {gi?.commits && gi.commits.length>0 && (
                      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--magic-glass-border)' }}>
                        {gi.commits.slice(0,3).map(c => (
                          <p key={c.hash} style={{ margin:0, fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>
                            <span style={{ color:'var(--magic-purple)', marginRight:6 }}>{c.hash.slice(0,7)}</span>{c.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* CLONE */}
          {tab==='clone' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1 }}>GIT URL</label>
                <input value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} placeholder="https://github.com/user/repo.git" disabled={cloning} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1 }}>FOLDER NAME (optional)</label>
                <input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="auto-derived from URL" disabled={cloning} style={inputStyle} />
              </div>
              <button onClick={() => void doClone()} disabled={!cloneUrl.trim() || cloning} style={{
                padding:'10px 20px', borderRadius:8, border:'none',
                cursor: cloneUrl.trim() && !cloning ? 'pointer' : 'not-allowed',
                background: cloneUrl.trim() && !cloning ? 'linear-gradient(135deg, var(--magic-cyan), var(--magic-purple))' : 'var(--magic-glass)',
                color: cloneUrl.trim() && !cloning ? '#fff' : 'var(--cmd-label)',
                fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:11, letterSpacing:1,
              }}>{cloning ? '⏳ CLONING…' : '⬇️ CLONE REPO'}</button>
              {cloneLog.length>0 && (
                <div style={{ padding:'10px 12px', borderRadius:8, background:'color-mix(in srgb, var(--nebula-bg) 80%, transparent)', border:'1px solid var(--magic-glass-border)', maxHeight:180, overflowY:'auto' }}>
                  {cloneLog.map((line, i) => (
                    <p key={i} style={{ margin:0, fontSize:10, fontFamily:"'Space Mono',monospace", whiteSpace:'pre-wrap', lineHeight:1.6, color: line.startsWith('❌') ? 'var(--magic-pink)' : line.startsWith('✅') ? 'var(--arcane-emerald)' : 'var(--cmd-text-soft)' }}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OPEN LOCAL */}
          {tab==='open' && (
            <FolderBrowserTab
              openPath={openPath}
              openName={openName}
              opening={opening}
              openError={openError}
              inputStyle={inputStyle}
              onPathChange={setOpenPath}
              onNameChange={setOpenName}
              onOpen={doOpen}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── TerminalPanel ──────────────────────────────────────────────────────────────
interface TermLine {
  id: string
  type: 'stdin' | 'stdout' | 'stderr' | 'exit' | 'error' | 'info'
  text: string
}

function TerminalPanel({
  workspacePath,
  onClose,
}: {
  workspacePath: string | null
  onClose: () => void
}) {
  const [lines, setLines]           = useState<TermLine[]>([])
  const [input, setInput]           = useState('')
  const [running, setRunning]       = useState(false)
  const [cmdHistory, setCmdHistory] = useState<string[]>([])
  const [histIdx, setHistIdx]       = useState(-1)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [lines])

  // Show cwd banner on mount / workspace change
  useEffect(() => {
    const cwd = workspacePath ?? '(app directory)'
    setLines([{ id: 'init', type: 'info', text: '⌨  NEXMIND Terminal  •  ' + cwd }])
  }, [workspacePath])

  async function runCommand(cmd: string) {
    const trimmed = cmd.trim()
    if (!trimmed || running) return

    setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)])
    setHistIdx(-1)
    setLines(prev => [...prev, { id: `cmd-${Date.now()}`, type: 'stdin', text: `$ ${trimmed}` }])
    setInput('')
    setRunning(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, cwd: workspacePath }),
        signal: abort.signal,
      })

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n'); buf = parts.pop() ?? ''
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const ev = JSON.parse(data) as { type: string; text?: string; code?: number }
            if (ev.type === 'stdout' && ev.text)
              setLines(prev => [...prev, { id: `o-${Date.now()}-${Math.random()}`, type: 'stdout', text: ev.text! }])
            else if (ev.type === 'stderr' && ev.text)
              setLines(prev => [...prev, { id: `e-${Date.now()}-${Math.random()}`, type: 'stderr', text: ev.text! }])
            else if (ev.type === 'exit')
              setLines(prev => [...prev, { id: `x-${Date.now()}`, type: 'exit', text: `exit ${ev.code ?? 0}` }])
            else if (ev.type === 'error' && ev.text)
              setLines(prev => [...prev, { id: `err-${Date.now()}`, type: 'error', text: ev.text! }])
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError')
        setLines(prev => [...prev, { id: `err-${Date.now()}`, type: 'error', text: String(err) }])
    } finally {
      setRunning(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void runCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, cmdHistory.length - 1)
      setHistIdx(next)
      if (cmdHistory[next]) setInput(cmdHistory[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setInput(next === -1 ? '' : cmdHistory[next])
    } else if (e.key === 'c' && e.ctrlKey) {
      abortRef.current?.abort()
      setRunning(false)
      setLines(prev => [...prev, { id: `int-${Date.now()}`, type: 'info', text: '^C' }])
    }
  }

  const TERM_COLOR: Record<TermLine['type'], string> = {
    stdin:  'var(--magic-cyan)',
    stdout: 'var(--cmd-text-soft)',
    stderr: 'var(--magic-pink)',
    exit:   'var(--cmd-label)',
    error:  'var(--magic-pink)',
    info:   'var(--arcane-emerald)',
  }

  // Compute project name outside JSX to avoid template-literal / backslash parse issues
  const termProjName = workspacePath
    ? (workspacePath.lastIndexOf('\\') >= 0
        ? workspacePath.slice(workspacePath.lastIndexOf('\\') + 1)
        : workspacePath.slice(workspacePath.lastIndexOf('/') + 1)
      ).toUpperCase()
    : ''

  return (
    <div style={{
      borderTop: '1px solid var(--magic-glass-border)',
      background: 'color-mix(in srgb, var(--nebula-bg) 85%, transparent)',
      backdropFilter: 'blur(var(--magic-glass-blur))',
      display: 'flex', flexDirection: 'column', height: 250,
    }}>
      {/* Header */}
      <div style={{
        padding: '5px 14px', borderBottom: '1px solid var(--magic-glass-border)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 12 }}>⌨</span>
        <span style={{
          fontSize: 9, fontFamily: "'Space Mono',monospace", fontWeight: 700,
          color: 'var(--magic-cyan)', letterSpacing: 1.5, flex: 1,
        }}>
          TERMINAL {termProjName ? '— ' + termProjName : ''}
        </span>
        {running && (
          <span style={{
            fontSize: 9, color: 'var(--arcane-gold)', fontFamily: "'Space Mono',monospace",
            animation: 'glow-pulse 1.2s ease-in-out infinite',
          }}>● running</span>
        )}
        <button
          onClick={() => setLines([{ id: 'cleared', type: 'info', text: `⌨  cleared  •  ${workspacePath ?? ''}` }])}
          style={{ background: 'none', border: 'none', color: 'var(--cmd-label)', cursor: 'pointer', fontSize: 10, padding: '1px 6px', borderRadius: 4, fontFamily: "'Space Mono',monospace" }}
          title="Clear output"
        >clear</button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--cmd-label)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Output */}
      <div ref={outputRef} style={{
        flex: 1, overflowY: 'auto', padding: '8px 14px',
        fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 1.65,
      }}>
        {lines.map(l => (
          <pre key={l.id} style={{
            margin: 0, color: TERM_COLOR[l.type],
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>{l.text}</pre>
        ))}
        {running && (
          <span style={{ color: 'var(--arcane-gold)', fontSize: 13, animation: 'glow-pulse 1s ease-in-out infinite' }}>▋</span>
        )}
      </div>

      {/* Command input */}
      <div style={{
        padding: '5px 14px', borderTop: '1px solid var(--magic-glass-border)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        background: 'color-mix(in srgb, var(--nebula-bg) 95%, transparent)',
      }}>
        <span style={{ color: 'var(--magic-cyan)', fontFamily: "'Space Mono',monospace", fontSize: 12, flexShrink: 0 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
          placeholder={running ? 'running… (Ctrl+C to stop)' : 'type a command… (↑↓ history)'}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--cmd-text)', fontFamily: "'Space Mono',monospace", fontSize: 11,
            caretColor: 'var(--magic-cyan)',
          }}
        />
        <button
          onClick={() => void runCommand(input)}
          disabled={running || !input.trim()}
          style={{
            padding: '3px 10px', borderRadius: 5, flexShrink: 0,
            border: '1px solid color-mix(in srgb, var(--magic-cyan) 30%, transparent)',
            background: running || !input.trim() ? 'transparent' : 'color-mix(in srgb, var(--magic-cyan) 10%, transparent)',
            color: running || !input.trim() ? 'var(--cmd-label)' : 'var(--magic-cyan)',
            cursor: running || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 9, fontFamily: "'Space Mono',monospace", fontWeight: 700, letterSpacing: 1,
            transition: 'all .15s',
          }}
        >RUN</button>
      </div>
    </div>
  )
}

// ── DocReader ──────────────────────────────────────────────────────────────────
interface DocMeta { name: string; size: number; ext: string; rows?: number; pages?: number; sheets?: number }

function DocReader({
  onClose,
  onLoad,
  currentDoc,
  onClear,
}: {
  onClose: () => void
  onLoad: (text: string, meta: DocMeta) => void
  currentDoc: DocMeta | null
  onClear: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [install, setInstall] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewMeta, setPreviewMeta] = useState<DocMeta | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPT = '.txt,.md,.mdx,.csv,.json,.yaml,.yml,.log,.ts,.tsx,.js,.jsx,.py,.rb,.go,.rs,.java,.sql,.sh,.css,.scss,.html,.xml,.xlsx,.xls,.pdf,.docx,.env,.toml,.ini'

  async function handleFile(file: File) {
    setLoading(true); setError(null); setInstall(null); setPreview(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/read-file', { method: 'POST', body: fd })
      const data = await res.json() as {
        ok?: boolean; text?: string; meta?: DocMeta
        error?: string; install?: string; truncated?: boolean
      }
      if (!data.ok || !data.text) {
        setError(data.error ?? 'Failed to read file')
        if (data.install) setInstall(data.install)
        setLoading(false); return
      }
      setPreview(data.text)
      setPreviewMeta(data.meta ?? null)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  function formatSize(b: number) {
    if (b < 1024) return `${b}B`
    if (b < 1024*1024) return `${(b/1024).toFixed(1)}K`
    return `${(b/1024/1024).toFixed(1)}M`
  }

  const glass: React.CSSProperties = {
    background: 'var(--magic-glass)', border: '1px solid var(--magic-glass-border)',
    backdropFilter: 'blur(var(--magic-glass-blur))', WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(7,7,26,0.88)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ ...glass, width:'92%', maxWidth:720, maxHeight:'85vh', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>📎</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, color:'var(--arcane-gold)' }}>DOCUMENT READER</p>
            <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>อ่านไฟล์เพื่อใช้เป็น context ใน CC Pipeline + DM chat</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--cmd-label)', cursor:'pointer', fontSize:18 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Currently attached doc */}
          {currentDoc && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'color-mix(in srgb, var(--arcane-gold) 8%, transparent)', border:'1px solid color-mix(in srgb, var(--arcane-gold) 25%, transparent)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16 }}>📄</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:'var(--arcane-gold)', fontFamily:"'Space Mono',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentDoc.name}</p>
                <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)' }}>
                  {formatSize(currentDoc.size)}
                  {currentDoc.rows != null && ` · ${currentDoc.rows} rows`}
                  {currentDoc.pages != null && ` · ${currentDoc.pages} pages`}
                  {currentDoc.sheets != null && ` · ${currentDoc.sheets} sheets`}
                  {' '}— กำลัง inject เป็น context
                </p>
              </div>
              <button onClick={onClear} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid color-mix(in srgb, var(--magic-pink) 30%, transparent)', background:'transparent', color:'var(--magic-pink)', cursor:'pointer', fontSize:10, fontFamily:"'Space Mono',monospace" }}>
                ✕ ลบ
              </button>
            </div>
          )}

          {/* Drop zone */}
          <div
            style={{ border:'2px dashed var(--magic-glass-border)', borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--arcane-gold)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--magic-glass-border)' }}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'var(--magic-glass-border)'
              const f = e.dataTransfer.files[0]
              if (f) void handleFile(f)
            }}
          >
            <p style={{ fontSize:28, margin:'0 0 6px' }}>📂</p>
            <p style={{ margin:'0 0 4px', fontSize:12, color:'var(--cmd-text-soft)', fontFamily:"'Space Mono',monospace" }}>
              {loading ? 'กำลังอ่านไฟล์…' : 'คลิกหรือลากไฟล์มาวางที่นี่'}
            </p>
            <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)' }}>
              Excel · PDF · Word · CSV · TXT · JSON · MD · Code files (สูงสุด 20MB)
            </p>
            <input ref={inputRef} type="file" accept={ACCEPT} style={{ display:'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
          </div>

          {/* Error / install hint */}
          {error && (
            <div style={{ padding:'10px 14px', borderRadius:8, background:'color-mix(in srgb, var(--magic-pink) 8%, transparent)', border:'1px solid color-mix(in srgb, var(--magic-pink) 25%, transparent)' }}>
              <p style={{ margin:'0 0 4px', fontSize:11, color:'var(--magic-pink)', fontFamily:"'Space Mono',monospace" }}>❌ {error}</p>
              {install && (
                <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>
                  แก้ด้วย: <code style={{ color:'var(--arcane-gold)' }}>{install}</code>
                </p>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && previewMeta && (
            <div style={{ borderRadius:8, border:'1px solid var(--magic-glass-border)', overflow:'hidden' }}>
              <div style={{ padding:'8px 14px', background:'color-mix(in srgb, var(--magic-glass) 60%, transparent)', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13 }}>✅</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:11, fontWeight:700, color:'var(--magic-cyan)', fontFamily:"'Space Mono',monospace" }}>{previewMeta.name}</p>
                  <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)' }}>
                    {formatSize(previewMeta.size)}
                    {previewMeta.rows != null && ` · ${previewMeta.rows} rows`}
                    {previewMeta.pages != null && ` · ${previewMeta.pages} pages`}
                    {previewMeta.sheets != null && ` · ${previewMeta.sheets} sheets`}
                    {preview.length >= 60000 && ' · truncated at 60K chars'}
                  </p>
                </div>
                <button
                  onClick={() => onLoad(preview, previewMeta)}
                  style={{ padding:'6px 14px', borderRadius:7, border:'none', background:'linear-gradient(135deg, var(--magic-cyan), var(--magic-purple))', color:'#fff', cursor:'pointer', fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace" }}
                >
                  ✓ ใช้เป็น Context
                </button>
              </div>
              <pre style={{ margin:0, padding:'10px 14px', fontSize:10, lineHeight:1.6, color:'var(--cmd-text-soft)', fontFamily:"'Space Mono',monospace", whiteSpace:'pre-wrap', wordBreak:'break-word', maxHeight:200, overflowY:'auto', background:'transparent' }}>
                {preview.slice(0, 2000)}{preview.length > 2000 ? '\n…' : ''}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── WorkspaceBar ───────────────────────────────────────────────────────────────
function WorkspaceBar({
  activeWorkspace,
  contextLoading,
  showExplorer,
  showDiff,
  showGit,
  showTerminal,
  graphStatus,
  graphError,
  onOpenModal,
  onToggleExplorer,
  onToggleDiff,
  onToggleGit,
  onToggleTerminal,
  onRunGraphify,
  onAttachDoc,
  docAttached,
}: {
  activeWorkspace: Workspace | null
  contextLoading: boolean
  showExplorer: boolean
  showDiff: boolean
  showGit: boolean
  showTerminal: boolean
  graphStatus: 'none' | 'ready' | 'running' | 'error'
  graphError: string | null
  onOpenModal: () => void
  onToggleExplorer: () => void
  onToggleDiff: () => void
  onToggleGit: () => void
  onToggleTerminal: () => void
  onRunGraphify: () => void
  onAttachDoc: () => void
  docAttached: boolean
}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8, marginBottom:12,
      padding:'8px 14px',
      background:'var(--magic-glass)',
      border:'1px solid var(--magic-glass-border)',
      borderRadius:10,
      backdropFilter:'blur(var(--magic-glass-blur))',
      WebkitBackdropFilter:'blur(var(--magic-glass-blur))',
    }}>
      <span style={{ fontSize:14 }}>{activeWorkspace ? '🗂️' : '📁'}</span>
      <div style={{ flex:1, minWidth:0 }}>
        {activeWorkspace ? (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:11, color:'var(--magic-cyan)' }}>{activeWorkspace.name}</span>
            {activeWorkspace.branch && <span style={{ fontSize:10, color:'var(--magic-purple)', fontFamily:"'Space Mono',monospace" }}>⎇ {activeWorkspace.branch}</span>}
            {contextLoading
              ? <span style={{ fontSize:9, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", animation:'glow-pulse 1.2s ease-in-out infinite' }}>reading context…</span>
              : <span style={{ fontSize:9, color:'var(--arcane-emerald)', fontFamily:"'Space Mono',monospace" }}>✓ context loaded</span>
            }
            <span style={{ fontSize:9, color:'var(--cmd-label)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:260 }}>{activeWorkspace.path}</span>
          </div>
        ) : (
          <span style={{ fontSize:11, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>No workspace — agents work in the app directory</span>
        )}
      </div>

      {/* Files + Diff toggles */}
      {activeWorkspace && (
        <>
          <button onClick={onToggleExplorer} style={{
            padding:'5px 10px', borderRadius:7,
            border: showExplorer ? '1px solid color-mix(in srgb, var(--magic-cyan) 40%, transparent)' : '1px solid var(--magic-glass-border)',
            background: showExplorer ? 'color-mix(in srgb, var(--magic-cyan) 10%, transparent)' : 'transparent',
            color: showExplorer ? 'var(--magic-cyan)' : 'var(--cmd-label)',
            cursor:'pointer', fontSize:10, fontWeight:700,
            fontFamily:"'Space Mono',monospace", letterSpacing:1,
            flexShrink:0, transition:'all .15s',
          }}>
            📁 FILES
          </button>
          <button onClick={onToggleDiff} style={{
            padding:'5px 10px', borderRadius:7,
            border: showDiff ? '1px solid color-mix(in srgb, var(--arcane-gold) 40%, transparent)' : '1px solid var(--magic-glass-border)',
            background: showDiff ? 'color-mix(in srgb, var(--arcane-gold) 10%, transparent)' : 'transparent',
            color: showDiff ? 'var(--arcane-gold)' : 'var(--cmd-label)',
            cursor:'pointer', fontSize:10, fontWeight:700,
            fontFamily:"'Space Mono',monospace", letterSpacing:1,
            flexShrink:0, transition:'all .15s',
          }}>
            📊 DIFF
          </button>
          <button onClick={onToggleGit} style={{
            padding:'5px 10px', borderRadius:7,
            border: showGit ? '1px solid color-mix(in srgb, var(--magic-purple) 40%, transparent)' : '1px solid var(--magic-glass-border)',
            background: showGit ? 'color-mix(in srgb, var(--magic-purple) 10%, transparent)' : 'transparent',
            color: showGit ? 'var(--magic-purple)' : 'var(--cmd-label)',
            cursor:'pointer', fontSize:10, fontWeight:700,
            fontFamily:"'Space Mono',monospace", letterSpacing:1,
            flexShrink:0, transition:'all .15s',
          }}>
            ⎇ GIT
          </button>
          <button
            onClick={onRunGraphify}
            disabled={graphStatus === 'running'}
            title={
              graphStatus === 'ready'   ? 'Graphify graph ready — click to update (AST-only, free)' :
              graphStatus === 'error'   ? (graphError ?? 'Graphify failed — click to retry') :
              graphStatus === 'running' ? 'Building graph…' :
              'Build knowledge graph (uses ANTHROPIC_API_KEY)'
            }
            style={{
              padding:'5px 10px', borderRadius:7,
              border: graphStatus === 'ready'  ? '1px solid color-mix(in srgb, var(--arcane-emerald) 40%, transparent)'
                    : graphStatus === 'error'  ? '1px solid color-mix(in srgb, var(--magic-pink) 40%, transparent)'
                    : '1px solid var(--magic-glass-border)',
              background: graphStatus === 'ready' ? 'color-mix(in srgb, var(--arcane-emerald) 10%, transparent)'
                        : graphStatus === 'error' ? 'color-mix(in srgb, var(--magic-pink) 8%, transparent)'
                        : 'transparent',
              color: graphStatus === 'ready'   ? 'var(--arcane-emerald)'
                   : graphStatus === 'running' ? 'var(--magic-cyan)'
                   : graphStatus === 'error'   ? 'var(--magic-pink)'
                   : 'var(--cmd-label)',
              cursor: graphStatus === 'running' ? 'not-allowed' : 'pointer',
              fontSize:10, fontWeight:700,
              fontFamily:"'Space Mono',monospace", letterSpacing:1,
              flexShrink:0, transition:'all .15s',
              animation: graphStatus === 'running' ? 'glow-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            {graphStatus === 'running' ? '⬡ …' : graphStatus === 'ready' ? '⬡ GRAPH ✓' : graphStatus === 'error' ? '⬡ GRAPH ✗' : '⬡ GRAPH'}
          </button>
          <button onClick={onToggleTerminal} title="Toggle terminal panel" style={{
            padding:'5px 10px', borderRadius:7,
            border: showTerminal ? '1px solid color-mix(in srgb, var(--magic-pink) 40%, transparent)' : '1px solid var(--magic-glass-border)',
            background: showTerminal ? 'color-mix(in srgb, var(--magic-pink) 10%, transparent)' : 'transparent',
            color: showTerminal ? 'var(--magic-pink)' : 'var(--cmd-label)',
            cursor:'pointer', fontSize:10, fontWeight:700,
            fontFamily:"'Space Mono',monospace", letterSpacing:1,
            flexShrink:0, transition:'all .15s',
          }}>
            ⌨ TERM
          </button>
          <button onClick={onAttachDoc} title="Attach document (Excel, PDF, Word, CSV…)" style={{
            padding:'5px 10px', borderRadius:7,
            border: docAttached ? '1px solid color-mix(in srgb, var(--arcane-gold) 40%, transparent)' : '1px solid var(--magic-glass-border)',
            background: docAttached ? 'color-mix(in srgb, var(--arcane-gold) 10%, transparent)' : 'transparent',
            color: docAttached ? 'var(--arcane-gold)' : 'var(--cmd-label)',
            cursor:'pointer', fontSize:10, fontWeight:700,
            fontFamily:"'Space Mono',monospace", letterSpacing:1,
            flexShrink:0, transition:'all .15s',
          }}>
            📎 {docAttached ? 'DOC ✓' : 'DOCS'}
          </button>
        </>
      )}

      <button onClick={onOpenModal} style={{
        padding:'5px 12px', borderRadius:7,
        border:'1px solid color-mix(in srgb, var(--magic-cyan) 30%, transparent)',
        background:'color-mix(in srgb, var(--magic-cyan) 8%, transparent)',
        color:'var(--magic-cyan)', cursor:'pointer',
        fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:1,
        flexShrink:0, transition:'all .15s',
      }}>
        {activeWorkspace ? '⇄ SWITCH' : '+ SELECT'}
      </button>
    </div>
  )
}

// ── DMPanel ────────────────────────────────────────────────────────────────────
function DMPanel({ workspacePath, workspaceContext, docContext, defaultAgentId, onAgentChange }: { workspacePath?: string; workspaceContext?: string; docContext?: string | null; defaultAgentId?: string; onAgentChange?: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(defaultAgentId ?? 'aria')

  // Keep callback ref fresh without mutating during render
  const onAgentChangeRef = useRef(onAgentChange)
  useLayoutEffect(() => { onAgentChangeRef.current = onAgentChange })

  // Sync selectedId + fire callback when Command Palette selects a new agent
  useEffect(() => {
    if (!defaultAgentId) return
    setSelectedId(defaultAgentId)
    onAgentChangeRef.current?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAgentId])
  const [msgs, setMsgs]                   = useState<Msg[]>([])
  const [input, setInput]                 = useState('')
  const [running, setRunning]             = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const abortRef  = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoadingHistory(true)
    setMsgs([])
    fetchDMHistory(selectedId)
      .then(h => { setMsgs(h); setLoadingHistory(false) })
      .catch(() => setLoadingHistory(false))
  }, [selectedId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  const clearHistory = useCallback(async () => {
    await clearDMHistoryAPI(selectedId)
    setMsgs([])
  }, [selectedId])

  async function send() {
    const text = input.trim()
    if (!text || running) return
    setInput(''); setRunning(true)

    const userMsg:  Msg = { id:`u${Date.now()}`, role:'taec', content:text, ts:new Date().toISOString() }
    const agentMsgId = `a${Date.now()+1}`
    const agentMsg: Msg = { id:agentMsgId, role:'agent', agentId:selectedId, content:'', ts:new Date().toISOString() }
    setMsgs(prev => [...prev, userMsg, agentMsg])
    void persistDMMessage(userMsg, selectedId)

    const abort = new AbortController()
    abortRef.current = abort
    const aid = selectedId
    let finalContent = ''

    try {
      const res = await fetch('/api/dm', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          message: text, agentId: aid,
          history: msgs.slice(-12).map(m => ({ role:m.role, content:m.content })),
          ...(workspacePath    ? { workspacePath }    : {}),
          ...(workspaceContext ? { workspaceContext } : {}),
          ...(docContext ? { docContext } : {}),
        }),
        signal: abort.signal,
      })
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream:true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data==='[DONE]') break
          try {
            const ev = JSON.parse(data) as { type:string; text?:string }
            if (ev.type==='text' && ev.text) {
              finalContent += ev.text
              setMsgs(prev => prev.map(m => m.id===agentMsgId ? { ...m, content:m.content+(ev.text??'') } : m))
            }
          } catch { /* skip */ }
        }
      }
      void persistDMMessage({ ...agentMsg, content:finalContent }, aid)
    } catch (err: unknown) {
      if (err instanceof Error && err.name!=='AbortError') {
        const ec = `⚠️ Error: ${err.message}`
        setMsgs(prev => prev.map(m => m.id===agentMsgId ? { ...m, content:ec } : m))
        void persistDMMessage({ ...agentMsg, content:ec }, aid)
      }
    } finally { setRunning(false); abortRef.current = null }
  }

  const selectedAgent = agents.find(a => a.id===selectedId)
  const deptGroups = agents.reduce<Record<string,typeof agents>>((acc,ag) => {
    if (!acc[ag.dept]) acc[ag.dept]=[]
    acc[ag.dept].push(ag)
    return acc
  }, {})

  return (
    <div style={{ display:'flex', height:700, gap:0 }}>
      {/* Agent sidebar */}
      <div style={{ width:220, flexShrink:0, borderRight:'1px solid var(--magic-glass-border)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--magic-glass-border)' }}>
          <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:2, fontWeight:700, margin:0 }}>SELECT AGENT</p>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {Object.entries(deptGroups).map(([dept,deptAgents]) => (
            <div key={dept}>
              <div style={{ padding:'8px 14px 4px' }}>
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:0 }}>{dept.toUpperCase()}</p>
              </div>
              {deptAgents.map(ag => {
                const isSel = ag.id===selectedId
                return (
                  <button key={ag.id} onClick={() => { if (ag.id!==selectedId) { setSelectedId(ag.id); setInput('') } }} style={{
                    width:'100%', padding:'8px 14px', display:'flex', alignItems:'center', gap:9,
                    background: isSel ? `color-mix(in srgb, ${ag.color} 12%, transparent)` : 'transparent',
                    border:'none', borderLeft: isSel ? `2px solid ${ag.color}` : '2px solid transparent',
                    cursor:'pointer', textAlign:'left', transition:'all .15s',
                  }}>
                    <span style={{ fontSize:15 }}>{ag.emoji}</span>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ fontSize:11, fontWeight:700, margin:0, color: isSel ? ag.color : 'var(--cmd-text)', fontFamily:"'Space Mono',monospace" }}>{ag.name}</p>
                      <p style={{ fontSize:9, margin:0, color:'var(--cmd-label)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ag.title}</p>
                    </div>
                    <span style={{
                      fontSize:7, padding:'1px 4px', borderRadius:3, flexShrink:0,
                      fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:0.5,
                      color: MODEL_TIER_COLOR[getAgentModelTier(ag.id)],
                      border: `1px solid color-mix(in srgb, ${MODEL_TIER_COLOR[getAgentModelTier(ag.id)]} 35%, transparent)`,
                      background: `color-mix(in srgb, ${MODEL_TIER_COLOR[getAgentModelTier(ag.id)]} 10%, transparent)`,
                    }}>{getAgentModelTier(ag.id)}</span>
                    <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: ag.status==='online' ? 'var(--arcane-emerald)' : ag.status==='busy' ? 'var(--arcane-gold)' : 'var(--arcane-rune)', boxShadow: ag.status==='online' ? '0 0 6px var(--arcane-emerald)' : 'none' }} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:`color-mix(in srgb, ${selectedAgent?.color??'var(--magic-purple)'} 16%, transparent)`, border:`1px solid color-mix(in srgb, ${selectedAgent?.color??'var(--magic-purple)'} 40%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            {selectedAgent?.emoji??'?'}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, margin:0, color:selectedAgent?.color??'var(--cmd-text)', fontFamily:"'Space Mono',monospace" }}>{selectedAgent?.name??'AGENT'}</p>
            <p style={{ fontSize:10, margin:0, color:'var(--cmd-label)' }}>{selectedAgent?.title} &middot; {selectedAgent?.dept}</p>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end', alignItems:'center' }}>
            {selectedAgent && (() => {
              const tier = getAgentModelTier(selectedAgent.id)
              const tcolor = MODEL_TIER_COLOR[tier]
              return (
                <span style={{ fontSize:9, padding:'2px 8px', borderRadius:10, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:.5, color: tcolor, border:`1px solid color-mix(in srgb, ${tcolor} 35%, transparent)`, background:`color-mix(in srgb, ${tcolor} 10%, transparent)` }}>
                  ◆ {tier}
                </span>
              )
            })()}
            {selectedAgent?.skills.slice(0,3).map(s => (
              <span key={s} style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:`color-mix(in srgb, ${selectedAgent.color} 10%, transparent)`, color:selectedAgent.color, border:`1px solid color-mix(in srgb, ${selectedAgent.color} 25%, transparent)`, fontFamily:"'Space Mono',monospace", letterSpacing:.5 }}>{s}</span>
            ))}
            {msgs.length>0 && (
              <button onClick={() => void clearHistory()} title="Clear history" style={{ padding:'3px 8px', borderRadius:6, fontSize:9, border:'1px solid var(--magic-glass-border)', background:'transparent', color:'var(--cmd-label)', cursor:'pointer', fontFamily:"'Space Mono',monospace", letterSpacing:.5, marginLeft:4 }}>🗑 CLEAR</button>
            )}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
          {loadingHistory && <div style={{ margin:'auto', textAlign:'center', padding:'40px 20px' }}><p style={{ fontSize:11, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>Loading history…</p></div>}
          {!loadingHistory && msgs.length===0 && (
            <div style={{ margin:'auto', textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>{selectedAgent?.emoji??'?'}</div>
              <p style={{ fontSize:14, fontWeight:700, color:selectedAgent?.color??'var(--cmd-text)', marginBottom:6, fontFamily:"'Space Mono',monospace" }}>DM &mdash; {selectedAgent?.name}</p>
              <p style={{ fontSize:12, color:'var(--cmd-text-soft)', maxWidth:320, lineHeight:1.7, margin:'0 auto' }}>{selectedAgent?.description}</p>
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
                {selectedAgent?.skills.map(s => (
                  <span key={s} style={{ fontSize:10, padding:'4px 10px', borderRadius:20, background:`color-mix(in srgb, ${selectedAgent.color} 10%, transparent)`, color:selectedAgent.color, border:`1px solid color-mix(in srgb, ${selectedAgent.color} 25%, transparent)`, fontFamily:"'Space Mono',monospace" }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {!loadingHistory && msgs.map(msg => {
            const ag = agents.find(a => a.id===msg.agentId)
            const isUser = msg.role==='taec'
            const ts = new Date(msg.ts)
            return (
              <div key={msg.id} style={{ display:'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap:9, alignItems:'flex-start' }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: isUser ? 'color-mix(in srgb, var(--arcane-gold) 20%, transparent)' : `color-mix(in srgb, ${ag?.color??'var(--magic-purple)'} 18%, transparent)`, border: isUser ? '1px solid color-mix(in srgb, var(--arcane-gold) 40%, transparent)' : `1px solid color-mix(in srgb, ${ag?.color??'var(--magic-purple)'} 35%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                  {isUser ? '👑' : (ag?.emoji??'?')}
                </div>
                <div style={{ maxWidth:'78%' }}>
                  <div style={{ display:'flex', gap:6, marginBottom:4, flexDirection: isUser ? 'row-reverse' : 'row', alignItems:'center' }}>
                    <span style={{ fontSize:9, fontWeight:700, fontFamily:"'Space Mono',monospace", color: isUser ? 'var(--arcane-gold)' : (ag?.color??'var(--magic-purple)') }}>{isUser ? 'TAEC' : (ag?.name??(msg.agentId??'').toUpperCase())}</span>
                    <span style={{ fontSize:9, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>{ts.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <div style={{ padding:'10px 14px', borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isUser ? 'color-mix(in srgb, var(--arcane-gold) 8%, transparent)' : `color-mix(in srgb, ${ag?.color??'var(--magic-purple)'} 7%, transparent)`, border: isUser ? '1px solid color-mix(in srgb, var(--arcane-gold) 20%, transparent)' : `1px solid color-mix(in srgb, ${ag?.color??'var(--magic-purple)'} 20%, transparent)` }}>
                    {msg.content
                      ? <p style={{ fontSize:13, lineHeight:1.7, color:'var(--cmd-text)', whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>{msg.content}</p>
                      : <span style={{ display:'flex', gap:4, alignItems:'center' }}>{[0,.2,.4].map((d,i) => <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:ag?.color??'var(--magic-purple)', opacity:.6, animation:'glow-pulse 1.2s ease-in-out infinite', animationDelay:`${d}s` }} />)}</span>
                    }
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding:'10px 14px', borderTop:'1px solid var(--magic-glass-border)', display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} placeholder={`DM ${selectedAgent?.name??'agent'}… (Shift+Enter = newline)`} disabled={running||loadingHistory} rows={1}
            style={{ flex:1, padding:'10px 14px', borderRadius:10, resize:'none', overflow:'hidden', background:'var(--magic-glass)', border:'1px solid var(--magic-glass-border)', color:'var(--cmd-text)', fontSize:13, outline:'none', fontFamily:'inherit', lineHeight:1.5, opacity:(running||loadingHistory)?0.6:1 }} />
          {running
            ? <button onClick={() => { abortRef.current?.abort(); setRunning(false) }} style={{ padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:13, fontWeight:700, flexShrink:0 }}>⏹</button>
            : <button onClick={() => void send()} disabled={!input.trim()||loadingHistory} style={{ padding:'10px 18px', borderRadius:10, border:'none', flexShrink:0, cursor:(input.trim()&&!loadingHistory)?'pointer':'not-allowed', background:(input.trim()&&!loadingHistory)?`linear-gradient(135deg,${selectedAgent?.color??'var(--magic-purple)'},color-mix(in srgb,${selectedAgent?.color??'var(--magic-purple)'} 70%,var(--magic-pink)))`:'var(--magic-glass)', color:(input.trim()&&!loadingHistory)?'#fff':'var(--cmd-label)', fontSize:13, fontWeight:700, transition:'all .18s' }}>⚡</button>
          }
        </div>
      </div>
    </div>
  )
}

// ── GitPanel ───────────────────────────────────────────────────────────────────
interface GitPanelProps {
  workspaceId: string
  workspaceName?: string
  workspacePath?: string
  onClose?: () => void
}

interface GitStatus {
  branch: string
  branches: string[]
  dirty: boolean
  changedFiles: number
  ahead: number
  behind: number
  commits: { hash: string; message: string }[]
}

function GitPanel({ workspaceId, workspaceName, onClose }: GitPanelProps) {
  const [status, setStatus]       = useState<GitStatus | null>(null)
  const [loading, setLoading]     = useState(true)
  const [log, setLog]             = useState<string[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [busy, setBusy]           = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const logEndRef                 = useRef<HTMLDivElement>(null)

  async function loadStatus() {
    try {
      const r = await fetch(`/api/workspace/git?id=${workspaceId}`)
      if (r.ok) setStatus(await r.json() as GitStatus)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { void loadStatus() }, [workspaceId])
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log])

  async function runGit(action: string, extra?: Record<string, string>) {
    if (busy) return
    setBusy(true)
    setLog(p => [...p, `▶ ${action}…`])
    try {
      const r = await fetch('/api/workspace/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workspaceId, action, ...extra }),
      })
      const d = await r.json() as { ok: boolean; output: string }
      const lines = d.output.trim() ? d.output.split('\n').filter(Boolean) : []
      setLog(p => [...p, ...lines, d.ok ? '✅ Done' : '❌ Failed'])
      if (d.ok) await loadStatus()
    } catch (e: unknown) {
      setLog(p => [...p, `❌ ${e instanceof Error ? e.message : String(e)}`])
    } finally { setBusy(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    background: 'color-mix(in srgb, var(--cmd-text) 5%, transparent)',
    border: '1px solid var(--magic-glass-border)',
    color: 'var(--cmd-text)', fontSize: 11, outline: 'none',
    fontFamily: "'Space Mono',monospace", boxSizing: 'border-box',
  }

  const branchList = status?.branches?.length ? status.branches : (status?.branch ? [status.branch] : [])

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:700, background:'rgba(7,7,26,0.92)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}
    >
      <div
        style={{ width:'90%', maxWidth:1000, height:'88vh', background:'var(--magic-glass)', border:'1px solid var(--magic-glass-border)', boxShadow:'var(--magic-glow-soft)', backdropFilter:'blur(var(--magic-glass-blur))', borderRadius:'var(--cmd-card-radius)', display:'flex', flexDirection:'column', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--magic-glass-border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span style={{ fontSize:18 }}>⎇</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, color:'var(--magic-purple)' }}>GIT PANEL — {(workspaceName ?? 'WORKSPACE').toUpperCase()}</p>
            {status && !loading && (
              <p style={{ margin:0, fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace" }}>
                ⎇ {status.branch}
                {status.ahead > 0 && <span style={{ color:'var(--arcane-emerald)', marginLeft:8 }}>↑{status.ahead} ahead</span>}
                {status.behind > 0 && <span style={{ color:'var(--magic-pink)', marginLeft:8 }}>↓{status.behind} behind</span>}
                {status.dirty && <span style={{ color:'var(--arcane-gold)', marginLeft:8 }}>· {status.changedFiles} changed</span>}
                {!status.dirty && <span style={{ color:'var(--arcane-emerald)', marginLeft:8 }}>· clean</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--cmd-label)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        {loading && <p style={{ padding:'24px 20px', color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", fontSize:11 }}>Loading git info…</p>}

        {!loading && (
          <div style={{ flex:1, display:'flex', minHeight:0 }}>

            {/* ── Left column: branch management + sync ── */}
            <div style={{ width:280, flexShrink:0, borderRight:'1px solid var(--magic-glass-border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>

                {/* Branch list */}
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 8px' }}>BRANCHES</p>
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:14 }}>
                  {branchList.map(b => {
                    const isCurrent = b === status?.branch
                    return (
                      <div key={b} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6, background: isCurrent ? 'color-mix(in srgb, var(--magic-purple) 14%, transparent)' : 'transparent', border: isCurrent ? '1px solid color-mix(in srgb, var(--magic-purple) 35%, transparent)' : '1px solid transparent' }}>
                        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, flex:1, color: isCurrent ? 'var(--magic-purple)' : 'var(--cmd-text-soft)', fontWeight: isCurrent ? 700 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {isCurrent ? '● ' : '  '}{b}
                        </span>
                        {!isCurrent && (
                          <button
                            onClick={() => void runGit('checkout', { branch: b })}
                            disabled={busy}
                            style={{ padding:'2px 7px', borderRadius:4, border:'1px solid var(--magic-glass-border)', background:'transparent', color:'var(--cmd-label)', cursor: busy ? 'not-allowed' : 'pointer', fontSize:9, fontFamily:"'Space Mono',monospace", flexShrink:0 }}
                          >switch</button>
                        )}
                      </div>
                    )
                  })}
                  {branchList.length === 0 && <p style={{ fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", margin:0 }}>No branches found</p>}
                </div>

                {/* Create new branch */}
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 6px' }}>NEW BRANCH</p>
                <div style={{ display:'flex', gap:5, marginBottom:16 }}>
                  <input
                    value={newBranch}
                    onChange={e => setNewBranch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newBranch.trim()) { void runGit('create-branch', { branch: newBranch.trim() }); setNewBranch('') } }}
                    placeholder="feature/my-branch"
                    style={{ ...inputStyle, flex:1, marginTop:0 }}
                    disabled={busy}
                  />
                  <button
                    onClick={() => { if (newBranch.trim()) { void runGit('create-branch', { branch: newBranch.trim() }); setNewBranch('') } }}
                    disabled={busy || !newBranch.trim()}
                    style={{ padding:'6px 10px', borderRadius:6, border:'none', background:'color-mix(in srgb, var(--magic-purple) 24%, transparent)', color:'var(--magic-purple)', cursor: busy || !newBranch.trim() ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700, flexShrink:0 }}
                  >+</button>
                </div>

                {/* Sync */}
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 8px' }}>SYNC</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { action:'fetch', label:'⟳ FETCH',  color:'var(--magic-cyan)' },
                    { action:'pull',  label:'⬇ PULL',   color:'var(--arcane-emerald)' },
                    { action:'push',  label:'⬆ PUSH',   color:'var(--magic-purple)' },
                  ].map(({ action, label, color }) => (
                    <button key={action} onClick={() => void runGit(action)} disabled={busy}
                      style={{ padding:'8px 12px', borderRadius:7, border:`1px solid color-mix(in srgb, ${color} 30%, transparent)`, background:`color-mix(in srgb, ${color} 8%, transparent)`, color, cursor: busy ? 'not-allowed' : 'pointer', fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:1, textAlign:'left' }}>
                      {busy ? '⏳ …' : label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output log */}
              <div style={{ maxHeight:180, overflowY:'auto', padding:'8px 14px', borderTop:'1px solid var(--magic-glass-border)', background:'color-mix(in srgb, var(--nebula-bg) 60%, transparent)', flexShrink:0 }}>
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 4px' }}>OUTPUT</p>
                {log.length === 0 && <p style={{ fontSize:10, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", margin:0 }}>—</p>}
                {log.map((line, i) => (
                  <p key={i} style={{ margin:0, fontSize:10, fontFamily:"'Space Mono',monospace", whiteSpace:'pre-wrap', lineHeight:1.5, color: line.startsWith('✅') ? 'var(--arcane-emerald)' : line.startsWith('❌') ? 'var(--magic-pink)' : line.startsWith('▶') ? 'var(--magic-cyan)' : 'var(--cmd-text-soft)' }}>{line}</p>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* ── Right column: stage & commit ── */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

              {/* Changed files overview + recent commits */}
              <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 8px' }}>
                  STATUS
                </p>

                {!status?.dirty ? (
                  <div style={{ textAlign:'center', padding:'32px 20px' }}>
                    <p style={{ fontSize:32, marginBottom:8 }}>✅</p>
                    <p style={{ fontSize:12, color:'var(--cmd-text-soft)', fontFamily:"'Space Mono',monospace" }}>Working tree clean</p>
                    <p style={{ fontSize:10, color:'var(--cmd-label)' }}>Nothing to commit</p>
                  </div>
                ) : (
                  <div style={{ padding:'10px 12px', borderRadius:8, background:'color-mix(in srgb, var(--arcane-gold) 6%, transparent)', border:'1px solid color-mix(in srgb, var(--arcane-gold) 20%, transparent)', marginBottom:12 }}>
                    <p style={{ margin:0, fontSize:11, fontFamily:"'Space Mono',monospace", color:'var(--arcane-gold)' }}>
                      ⚠ {status.changedFiles} file{status.changedFiles !== 1 ? 's' : ''} changed — ready to stage &amp; commit
                    </p>
                  </div>
                )}

                {/* Recent commits */}
                {status?.commits && status.commits.length > 0 && (
                  <>
                    <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'16px 0 8px' }}>RECENT COMMITS</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {status.commits.slice(0, 10).map(c => (
                        <div key={c.hash} style={{ padding:'6px 10px', borderRadius:6, background:'color-mix(in srgb, var(--cmd-text) 3%, transparent)', border:'1px solid var(--magic-glass-border)', display:'flex', gap:10, alignItems:'baseline' }}>
                          <span style={{ color:'var(--magic-purple)', fontFamily:"'Space Mono',monospace", fontSize:10, flexShrink:0 }}>{c.hash.slice(0,7)}</span>
                          <span style={{ color:'var(--cmd-text-soft)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.message}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Commit box */}
              <div style={{ padding:'14px 16px', borderTop:'1px solid var(--magic-glass-border)', flexShrink:0, background:'color-mix(in srgb, var(--nebula-bg) 40%, transparent)' }}>
                <p style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--cmd-label)', letterSpacing:1.5, fontWeight:700, margin:'0 0 6px' }}>COMMIT MESSAGE</p>
                <textarea
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && commitMsg.trim()) { void runGit('commit', { message: commitMsg.trim() }); setCommitMsg('') } }}
                  placeholder="feat: describe your changes… (Ctrl+Enter to commit)"
                  rows={3}
                  disabled={busy}
                  style={{ ...inputStyle, resize:'vertical', marginBottom:8 }}
                />
                <button
                  onClick={() => { if (commitMsg.trim()) { void runGit('commit', { message: commitMsg.trim() }); setCommitMsg('') } }}
                  disabled={busy || !commitMsg.trim()}
                  style={{ width:'100%', padding:'10px 16px', borderRadius:8, border:'none', background: busy || !commitMsg.trim() ? 'var(--magic-glass)' : 'linear-gradient(135deg, var(--magic-purple), var(--magic-cyan))', color: busy || !commitMsg.trim() ? 'var(--cmd-label)' : '#fff', cursor: busy || !commitMsg.trim() ? 'not-allowed' : 'pointer', fontSize:11, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:1, transition:'all .15s' }}
                >
                  {busy ? '⏳ RUNNING…' : '💾 STAGE ALL & COMMIT'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── GuildRoom page ─────────────────────────────────────────────────────────────
export default function GuildRoom() {
  // Lazy initialisers read sessionStorage once on mount — avoids the set-state-in-effect pattern
  const [tab, setTab]                             = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'cc'
    return sessionStorage.getItem('nexmind_pending_agent') ? 'dm' : 'cc'
  })
  const [activeWorkspace, setActiveWorkspace]     = useState<Workspace | null>(null)
  const [workspaceContext, setWorkspaceContext]   = useState<string | null>(null)
  const [contextLoading, setContextLoading]       = useState(false)
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [showExplorer, setShowExplorer]           = useState(false)
  const [showDiff, setShowDiff]                   = useState(false)
  const [showGit, setShowGit]                     = useState(false)
  const [showTerminal, setShowTerminal]           = useState(false)
  const [graphStatus, setGraphStatus]             = useState<'none' | 'ready' | 'running' | 'error'>('none')
  const [graphError, setGraphError]               = useState<string | null>(null)
  const [pendingAgent, setPendingAgent]           = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const agent = sessionStorage.getItem('nexmind_pending_agent')
    if (agent) sessionStorage.removeItem('nexmind_pending_agent')
    return agent
  })
  const [docContext, setDocContext]               = useState<string | null>(null)
  const [docMeta, setDocMeta]                     = useState<{ name: string; size: number; ext: string; rows?: number; pages?: number; sheets?: number } | null>(null)
  const [showDocReader, setShowDocReader]         = useState(false)

  // Load last-used workspace on mount + handle pending workspace from Command Palette
  useEffect(() => {
    fetchWorkspaces().then(ws => {
      const pendingWsId = sessionStorage.getItem('nexmind_pending_workspace')
      if (pendingWsId) {
        sessionStorage.removeItem('nexmind_pending_workspace')
        const found = ws.find(w => w.id === pendingWsId)
        if (found) { handleSelectWorkspace(found); return }
      }
      if (ws.length > 0) handleSelectWorkspace(ws[0])
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch workspace context whenever active workspace changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activeWorkspace) { setWorkspaceContext(null); setGraphStatus('none'); return }
    setContextLoading(true)
    fetchWorkspaceContext(activeWorkspace.id).then(result => {
      setWorkspaceContext(result?.contextString ?? null)
      setGraphStatus(result?.hasGraph ? 'ready' : 'none')
      setContextLoading(false)
    })
  }, [activeWorkspace])

  function handleSelectWorkspace(ws: Workspace) {
    setActiveWorkspace(ws)
    setShowWorkspaceModal(false)
    setShowExplorer(false)
  }

  async function handleRunGraphify() {
    if (!activeWorkspace || graphStatus === 'running') return
    setGraphStatus('running')
    setGraphError(null)
    const result = await runGraphify(activeWorkspace.id)
    if (result.ok) {
      const ctx = await fetchWorkspaceContext(activeWorkspace.id)
      setWorkspaceContext(ctx?.contextString ?? null)
      setGraphStatus('ready')
    } else {
      // Surface a readable error — truncate long output to first line
      const firstLine = result.output.split('\n').find(l => l.trim()) ?? result.output
      setGraphError(firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine)
      setGraphStatus('error')
    }
  }

  const tabs = [
    { id: 'cc' as const, icon: '⚡', label: 'CC PIPELINE', desc: 'สั่งงาน NEXMIND Agent Team — ARIA วางแผน + ทีม execute พร้อมกัน' },
    { id: 'dm' as const, icon: '💬', label: 'DIRECT MESSAGE', desc: 'คุยตรงกับ Agent เดี่ยว — ถามคำถาม, ขอ advice, brainstorm' },
  ]

  const glass: React.CSSProperties = {
    background: 'var(--magic-glass)',
    border: '1px solid var(--magic-glass-border)',
    borderRadius: 'var(--cmd-card-radius)',
    backdropFilter: 'blur(var(--magic-glass-blur))',
    WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
  }

  return (
    <div style={{ padding:'32px 28px', minHeight:'100vh', position:'relative', overflow:'hidden' }}>

      {showDocReader && (
        <DocReader
          onClose={() => setShowDocReader(false)}
          onLoad={(text, meta) => {
            setDocContext(text)
            setDocMeta(meta)
            setShowDocReader(false)
          }}
          currentDoc={docMeta}
          onClear={() => { setDocContext(null); setDocMeta(null) }}
        />
      )}

      {showWorkspaceModal && (
        <WorkspaceModal
          onClose={() => setShowWorkspaceModal(false)}
          onSelect={handleSelectWorkspace}
          activeId={activeWorkspace?.id ?? null}
        />
      )}


      {showDiff && activeWorkspace && (
        <DiffViewer
          workspaceId={activeWorkspace.id}
          onClose={() => setShowDiff(false)}
        />
      )}

      {showGit && activeWorkspace && (
        <GitPanel
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          onClose={() => setShowGit(false)}
        />
      )}

      <div style={{ position:'fixed', top:'10%', left:'5%', width:350, height:350, borderRadius:'50%', background:'var(--magic-purple)', opacity:0.05, filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'20%', right:'8%', width:280, height:280, borderRadius:'50%', background:'var(--magic-cyan)', opacity:0.04, filter:'blur(70px)', pointerEvents:'none' }} />

      <div style={{ maxWidth:1280, margin:'0 auto', position:'relative' }}>

        {/* Page header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'color-mix(in srgb, var(--magic-purple) 14%, transparent)', border:'1px solid color-mix(in srgb, var(--magic-purple) 35%, transparent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'var(--magic-glow-purple)' }}>🏰</div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, margin:0, background:'var(--magic-grad-heading)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontFamily:"'Space Mono',monospace", letterSpacing:-0.5 }}>GUILD ROOM</h1>
              <p style={{ fontSize:11, color:'var(--cmd-label)', fontFamily:"'Space Mono',monospace", margin:0, letterSpacing:1 }}>NEXMIND COMMAND CENTER &middot; AGENT INTERFACE</p>
            </div>
          </div>
          <div style={{ ...glass, padding:'8px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--arcane-emerald)', boxShadow:'0 0 8px var(--arcane-emerald)', animation:'glow-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:'var(--cmd-text-soft)', letterSpacing:1 }}>{agents.filter(a=>a.status==='online').length} ONLINE</span>
            <span style={{ color:'var(--arcane-gold)', fontSize:11, fontFamily:"'Space Mono',monospace" }}>&middot; {agents.length} AGENTS</span>
          </div>
        </div>

        {/* Workspace bar */}
        <WorkspaceBar
          activeWorkspace={activeWorkspace}
          contextLoading={contextLoading}
          showExplorer={showExplorer}
          showDiff={showDiff}
          showGit={showGit}
          showTerminal={showTerminal}
          graphStatus={graphStatus}
          graphError={graphError}
          onOpenModal={() => setShowWorkspaceModal(true)}
          onToggleExplorer={() => setShowExplorer(v => !v)}
          onToggleDiff={() => setShowDiff(v => !v)}
          onToggleGit={() => setShowGit(v => !v)}
          onToggleTerminal={() => setShowTerminal(v => !v)}
          onRunGraphify={() => void handleRunGraphify()}
          onAttachDoc={() => setShowDocReader(true)}
          docAttached={!!docContext}
        />

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16, padding:5, background:'var(--magic-glass)', border:'1px solid var(--magic-glass-border)', borderRadius:14, width:'fit-content', backdropFilter:'blur(var(--magic-glass-blur))', WebkitBackdropFilter:'blur(var(--magic-glass-blur))' }}>
          {tabs.map(t => {
            const isActive = tab===t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding:'8px 20px', borderRadius:10, cursor:'pointer',
                background: isActive ? 'color-mix(in srgb, var(--magic-purple) 22%, transparent)' : 'transparent',
                border: isActive ? '1px solid color-mix(in srgb, var(--magic-purple) 50%, transparent)' : '1px solid transparent',
                color: isActive ? 'var(--magic-purple)' : 'var(--cmd-label)',
                fontSize:11, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:1,
                transition:'all .15s', boxShadow: isActive ? 'var(--magic-glow-purple)' : 'none',
              }}>{t.icon} {t.label}</button>
            )
          })}
        </div>

        <p style={{ fontSize:11, color:'var(--cmd-text-soft)', marginBottom:14, fontFamily:"'Space Mono',monospace", letterSpacing:0.5 }}>
          {tabs.find(t=>t.id===tab)?.desc}
        </p>

        {/* Main panel */}
        <div style={{ ...glass, padding:0, overflow:'hidden', minHeight:700 }}>
          {/* Gradient top bar */}
          <div style={{ height:2, background: tab==='cc' ? 'linear-gradient(90deg,transparent,var(--magic-purple),var(--magic-cyan),transparent)' : 'linear-gradient(90deg,transparent,var(--magic-cyan),var(--magic-pink),transparent)', flexShrink:0 }} />

          {/* Content row: chat + optional file explorer */}
          <div style={{ display:'flex', height:698 }}>
            <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
              {tab==='cc' && (
                <AgentChat
                  projectContext=""
                  workDir={activeWorkspace?.path}
                  workspaceContext={workspaceContext ?? undefined}
                  docContext={docContext}
                />
              )}
              {tab==='dm' && (
                <DMPanel
                  workspacePath={activeWorkspace?.path}
                  workspaceContext={workspaceContext ?? undefined}
                  docContext={docContext}
                  defaultAgentId={pendingAgent ?? undefined}
                  onAgentChange={() => setPendingAgent(null)}
                />
              )}
            </div>

            {/* File Explorer side panel */}
            {showExplorer && activeWorkspace && (
              <div style={{ width:280, borderLeft:'1px solid var(--magic-glass-border)', overflow:'auto', flexShrink:0 }}>
                <FileExplorer workspaceId={activeWorkspace.id} workspaceName={activeWorkspace.name} workspacePath={activeWorkspace.path} />
              </div>
            )}

          </div>

          {/* Terminal Panel — bottom drawer */}
          {showTerminal && activeWorkspace && (
            <TerminalPanel
              workspacePath={activeWorkspace.path}
              onClose={() => setShowTerminal(false)}
            />
          )}
        </div>

      </div>
    </div>
)
}
