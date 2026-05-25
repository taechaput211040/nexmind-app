'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { agents } from '@/data/agents'

// ─── Global persistent state (survives component unmount / navigation) ───────
// CC process keeps running on server. State here lets AgentChat restore itself.
let _globalAbort: AbortController | null = null
let _isRunningGlobally = false

interface GlobalChatState {
  turns: Turn[]
  pipelinePlan: { agents: string[]; roles: string[]; summary: string } | null
  activeAgentId: string | null
  doneAgents: Set<string>
  agentTurnMap: Record<string, string>
  currentTurnId: string
  pipelineContext: string
  pipelineAgents: string[]
  pipelineStartedAt: number | null   // epoch ms, for elapsed timer
}
const _g: GlobalChatState = {
  turns: [],
  pipelinePlan: null,
  activeAgentId: null,
  doneAgents: new Set(),
  agentTurnMap: {},
  currentTurnId: '',
  pipelineContext: '',
  pipelineAgents: [],
  pipelineStartedAt: null,
}

// Notify sidebar of running state changes
function emitCCStatus(running: boolean) {
  _isRunningGlobally = running
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexmind-cc-status', { detail: { running } }))
  }
}

// ─── Completion sound ────────────────────────────────────────────────────────
function playDoneSound() {
  try {
    const ctx = new AudioContext()
    const notes = [523.25, 659.25, 783.99] // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.16
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.10, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
      osc.start(t); osc.stop(t + 0.4)
    })
  } catch { /* AudioContext blocked — ignore */ }
}

function notifyPipelineDone(summary: string) {
  if (typeof window === 'undefined') return
  // In-app toast (always)
  window.dispatchEvent(new CustomEvent('nexmind:pipeline-done', { detail: { summary } }))
  // Sound
  playDoneSound()
  // Browser notification (only when tab is hidden)
  if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
    new Notification('⚡ NEXMIND — Pipeline Complete', {
      body: summary.slice(0, 100),
      icon: '/favicon.ico',
      tag: 'nexmind-pipeline',
    })
  }
}

// Module-level callback — the currently mounted AgentChat registers here so it
// receives live updates even after remounting mid-pipeline.
let _onUpdate: (() => void) | null = null

// ─── Chat History Types ───────────────────────────────────────────────────
interface StoredMessage {
  role: 'user' | 'agent'
  agentId?: string
  text: string
  ts: string
}
interface StoredSession {
  id: string
  title: string
  startedAt: string
  mode: string
  messages: StoredMessage[]
  taskSummary?: string
}
interface TaskLogEntry {
  id: string
  ts: string
  title: string
  agents: string[]
  summary: string
  mode: string
}

// ─── SQLite-backed history API helpers ───────────────────────────────────────
async function apiLoadSessions(): Promise<StoredSession[]> {
  try {
    const r = await fetch('/api/history/cc')
    if (!r.ok) return []
    const data = await r.json() as { sessions: Array<{ id: string; title: string; mode: string; started_at: string; task_summary?: string }> }
    return (data.sessions ?? []).map(s => ({
      id: s.id, title: s.title, mode: s.mode,
      startedAt: s.started_at, taskSummary: s.task_summary, messages: [],
    }))
  } catch { return [] }
}

async function apiLoadSessionMessages(sessionId: string): Promise<StoredMessage[]> {
  try {
    const r = await fetch(`/api/history/cc?sessionId=${sessionId}`)
    if (!r.ok) return []
    const data = await r.json() as { session: { messages: Array<{ role: string; agent_id?: string; text: string; ts: string }> } }
    return (data.session?.messages ?? []).map(m => ({
      role: m.role as 'user' | 'agent', agentId: m.agent_id, text: m.text, ts: m.ts,
    }))
  } catch { return [] }
}

function apiUpsertSession(session: StoredSession) {
  fetch('/api/history/cc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: {
        id: session.id, title: session.title, mode: session.mode,
        started_at: session.startedAt, updated_at: new Date().toISOString(),
        task_summary: session.taskSummary ?? null,
      },
    }),
  }).catch(() => {})
}

function apiAppendCCMessage(sessionId: string, msg: StoredMessage) {
  fetch('/api/history/cc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        id: `${sessionId}_${Date.now()}`, session_id: sessionId,
        role: msg.role, agent_id: msg.agentId ?? null, text: msg.text, ts: msg.ts,
      },
    }),
  }).catch(() => {})
}

async function apiLoadTaskLog(): Promise<TaskLogEntry[]> {
  try {
    const r = await fetch('/api/history/task-log')
    if (!r.ok) return []
    const data = await r.json() as { entries: TaskLogEntry[] }
    return data.entries ?? []
  } catch { return [] }
}

function apiAddTaskLog(entry: TaskLogEntry) {
  fetch('/api/history/task-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  }).catch(() => {})
}

const agentEmoji: Record<string, string> = {
  aria:'🔮', nova:'💻', byte:'🔧', rex:'🏛️', zeta:'🧪', forge:'⚙️',
  luna:'🌙', pixel:'🎨', scout:'🔍', ink:'✍️',
  hawk:'🦅', sage:'🛡️', atlas:'📊', memo:'🧠',
  coin:'💰', nexus:'🔭',
}

const toolIcons: Record<string, string> = {
  read_file:'📂', write_file:'✍️', list_files:'📁', run_command:'⚡', search_code:'🔍',
  Read:'📂', Write:'✍️', Edit:'✏️', Bash:'⚡', Glob:'📁', Grep:'🔍',
  TodoWrite:'📋', WebSearch:'🌐', WebFetch:'🌐',
}

type AgentEvent =
  | { type: 'text'; text: string; agentId?: string }
  | { type: 'tool_call'; toolName: string; toolId: string; input: Record<string, unknown>; agentId?: string }
  | { type: 'tool_result'; toolId: string; toolName?: string; result: string; success: boolean; agentId?: string }
  | { type: 'pipeline_plan'; agents: string[]; roles: string[]; summary: string }
  | { type: 'agent_start'; agentId: string; role: string }
  | { type: 'agent_done'; agentId: string }
  | { type: 'aria_summary_done'; summary: string }
  | { type: 'status'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: string; agentId?: string }

type Turn = {
  id: string
  role: 'taec' | 'agent'
  agentId?: string
  text?: string
  events?: AgentEvent[]
  ts: Date
  pipelineRole?: string
  isPipelineAgent?: boolean
  isPending?: boolean
  isDone?: boolean
}

// ─── Elapsed-time hook ────────────────────────────────────────────────────
function useElapsed(startedAt: number | null): string {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  if (!startedAt) return ''
  const secs = Math.floor((Date.now() - startedAt) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ─── Pipeline progress bar ────────────────────────────────────────────────
function PipelineProgressBar({ plan, doneAgents, activeAgentId, startedAt, isCCMode }: {
  plan: { agents: string[] } | null
  doneAgents: Set<string>
  activeAgentId: string | null
  startedAt: number | null
  isCCMode?: boolean
}) {
  const elapsed = useElapsed(startedAt)
  if (!plan) return null

  const total = plan.agents.length
  const done  = doneAgents.size
  // Give partial credit while an agent is active (animates from done→done+1 range)
  const pct = total === 0 ? 0 : Math.round(
    activeAgentId
      ? ((done + 0.5) / total) * 100
      : (done / total) * 100
  )
  const isComplete = done >= total && !activeAgentId
  const accent = isCCMode ? '#00d4ff' : '#6c63ff'
  const accentG = isCCMode ? '#00ff88' : '#a78bfa'

  // Current agent name for status line
  const curAg = activeAgentId
    ? (plan.agents.includes(activeAgentId) ? activeAgentId : 'aria')
    : null

  return (
    <div style={{
      padding:'6px 16px 8px',
      borderBottom:'1px solid var(--rim)',
      background: isComplete ? 'rgba(0,255,136,.04)' : 'rgba(0,0,0,.15)',
    }}>
      {/* Label row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color: isComplete ? 'var(--green)' : accent }}>
          {isComplete
            ? '✅ pipeline เสร็จแล้ว'
            : curAg
            ? `⚡ ${agentEmoji[curAg] ?? '🤖'} ${curAg.toUpperCase()} กำลังทำงาน…`
            : '🔮 ARIA กำลังวางแผน…'}
        </span>
        <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--dim)', display:'flex', gap:10 }}>
          <span style={{ color: isComplete ? 'var(--green)' : accent }}>{pct}%</span>
          <span>{done}/{total} steps</span>
          {elapsed && <span>{elapsed}</span>}
        </span>
      </div>
      {/* Bar */}
      <div style={{ height:4, borderRadius:3, background:'var(--hover)', overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${pct}%`,
          background: isComplete
            ? 'linear-gradient(90deg,#00ff88,#22d3ee)'
            : `linear-gradient(90deg,${accent},${accentG})`,
          transition: 'width .6s ease',
          boxShadow: isComplete ? '0 0 8px rgba(0,255,136,.5)' : `0 0 8px ${accent}88`,
        }} />
      </div>
    </div>
  )
}


// ─── Pipeline Track (visual node flow + progress bar) ────────────────────────
function PipelineTrack({ plan, doneAgents, activeAgentId, startedAt }: {
  plan: { agents: string[]; roles: string[]; summary: string } | null
  doneAgents: Set<string>
  activeAgentId: string | null
  startedAt: number | null
}) {
  const elapsed = useElapsed(startedAt)
  if (!plan) return null

  const total = plan.agents.length
  const done  = doneAgents.size
  const pct   = total === 0 ? 0 : Math.round(
    activeAgentId ? ((done + 0.5) / total) * 100 : (done / total) * 100
  )
  const isComplete = done >= total && !activeAgentId

  return (
    <div style={{
      padding: '10px 16px 12px',
      borderBottom: '1px solid var(--rim)',
      background: isComplete ? 'rgba(0,255,136,.03)' : 'rgba(0,0,0,.2)',
    }}>
      {/* Node flow track */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:8 }}>
        {plan.agents.map((agId, i) => {
          const ag = agents.find(a => a.id === agId)
          const isDone = doneAgents.has(agId)
          const isActive = activeAgentId === agId
          const role = plan.roles?.[i] ?? ''
          const col = isDone ? '#00ff88' : isActive ? '#00d4ff' : 'rgba(255,255,255,.25)'
          return (
            <div key={agId} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                padding:'6px 12px', borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                border: `1px solid ${isDone ? 'rgba(0,255,136,.4)' : isActive ? 'rgba(0,212,255,.5)' : 'rgba(255,255,255,.1)'}`,
                background: isDone ? 'rgba(0,255,136,.07)' : isActive ? 'rgba(0,212,255,.1)' : 'rgba(255,255,255,.03)',
                boxShadow: isActive ? '0 0 14px rgba(0,212,255,.25)' : 'none',
                transition:'all .3s',
                minWidth: 60,
              }}>
                <span style={{ fontSize:16 }}>{agentEmoji[agId] ?? '🤖'}</span>
                <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace", color: col }}>
                  {ag?.name ?? agId.toUpperCase()}
                  {isDone && ' ✓'}
                  {isActive && ' ⚡'}
                </span>
                {role && (
                  <span style={{ fontSize:8, color:'var(--dim)', textAlign:'center', maxWidth:72, lineHeight:1.3 }}>
                    {role}
                  </span>
                )}
              </div>
              {i < plan.agents.length - 1 && (
                <span style={{ fontSize:13, color: isDone ? '#00ff88' : 'rgba(255,255,255,.2)', flexShrink:0 }}>⟶</span>
              )}
            </div>
          )
        })}

        {/* Elapsed + step count badge */}
        <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
          <span style={{
            fontSize:9, fontFamily:"'Space Mono',monospace",
            padding:'2px 8px', borderRadius:10,
            background: isComplete ? 'rgba(0,255,136,.15)' : 'rgba(0,212,255,.1)',
            color: isComplete ? '#00ff88' : '#00d4ff',
            border: `1px solid ${isComplete ? 'rgba(0,255,136,.3)' : 'rgba(0,212,255,.25)'}`,
          }}>
            {done}/{total} {isComplete ? '✓ done' : activeAgentId ? '⚡ running' : '…'}
          </span>
          {elapsed && <span style={{ fontSize:8, color:'var(--dim)', fontFamily:"'Space Mono',monospace" }}>{elapsed}</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, borderRadius:3, background:'rgba(255,255,255,.07)', overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:3, width:`${pct}%`,
          background: isComplete
            ? 'linear-gradient(90deg,#00ff88,#22d3ee)'
            : 'linear-gradient(90deg,#00d4ff,#00ff88)',
          transition:'width .6s ease',
          boxShadow: isComplete ? '0 0 8px rgba(0,255,136,.5)' : '0 0 8px rgba(0,212,255,.4)',
        }} />
      </div>
    </div>
  )
}

// ─── Clipboard helper ─────────────────────────────────────────────────────
function copyText(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

// ─── Code Block (inside agent text) ───────────────────────────────────────
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ margin:'8px 0', borderRadius:8, overflow:'hidden', border:'1px solid rgba(108,99,255,.3)', background:'rgba(0,0,0,.4)' }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'4px 10px', background:'rgba(108,99,255,.14)', borderBottom:'1px solid rgba(108,99,255,.18)',
      }}>
        <span style={{ fontSize:9, fontFamily:"'Space Mono',monospace", color:'var(--purple)', textTransform:'uppercase', letterSpacing:1 }}>
          {lang || 'code'}
        </span>
        <button
          onClick={() => { copyText(code); setCopied(true); setTimeout(() => setCopied(false), 1600) }}
          style={{
            fontSize:9, padding:'2px 8px', borderRadius:4, border:'none', cursor:'pointer',
            background: copied ? 'rgba(0,255,136,.2)' : 'rgba(108,99,255,.2)',
            color: copied ? 'var(--green)' : 'var(--purple)',
            fontFamily:"'Space Mono',monospace", transition:'all .15s',
          }}
        >{copied ? '✓ copied' : '⎘ copy'}</button>
      </div>
      <pre style={{
        margin:0, padding:'10px 14px', fontSize:11.5, lineHeight:1.65,
        fontFamily:"'Space Mono',monospace", color:'#c9d1d9',
        overflowX:'auto', whiteSpace:'pre',
      }}>{code}</pre>
    </div>
  )
}

function renderInlineText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /`([^`\n]+)`/g
  let last = 0; let m; let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>)
    parts.push(
      <code key={k++} style={{
        fontFamily:"'Space Mono',monospace", fontSize:'0.88em',
        padding:'1px 5px', borderRadius:4,
        background:'rgba(108,99,255,.2)', color:'#c9d1d9',
      }}>{m[1]}</code>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>)
  return parts
}

function RenderText({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0; let m; let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const before = text.slice(last, m.index)
      parts.push(<p key={k++} style={{ margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.65 }}>{renderInlineText(before)}</p>)
    }
    parts.push(<CodeBlock key={k++} lang={m[1]} code={m[2].trimEnd()} />)
    last = m.index + m[0].length
  }
  if (last < text.length) {
    parts.push(<p key={k++} style={{ margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.65 }}>{renderInlineText(text.slice(last))}</p>)
  }
  return <>{parts}</>
}

// ─── ARIA Summary Card ─────────────────────────────────────────────────────
function ARIASummaryCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{
      borderRadius:12, overflow:'hidden',
      border:'1px solid rgba(0,255,136,.3)',
      background:'linear-gradient(135deg,rgba(0,255,136,.06),rgba(108,99,255,.06))',
      boxShadow:'0 0 20px rgba(0,255,136,.08)',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8, justifyContent:'space-between',
        padding:'7px 12px', background:'rgba(0,255,136,.1)', borderBottom:'1px solid rgba(0,255,136,.2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12 }}>🔮</span>
          <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--green)', fontWeight:700, letterSpacing:1 }}>
            ARIA · PIPELINE SUMMARY
          </span>
        </div>
        <button
          onClick={() => { copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) }}
          style={{
            fontSize:9, padding:'2px 8px', borderRadius:4, border:'none', cursor:'pointer',
            background: copied ? 'rgba(0,255,136,.25)' : 'rgba(0,255,136,.12)',
            color: copied ? '#00ff88' : 'rgba(0,255,136,.7)',
            fontFamily:"'Space Mono',monospace", transition:'all .15s',
          }}
        >{copied ? '✓ copied' : '⎘ copy'}</button>
      </div>
      <div style={{ padding:'10px 14px' }}>
        <p style={{ margin:0, fontSize:13, lineHeight:1.75, color:'var(--text)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── Tool Call Block ──────────────────────────────────────────────────────
function ToolCallBlock({ event, result }: {
  event: AgentEvent & { type: 'tool_call' }
  result?: AgentEvent & { type: 'tool_result' }
}) {
  const [open, setOpen] = useState(false)
  const icon = toolIcons[event.toolName] ?? '🔧'
  const inputStr = JSON.stringify(event.input, null, 0)
  const shortInput = inputStr.length > 60 ? inputStr.slice(0, 60) + '…' : inputStr

  return (
    <div style={{
      margin:'4px 0', borderRadius:8, overflow:'hidden',
      border: result
        ? `1px solid ${result.success ? 'rgba(0,255,136,.25)' : 'rgba(255,68,102,.25)'}`
        : '1px solid rgba(108,99,255,.25)',
      background: result
        ? (result.success ? 'rgba(0,255,136,.04)' : 'rgba(255,68,102,.04)')
        : 'rgba(108,99,255,.05)',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', padding:'6px 10px', background:'transparent', border:'none',
        display:'flex', alignItems:'center', gap:8, cursor:'pointer', textAlign:'left',
      }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{
          fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:600,
          color: result ? (result.success ? 'var(--green)' : 'var(--red)') : 'var(--purple)',
        }}>{event.toolName}</span>
        <span style={{ fontSize:10, color:'var(--dim)', fontFamily:"'Space Mono',monospace", flex:1 }}>
          {shortInput}
        </span>
        {!result && <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--cyan)', animation:'glow-pulse 1s ease-in-out infinite', flexShrink:0 }}/>}
        {result && <span style={{ fontSize:10, color: result.success ? 'var(--green)' : 'var(--red)' }}>{result.success ? '✓' : '✗'}</span>}
        <span style={{ fontSize:9, color:'var(--dim)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding:'0 10px 10px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <p style={{ fontSize:9, color:'var(--dim)', fontFamily:"'Space Mono',monospace", marginBottom:4 }}>INPUT</p>
          <pre style={{ fontSize:10, color:'var(--muted)', fontFamily:"'Space Mono',monospace", whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>
            {JSON.stringify(event.input, null, 2)}
          </pre>
          {result && <>
            <p style={{ fontSize:9, color:'var(--dim)', fontFamily:"'Space Mono',monospace", marginTop:8, marginBottom:4 }}>OUTPUT</p>
            <pre style={{ fontSize:10, color: result.success ? 'var(--green)' : 'var(--red)', fontFamily:"'Space Mono',monospace", whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>
              {result.result}
            </pre>
          </>}
        </div>
      )}
    </div>
  )
}

// ─── Agent Turn ───────────────────────────────────────────────────────────
function AgentTurn({ turn, isActive, isCCMode }: { turn: Turn; isActive?: boolean; isCCMode?: boolean }) {
  const ag = agents.find(a => a.id === turn.agentId)
  const emoji = turn.agentId ? (agentEmoji[turn.agentId] ?? '🤖') : '👑'
  const toolCalls = (turn.events ?? []).filter(e => e.type === 'tool_call') as (AgentEvent & { type: 'tool_call' })[]
  const toolResults = (turn.events ?? []).filter(e => e.type === 'tool_result') as (AgentEvent & { type: 'tool_result' })[]

  // CC mode uses cyan accent
  const accentColor = isCCMode ? 'var(--cyan)' : (ag?.color ?? 'var(--purple)')
  const accentHex = isCCMode ? '#00d4ff' : (ag?.color ?? '#6c63ff')

  return (
    <div style={{ display:'flex', flexDirection: turn.role === 'taec' ? 'row-reverse' : 'row', gap:8, alignItems:'flex-start' }}>
      <div style={{
        width:32, height:32, borderRadius:10, flexShrink:0,
        background: turn.role === 'taec'
          ? 'linear-gradient(135deg,rgba(255,215,0,.3),rgba(255,215,0,.15))'
          : `linear-gradient(135deg,${accentHex}44,${accentHex}22)`,
        border: turn.role === 'taec' ? '1px solid rgba(255,215,0,.4)' : `1px solid ${accentHex}44`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
        boxShadow: isActive ? `0 0 14px ${accentHex}66` : 'none',
        transition:'box-shadow .3s',
      }}>
        {emoji}
      </div>

      <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{
            fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace",
            color: turn.role === 'taec' ? 'rgba(255,215,0,.85)' : accentColor,
          }}>
            {turn.role === 'taec' ? 'TAEC' : (turn.agentId === 'cc' ? 'CC' : (ag?.name ?? (turn.agentId ?? '').toUpperCase()))}
          </span>
          {turn.pipelineRole && (
            <span style={{ fontSize:8, color:'var(--dim)', fontFamily:"'Space Mono',monospace", maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {turn.pipelineRole}
            </span>
          )}
          {!turn.pipelineRole && turn.role === 'agent' && ag && (
            <span style={{ fontSize:8, color:'var(--dim)', fontFamily:"'Space Mono',monospace" }}>{ag.title}</span>
          )}
          <span style={{ fontSize:8, color:'var(--dim)', fontFamily:"'Space Mono',monospace", marginLeft:'auto' }}>
            {turn.ts.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
          </span>
          {turn.isDone && <span style={{ fontSize:9, color:'var(--green)' }}>✓</span>}
          {isActive && <span style={{ fontSize:9, color: accentColor }}>⚡</span>}
        </div>

        {turn.isPending && !isActive && (
          <div style={{ padding:'8px 12px', borderRadius:10, background:'var(--hover)', border:'1px solid var(--rim)', opacity:.5 }}>
            <p style={{ fontSize:11, color:'var(--dim)', fontFamily:"'Space Mono',monospace" }}>รอรับงาน...</p>
          </div>
        )}

        {toolCalls.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {toolCalls.map(tc => (
              <ToolCallBlock key={tc.toolId} event={tc} result={toolResults.find(r => r.toolId === tc.toolId)} />
            ))}
          </div>
        )}

        {turn.text && (() => {
          // ARIA pipeline summary → special card
          const isARIASummary = turn.agentId === 'aria' && turn.isPipelineAgent && turn.pipelineRole?.includes('สรุป')
          if (isARIASummary) return <ARIASummaryCard key="aria-sum" text={turn.text} />
          return (
            <div style={{
              background: turn.role === 'taec'
                ? 'linear-gradient(135deg,rgba(255,215,0,.1),rgba(255,215,0,.05))'
                : `linear-gradient(135deg,${accentHex}0a,transparent)`,
              border: turn.role === 'taec' ? '1px solid rgba(255,215,0,.2)' : `1px solid ${accentHex}33`,
              borderRadius: turn.role === 'taec' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              padding:'9px 13px', fontSize:13, color:'var(--text)',
            }}>
              {turn.role === 'taec'
                ? <p style={{ margin:0, lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{turn.text}</p>
                : <RenderText text={turn.text} />
              }
            </div>
          )
        })()}

        {!turn.text && toolCalls.length === 0 && turn.role === 'agent' && !turn.isPending && (
          <div style={{ padding:'8px 12px', borderRadius:10, background:'var(--hover)', border:'1px solid var(--rim)' }}>
            <span style={{ display:'flex', gap:4, alignItems:'center' }}>
              <span className="typing-dot" style={{ animationDelay:'0s', background: accentColor }}/>
              <span className="typing-dot" style={{ animationDelay:'.2s', background: accentColor }}/>
              <span className="typing-dot" style={{ animationDelay:'.4s', background: accentColor }}/>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pipeline Plan Card ───────────────────────────────────────────────────
function PipelinePlanCard({
  plan, activeAgentId, doneAgents, isCCMode,
}: {
  plan: { agents: string[]; roles: string[]; summary: string }
  activeAgentId: string | null
  doneAgents: Set<string>
  isCCMode?: boolean
}) {
  const headerColor = isCCMode ? 'var(--cyan)' : 'var(--purple)'
  const headerBorder = isCCMode ? 'rgba(0,212,255,.25)' : 'rgba(108,99,255,.25)'

  return (
    <div style={{
      background:'var(--card)', borderRadius:12,
      border: `1px solid ${headerBorder}`, padding:'12px 14px', margin:'8px 0',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:12 }}>{isCCMode ? '⚡' : '🔮'}</span>
        <span style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color: headerColor, fontWeight:700, letterSpacing:1 }}>
          {isCCMode ? 'CC PIPELINE' : 'ARIA PIPELINE'}
        </span>
        <span style={{ fontSize:10, color:'var(--dim)', flex:1, marginLeft:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plan.summary}</span>
        {/* Step counter */}
        <span style={{
          fontSize:9, fontFamily:"'Space Mono',monospace",
          padding:'2px 8px', borderRadius:10,
          background: doneAgents.size === plan.agents.length ? 'rgba(0,255,136,.15)' : `rgba(${isCCMode ? '0,212,255' : '108,99,255'},.15)`,
          color: doneAgents.size === plan.agents.length ? 'var(--green)' : headerColor,
          border: `1px solid ${doneAgents.size === plan.agents.length ? 'rgba(0,255,136,.3)' : headerBorder}`,
          flexShrink:0,
        }}>
          {doneAgents.size}/{plan.agents.length}
          {doneAgents.size === plan.agents.length ? ' ✓' : activeAgentId ? ' ⚡' : ''}
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {plan.agents.map((agId, i) => {
          const ag = agents.find(a => a.id === agId)
          const isDone = doneAgents.has(agId)
          const isActive = activeAgentId === agId
          const col = ag?.color ?? (isCCMode ? '#00d4ff' : '#6c63ff')
          return (
            <div key={agId} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                padding:'4px 10px', borderRadius:8, fontSize:11, fontWeight:600,
                background: isDone ? `${col}20` : isActive ? `${col}35` : 'var(--hover)',
                border: `1px solid ${isDone || isActive ? col + '66' : 'transparent'}`,
                color: isDone || isActive ? col : 'var(--dim)',
                transition:'all .3s',
                boxShadow: isActive ? `0 0 12px ${col}44` : 'none',
              }}>
                {agentEmoji[agId] ?? '🤖'} {ag?.name ?? agId}
                {isDone && <span style={{ marginLeft:4 }}>✓</span>}
                {isActive && <span style={{ marginLeft:4, animation:'glow-pulse 1s infinite' }}>⚡</span>}
              </div>
              {i < plan.agents.length - 1 && (
                <span style={{ color: isDone ? 'var(--green)' : 'var(--dim)', fontSize:12 }}>→</span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
        {plan.agents.map((agId, i) => {
          const ag = agents.find(a => a.id === agId)
          const isActive = activeAgentId === agId
          const isDone = doneAgents.has(agId)
          const col = ag?.color ?? (isCCMode ? '#00d4ff' : '#6c63ff')
          return (
            <div key={agId} style={{
              fontSize:9, fontFamily:"'Space Mono',monospace",
              color: isActive ? col : isDone ? 'var(--green)' : 'var(--dim)',
              transition:'color .3s',
            }}>
              {agentEmoji[agId] ?? '🤖'} {ag?.name ?? agId}: {plan.roles[i]}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Chat History Panel ───────────────────────────────────────────────────
function ChatHistoryPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'sessions' | 'tasks'>('sessions')
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [taskLog, setTaskLog] = useState<TaskLogEntry[]>([])
  const [selectedSession, setSelectedSession] = useState<StoredSession | null>(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  useEffect(() => {
    void apiLoadSessions().then(s => setSessions([...s]))
    void apiLoadTaskLog().then(l => setTaskLog([...l]))
  }, [])

  async function selectSession(s: StoredSession) {
    setSelectedSession({ ...s, messages: [] })
    setLoadingMsgs(true)
    const messages = await apiLoadSessionMessages(s.id)
    setSelectedSession({ ...s, messages })
    setLoadingMsgs(false)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,.8)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'stretch', justifyContent:'flex-end',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width:680, background:'var(--panel)', borderLeft:'1px solid var(--rim)',
        display:'flex', flexDirection:'column', height:'100%',
        animation:'slideInRight .2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding:'14px 18px', borderBottom:'1px solid var(--rim)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{ fontSize:16 }}>📜</span>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', flex:1 }}>ประวัติการทำงาน</span>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', cursor:'pointer',
            color:'var(--dim)', fontSize:16, padding:'2px 6px', borderRadius:4,
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--rim)' }}>
          {[['sessions','💬 Sessions'],['tasks','📋 Task Log']] .map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id as 'sessions' | 'tasks'); setSelectedSession(null) }} style={{
              flex:1, padding:'9px', border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
              background: tab === id ? 'rgba(108,99,255,.1)' : 'transparent',
              color: tab === id ? 'var(--purple)' : 'var(--dim)',
              borderBottom: tab === id ? '2px solid var(--purple)' : '2px solid transparent',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {/* List */}
          <div style={{ width:220, borderRight:'1px solid var(--rim)', overflowY:'auto', flexShrink:0 }}>
            {tab === 'sessions' && (sessions.length === 0 ? (
              <p style={{ padding:'20px 14px', fontSize:11, color:'var(--dim)', textAlign:'center' }}>ยังไม่มีประวัติ</p>
            ) : sessions.map(s => (
              <button key={s.id} onClick={() => void selectSession(s)} style={{
                width:'100%', padding:'10px 12px', border:'none', cursor:'pointer', textAlign:'left',
                background: selectedSession?.id === s.id ? 'rgba(108,99,255,.12)' : 'transparent',
                borderBottom:'1px solid var(--rim)', transition:'background .1s',
              }}>
                <div style={{ fontSize:11, color: selectedSession?.id === s.id ? 'var(--purple)' : 'var(--text)', fontWeight:600, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {s.title.slice(0, 32)}{s.title.length > 32 ? '…' : ''}
                </div>
                <div style={{ fontSize:9, color:'var(--dim)', fontFamily:"'Space Mono',monospace" }}>
                  {new Date(s.startedAt).toLocaleDateString('th-TH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  {' · '}{s.mode.toUpperCase()} · {s.messages.length} msgs
                </div>
                {s.taskSummary && (
                  <div style={{ fontSize:9, color:'var(--green)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    ✅ {s.taskSummary.slice(0, 40)}
                  </div>
                )}
              </button>
            )))}
            {tab === 'tasks' && (taskLog.length === 0 ? (
              <p style={{ padding:'20px 14px', fontSize:11, color:'var(--dim)', textAlign:'center' }}>ยังไม่มี task log</p>
            ) : taskLog.map(t => (
              <div key={t.id} style={{ padding:'10px 12px', borderBottom:'1px solid var(--rim)' }}>
                <div style={{ fontSize:11, color:'var(--text)', fontWeight:600, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {t.title.slice(0, 32)}{t.title.length > 32 ? '…' : ''}
                </div>
                <div style={{ fontSize:9, color:'var(--dim)', fontFamily:"'Space Mono',monospace", marginBottom:4 }}>
                  {new Date(t.ts).toLocaleDateString('th-TH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  {' · '}{t.mode.toUpperCase()}
                </div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:4 }}>
                  {t.agents.map(a => (
                    <span key={a} style={{ fontSize:8, padding:'1px 5px', borderRadius:3, background:'rgba(108,99,255,.15)', color:'var(--purple)', fontFamily:"'Space Mono',monospace" }}>
                      {agentEmoji[a] ?? '🤖'} {a}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{t.summary}</div>
              </div>
            )))}
          </div>

          {/* Session viewer */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
            {!selectedSession && tab === 'sessions' && (
              <p style={{ fontSize:11, color:'var(--dim)', textAlign:'center', paddingTop:40 }}>เลือก session เพื่อดูประวัติ</p>
            )}
            {selectedSession && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.2)' }}>
                  <div style={{ fontSize:11, color:'var(--purple)', fontWeight:700 }}>{selectedSession.title}</div>
                  <div style={{ fontSize:9, color:'var(--dim)', marginTop:2 }}>
                    {new Date(selectedSession.startedAt).toLocaleString('th-TH')} · {selectedSession.mode.toUpperCase()}
                  </div>
                </div>
                {loadingMsgs && (
                  <p style={{ fontSize:11, color:'var(--dim)', textAlign:'center', fontFamily:"'Space Mono',monospace" }}>Loading messages...</p>
                )}
                {!loadingMsgs && selectedSession.messages.map((m, i) => (
                  <div key={i} style={{
                    padding:'8px 12px', borderRadius:10, fontSize:12, lineHeight:1.6,
                    background: m.role === 'user' ? 'rgba(255,215,0,.07)' : 'rgba(108,99,255,.05)',
                    border: m.role === 'user' ? '1px solid rgba(255,215,0,.15)' : '1px solid rgba(108,99,255,.15)',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth:'90%',
                  }}>
                    <div style={{ fontSize:9, color:'var(--dim)', marginBottom:4, fontFamily:"'Space Mono',monospace" }}>
                      {m.role === 'user' ? 'TAEC' : (m.agentId ?? 'AGENT').toUpperCase()} · {new Date(m.ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                    </div>
                    <p style={{ margin:0, color:'var(--text)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{m.text}</p>
                  </div>
                ))}
                {selectedSession.taskSummary && (
                  <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(0,255,136,.06)', border:'1px solid rgba(0,255,136,.2)' }}>
                    <div style={{ fontSize:9, color:'var(--green)', fontWeight:700, marginBottom:4 }}>🔮 ARIA สรุป</div>
                    <p style={{ margin:0, fontSize:11, color:'var(--muted)', whiteSpace:'pre-wrap' }}>{selectedSession.taskSummary}</p>
                  </div>
                )}
              </div>
            )}
            {tab === 'tasks' && (
              <p style={{ fontSize:11, color:'var(--dim)', textAlign:'center', paddingTop:40 }}>ดู Task Log ทางซ้าย</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main AgentChat ───────────────────────────────────────────────────────
// ─── Quick Templates ─────────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { icon: '🔍', label: 'Review changes',   prompt: 'Review โค้ดที่เปลี่ยนล่าสุด บอกว่ามี bug หรือ issue อะไรบ้าง' },
  { icon: '🧪', label: 'Write tests',      prompt: 'เขียน unit test สำหรับไฟล์ที่แก้ล่าสุด ครอบคลุม edge cases' },
  { icon: '📐', label: 'Explain arch',     prompt: 'อธิบาย architecture และ structure ของ project นี้ให้เข้าใจง่าย' },
  { icon: '🐛', label: 'Fix TS errors',    prompt: 'ตรวจสอบและแก้ TypeScript errors ทั้งหมดใน project' },
  { icon: '♻️', label: 'Refactor',         prompt: 'Refactor โค้ดให้ clean ขึ้น ลด duplication และ improve readability' },
  { icon: '🔒', label: 'Security audit',   prompt: 'ทำ security review — หา vulnerabilities และช่องโหว่' },
]

export default function AgentChat({ projectContext = '', workDir, workspaceContext, docContext }: { projectContext?: string; workDir?: string; workspaceContext?: string; docContext?: string | null }) {
  const [selectedAgent, setSelectedAgent] = useState('cc')
  // Restore from global state if CC was running while user navigated away
  const [turns, setTurns] = useState<Turn[]>(_g.turns)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(_isRunningGlobally)

  // Request notification permission + handle pending prompts from Command Palette
  useEffect(() => {
    // Request browser notification permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    // Pick up pending prompt from Command Palette / sessionStorage
    const pending = sessionStorage.getItem('nexmind_pending_prompt')
    if (pending) {
      sessionStorage.removeItem('nexmind_pending_prompt')
      setInput(pending)
    }
    // Live template injection (when already on the page)
    function onTemplate(e: Event) {
      const prompt = (e as CustomEvent<string>).detail
      setInput(prompt)
    }
    window.addEventListener('nexmind:send-template', onTemplate)
    return () => window.removeEventListener('nexmind:send-template', onTemplate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [pipelinePlan, setPipelinePlan] = useState(_g.pipelinePlan)
  const [activeAgentId, setActiveAgentId] = useState(_g.activeAgentId)
  const [doneAgents, setDoneAgents] = useState<Set<string>>(_g.doneAgents)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const runningRef = useRef(_isRunningGlobally)
  const agentTurnMapRef = useRef<Record<string, string>>(_g.agentTurnMap)
  const currentTurnIdRef = useRef<string>(_g.currentTurnId)
  const fullHistoryRef = useRef<unknown[]>([])
  const ccSessionIdRef = useRef<string | null>(null)
  const pipelineContextRef = useRef<string>(_g.pipelineContext)
  const currentSessionRef = useRef<StoredSession | null>(null)
  const pipelineAgentsRef = useRef<string[]>([])

  const [showHistory, setShowHistory] = useState(false)

  // Register with the module-level _onUpdate so this component gets live events
  // from any pipeline that started before this component mounted (navigation case).
  // _onUpdate reads from _g (always current) and pushes into this component's state.
  useEffect(() => {
    _onUpdate = () => {
      setTurns([..._g.turns])
      setPipelinePlan(_g.pipelinePlan ? { ..._g.pipelinePlan } : null)
      setActiveAgentId(_g.activeAgentId)
      setDoneAgents(new Set(_g.doneAgents))
      if (_isRunningGlobally !== runningRef.current) setRunning(_isRunningGlobally)
    }
    // Initial sync in case pipeline progressed while we were on another page
    _onUpdate()
    return () => { _onUpdate = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  // ─── Session helpers ────────────────────────────────────────────────────
  const startSession = useCallback((firstMessage: string, mode: string) => {
    const session: StoredSession = {
      id: Date.now().toString(),
      title: firstMessage,
      startedAt: new Date().toISOString(),
      mode,
      messages: [{ role: 'user', text: firstMessage, ts: new Date().toISOString() }],
    }
    currentSessionRef.current = session
    // Persist new session to SQLite (fire-and-forget)
    apiUpsertSession(session)
    apiAppendCCMessage(session.id, { role: 'user', text: firstMessage, ts: new Date().toISOString() })
    return session
  }, [])

  const appendToSession = useCallback((msg: StoredMessage) => {
    if (!currentSessionRef.current) return
    currentSessionRef.current.messages.push(msg)
    // Persist message to SQLite (fire-and-forget)
    apiAppendCCMessage(currentSessionRef.current.id, msg)
  }, [])

  const saveCurrentSession = useCallback((taskSummary?: string) => {
    const session = currentSessionRef.current
    if (!session) return
    if (taskSummary) session.taskSummary = taskSummary
    // Upsert session metadata to SQLite (fire-and-forget)
    apiUpsertSession(session)
  }, [])

  const addTaskLog = useCallback((title: string, agents: string[], summary: string, mode: string) => {
    apiAddTaskLog({ id: Date.now().toString(), ts: new Date().toISOString(), title, agents, summary, mode })
  }, [])

  function clearChat() {
    setTurns([])
    setPipelinePlan(null)
    setActiveAgentId(null)
    setDoneAgents(new Set())
    fullHistoryRef.current = []
    agentTurnMapRef.current = {}
    currentTurnIdRef.current = ''
    ccSessionIdRef.current = null
    pipelineContextRef.current = ''
    currentSessionRef.current = null
    pipelineAgentsRef.current = []
    // Reset global store
    Object.assign(_g, { turns:[], pipelinePlan:null, activeAgentId:null, doneAgents:new Set(),
      agentTurnMap:{}, currentTurnId:'', pipelineContext:'', pipelineAgents:[], pipelineStartedAt:null })
  }

  const devAgents = agents.filter(a =>
    ['nova','byte','rex','forge','zeta','luna','pixel','scout','ink','hawk','sage','atlas','coin','nexus','memo'].includes(a.id)
  )
  const agentInfo = agents.find(a => a.id === selectedAgent)
  const isAutoMode = false  // AUTO merged into CC — no longer a separate mode
  const isCCMode = selectedAgent === 'cc' || selectedAgent === 'auto'

  const examples = [
    'เปลี่ยนธีมเป็นโทนสีอุ่น warm amber',
    'เพิ่มหน้า analytics dashboard',
    'สร้าง API endpoint สำหรับ user stats',
    'ทำ animation พวก card hover effects',
    'fix TypeScript errors ทั้งหมด',
    'วิเคราะห์ codebase แล้วบอก improvements',
  ]

  // ─── Shared pipeline event handler ───────────────────────────────────────
  // ─── Pipeline event handler ─────────────────────────────────────────────
  // IMPORTANT: We mutate _g directly (not via React's functional updater) so
  // the state is always current even when this component is unmounted.  After
  // every mutation we call _onUpdate?.() — the newly-mounted component registers
  // that callback so it gets live updates even from a pipeline started before it
  // mounted (i.e. user navigated away and back mid-run).
  const handlePipelineEvent = useCallback((ev: Record<string, unknown>) => {
    if (ev.type === 'pipeline_plan') {
      const planEv = ev as { type: string; agents: string[]; roles: string[]; summary: string }
      // ── direct _g mutation ──
      _g.pipelinePlan = planEv
      pipelineAgentsRef.current = _g.pipelineAgents = planEv.agents
      if (_g.currentTurnId.startsWith('planning_')) {
        _g.turns = _g.turns.filter(t => t.id !== _g.currentTurnId)
        currentTurnIdRef.current = _g.currentTurnId = ''
      }
      const newTurns: Turn[] = planEv.agents.map((agId, i) => {
        const id = `pipeline_${agId}_${Date.now() + i}`
        agentTurnMapRef.current[agId] = _g.agentTurnMap[agId] = id
        return { id, role: 'agent', agentId: agId, text: '', events: [], ts: new Date(),
          pipelineRole: planEv.roles[i], isPipelineAgent: true, isPending: true, isDone: false }
      })
      _g.turns = [..._g.turns, ...newTurns]

    } else if (ev.type === 'agent_start') {
      const agId = ev.agentId as string
      _g.activeAgentId = agId
      if (agId === 'aria_summary') {
        const sid = `aria_summary_${Date.now()}`
        agentTurnMapRef.current['aria_summary'] = _g.agentTurnMap['aria_summary'] = sid
        _g.turns = [..._g.turns, { id: sid, role: 'agent', agentId: 'aria',
          text: '', events: [], ts: new Date(), pipelineRole: '🔮 ARIA สรุปผลงาน',
          isPipelineAgent: true, isPending: false, isDone: false }]
      } else {
        _g.turns = _g.turns.map(t =>
          t.id === _g.agentTurnMap[agId] ? { ...t, isPending: false } : t)
      }

    } else if (ev.type === 'agent_done') {
      const agId = ev.agentId as string
      _g.doneAgents = new Set([..._g.doneAgents, agId])
      _g.activeAgentId = null
      _g.turns = _g.turns.map(t =>
        t.id === _g.agentTurnMap[agId] ? { ...t, isDone: true } : t)

    } else if (ev.type === 'aria_summary_done') {
      const summary = ev.summary as string
      pipelineContextRef.current = _g.pipelineContext = summary
      saveCurrentSession(summary)
      addTaskLog(currentSessionRef.current?.title ?? '', pipelineAgentsRef.current, summary, 'cc')
      notifyPipelineDone(summary)

    } else if (ev.type === 'text') {
      const agId = ev.agentId as string | undefined
      const targetId = agId ? (_g.agentTurnMap[agId] ?? _g.currentTurnId) : _g.currentTurnId
      if (targetId) {
        _g.turns = _g.turns.map(t =>
          t.id === targetId ? { ...t, text: (t.text ?? '') + (ev.text as string) } : t)
        if (agId && (ev.text as string).length > 0)
          appendToSession({ role: 'agent', agentId: agId, text: ev.text as string, ts: new Date().toISOString() })
      }

    } else if (ev.type === 'tool_call' || ev.type === 'tool_result') {
      const agId = ev.agentId as string | undefined
      const targetId = agId ? (_g.agentTurnMap[agId] ?? _g.currentTurnId) : _g.currentTurnId
      if (targetId)
        _g.turns = _g.turns.map(t =>
          t.id === targetId ? { ...t, events: [...(t.events ?? []), ev as AgentEvent] } : t)

    } else if (ev.type === 'cc_result') {
      if (ev.sessionId) ccSessionIdRef.current = ev.sessionId as string
      if (!ev.isPipeline) {
        const summary = `\n\n---\n✅ Done · ${ev.turns} turns${ev.cost ? ` · $${(ev.cost as number).toFixed(4)}` : ''}`
        if (_g.currentTurnId)
          _g.turns = _g.turns.map(t =>
            t.id === _g.currentTurnId ? { ...t, text: (t.text ?? '') + summary } : t)
        saveCurrentSession()
      }

    } else if (ev.type === 'status') {
      if (!_g.currentTurnId || !_g.currentTurnId.startsWith('planning_')) {
        const planId = `planning_${Date.now()}`
        currentTurnIdRef.current = _g.currentTurnId = planId
        _g.turns = [..._g.turns, { id: planId, role: 'agent', agentId: 'aria',
          text: `🔮 ${ev.text as string}`, events: [], ts: new Date() }]
      }

    } else if (ev.type === 'error') {
      const agId = ev.agentId as string | undefined
      const targetId = agId ? (_g.agentTurnMap[agId] ?? _g.currentTurnId) : _g.currentTurnId
      if (targetId)
        _g.turns = _g.turns.map(t =>
          t.id === targetId ? { ...t, text: `❌ ${ev.error as string}` } : t)
    }

    // Notify the currently-mounted component (may be a different instance from
    // when this pipeline started, e.g. after page navigation).
    _onUpdate?.()
  }, [saveCurrentSession, addTaskLog, appendToSession])

  // ─── CC Pipeline mode ─────────────────────────────────────────────────────
  async function sendCCPipeline(text: string) {
    const abort = new AbortController()
    abortRef.current = abort
    _globalAbort = abort
    _g.pipelineStartedAt = Date.now()
    emitCCStatus(true)

    try {
      const res = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pipeline: true,
          // Pass previous pipeline summary so ARIA has memory
          pipelineContext: pipelineContextRef.current || null,
          // Active workspace working directory + context (if set)
          ...(workDir ? { workDir } : {}),
          ...(workspaceContext ? { workspaceContext } : {}),
          ...(docContext ? { docContext } : {}),
        }),
        signal: abort.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { await reader.cancel(); break }
          try {
            const ev = JSON.parse(data) as Record<string, unknown>
            handlePipelineEvent(ev)
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const targetId = _g.currentTurnId
        if (targetId) {
          _g.turns = _g.turns.map(t =>
            t.id === targetId ? { ...t, text: `❌ ${err.message}` } : t)
          _onUpdate?.()
        }
      }
    } finally {
      _g.pipelineStartedAt = null
      emitCCStatus(false)
      _globalAbort = null
      setRunning(false)
      _onUpdate?.()
    }
  }

  // ─── Single-agent API mode ────────────────────────────────────────────────
  async function send() {
    if (!input.trim() || running) return
    const text = input.trim()
    setInput('')
    setRunning(true)
    setPipelinePlan(null)
    setActiveAgentId(null)
    setDoneAgents(new Set())
    agentTurnMapRef.current = {}

    const taecTurn: Turn = { id: Date.now().toString(), role: 'taec', text, ts: new Date() }
    _g.turns = [..._g.turns, taecTurn]
    setTurns([..._g.turns])

    // CC Pipeline mode
    if (isCCMode) {
      // Start or append to session
      if (!currentSessionRef.current) {
        startSession(text, 'cc')
      } else {
        appendToSession({ role: 'user', text, ts: new Date().toISOString() })
        saveCurrentSession()
      }
      await sendCCPipeline(text)
      setRunning(false)
      return
    }

    const abort = new AbortController()
    abortRef.current = abort

    if (!isAutoMode) {
      const agentTurnId = (Date.now() + 1).toString()
      currentTurnIdRef.current = agentTurnId
      setTurns(prev => [...prev, {
        id: agentTurnId, role: 'agent', agentId: selectedAgent, text: '', events: [], ts: new Date(),
      }])
    }

    const history = turns.map(t => ({ role: t.role, content: t.text ?? '' }))

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentId: isAutoMode ? 'auto' : selectedAgent,
          history,
          fullHistory: isAutoMode ? undefined : (fullHistoryRef.current.length ? fullHistoryRef.current : undefined),
          projectContext,
        }),
        signal: abort.signal,
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const ev = JSON.parse(data) as Record<string, unknown>
            if (ev.type === 'pipeline_plan') {
              handlePipelineEvent(ev)
            } else if (ev.type === 'agent_start') {
              handlePipelineEvent(ev)
            } else if (ev.type === 'agent_done') {
              handlePipelineEvent(ev)
            } else if (ev.type === 'text') {
              const agId = ev.agentId as string | undefined
              const targetId = agId ? (agentTurnMapRef.current[agId] ?? currentTurnIdRef.current) : currentTurnIdRef.current
              setTurns(prev => prev.map(t =>
                t.id === targetId ? { ...t, text: (t.text ?? '') + (ev.text as string) } : t
              ))
            } else if (ev.type === 'tool_call' || ev.type === 'tool_result') {
              const agId = ev.agentId as string | undefined
              const targetId = agId ? (agentTurnMapRef.current[agId] ?? currentTurnIdRef.current) : currentTurnIdRef.current
              setTurns(prev => prev.map(t =>
                t.id === targetId ? { ...t, events: [...(t.events ?? []), ev as AgentEvent] } : t
              ))
            } else if (ev.type === 'conversation_history') {
              fullHistoryRef.current = (ev as unknown as { messages: unknown[] }).messages
            } else if (ev.type === 'error') {
              handlePipelineEvent(ev)
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const targetId = currentTurnIdRef.current
        if (targetId) {
          setTurns(prev => prev.map(t =>
            t.id === targetId ? { ...t, text: `❌ ${err.message}` } : t
          ))
        }
      }
    } finally {
      setRunning(false)
      setActiveAgentId(null)
      abortRef.current = null
    }
  }

  // ─── Render pipeline turns ────────────────────────────────────────────────
  const renderTurns = () => {
    const elements: React.ReactNode[] = []
    let planRendered = false

    for (const turn of turns) {
      if (turn.role === 'taec') {
        elements.push(<AgentTurn key={turn.id} turn={turn} isCCMode={isCCMode} />)
        planRendered = false
        continue
      }

      if (turn.isPipelineAgent && !planRendered && pipelinePlan) {
        planRendered = true
        elements.push(
          <PipelinePlanCard
            key={`plan_${turn.id}`}
            plan={pipelinePlan}
            activeAgentId={activeAgentId}
            doneAgents={doneAgents}
            isCCMode={isCCMode}
          />
        )
      }

      elements.push(
        <AgentTurn
          key={turn.id}
          turn={turn}
          isActive={activeAgentId === turn.agentId && (turn.isPipelineAgent ?? false)}
          isCCMode={isCCMode}
        />
      )
    }
    return elements
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {showHistory && <ChatHistoryPanel onClose={() => setShowHistory(false)} />}

      {/* CC Header — clean, no agent switcher */}
      <div style={{
        padding:'10px 16px', borderBottom:'1px solid var(--rim)',
        display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <span style={{ fontSize:13 }}>⚡</span>
        <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", fontWeight:700, color:'var(--cyan)', letterSpacing:1 }}>
          CC PIPELINE
        </span>
        <span style={{ fontSize:11, color:'var(--dim)' }}>
          ARIA วางแผน → agents ทำงาน → Max plan
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={() => setShowHistory(true)} title="ประวัติการทำงาน" style={{
            padding:'4px 9px', borderRadius:6, border:'1px solid var(--rim)',
            background:'var(--hover)', color:'var(--muted)', fontSize:12, cursor:'pointer',
          }}>📜</button>
          <button onClick={clearChat} title="ล้าง chat" style={{
            padding:'4px 9px', borderRadius:6, border:'1px solid var(--rim)',
            background:'var(--hover)', color:'var(--muted)', fontSize:12, cursor:'pointer',
          }}>🗑</button>
        </div>
      </div>

      {/* Pipeline Track — shows node flow + progress when pipeline is active */}
      {(pipelinePlan || _g.pipelinePlan) && (
        <PipelineTrack
          plan={pipelinePlan ?? _g.pipelinePlan}
          doneAgents={doneAgents}
          activeAgentId={activeAgentId}
          startedAt={_g.pipelineStartedAt}
        />
      )}

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
        {turns.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px 20px' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>⚡</div>
            <p style={{ fontWeight:700, fontSize:15, marginBottom:4, color:'var(--cyan)' }}>
              CC Pipeline Mode
            </p>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
              ARIA วางแผน → agents ทำงาน → สรุปผล
            </p>
            <p style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>
              ✅ ไม่ใช้ API key · Claude Max · ARIA สรุปทุก pipeline
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
              {[
                'เปลี่ยนธีมเป็นโทนสีอุ่น warm amber',
                'เพิ่มหน้า analytics dashboard',
                'สร้าง API endpoint สำหรับ user stats',
                'ทำ animation พวก card hover effects',
                'fix TypeScript errors ทั้งหมด',
                'วิเคราะห์ codebase แล้วบอก improvements',
              ].map(ex => (
                <button key={ex} onClick={() => setInput(ex)} style={{
                  fontSize:11, padding:'6px 12px', borderRadius:8,
                  border: `1px solid ${isCCMode ? 'rgba(0,212,255,.25)' : 'var(--rim)'}`,
                  background: isCCMode ? 'rgba(0,212,255,.06)' : 'var(--hover)',
                  color: isCCMode ? 'var(--cyan)' : 'var(--muted)',
                  cursor:'pointer',
                }}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {renderTurns()}
        <div ref={bottomRef}/>
      </div>

      {/* Template quick-bar — CC mode only */}
      {isCCMode && !running && (
        <div style={{
          padding: '6px 14px 0',
          display: 'flex', gap: 5, overflowX: 'auto',
          borderTop: '1px solid var(--rim)',
          scrollbarWidth: 'none',
        }}>
          {QUICK_TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => setInput(t.prompt)}
              title={t.prompt}
              style={{
                padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                border: '1px solid var(--rim)',
                background: 'transparent',
                color: 'var(--dim)', cursor: 'pointer',
                fontSize: 10, whiteSpace: 'nowrap',
                fontFamily: "'Space Mono', monospace",
                transition: 'all .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,212,255,.5)'
                e.currentTarget.style.color = 'rgba(0,212,255,.85)'
                e.currentTarget.style.background = 'rgba(0,212,255,.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--rim)'
                e.currentTarget.style.color = 'var(--dim)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'10px 14px', borderTop: isCCMode && !running ? 'none' : '1px solid var(--rim)', display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
          placeholder={
            isCCMode
              ? 'CC Pipeline — ARIA จะเลือก agents ให้เอง... (Enter=ส่ง, Shift+Enter=ขึ้นบรรทัด)'
              : isAutoMode
              ? 'AUTO mode — ARIA เลือก agents ให้... (Enter=ส่ง)'
              : `${agentInfo?.name} — จะอ่าน/เขียนไฟล์... (Enter=ส่ง)`
          }
          disabled={running}
          rows={1}
          style={{
            flex:1, padding:'10px 14px', borderRadius:10,
            background:'var(--panel)',
            border:`1px solid ${running ? (isCCMode ? 'rgba(0,212,255,.3)' : 'var(--rim)') : 'var(--rim)'}`,
            color:'var(--text)', fontSize:13, outline:'none', fontFamily:'inherit',
            opacity: running ? .7 : 1,
            transition:'border-color .18s',
            resize:'none', overflowY:'hidden', lineHeight:1.5, minHeight:42,
          }}
        />
        <button
          onClick={send}
          disabled={running || !input.trim()}
          style={{
            padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer', flexShrink:0, alignSelf:'flex-end',
            background: running || !input.trim()
              ? 'var(--hover)'
              : isCCMode
              ? 'linear-gradient(135deg,rgba(0,212,255,.8),rgba(0,255,136,.6))'
              : 'linear-gradient(135deg,rgba(108,99,255,.8),rgba(139,91,246,.6))',
            color: running || !input.trim() ? 'var(--dim)' : '#fff',
            fontSize:13, fontWeight:700, transition:'all .15s',
            boxShadow: running || !input.trim() ? 'none' : isCCMode ? '0 0 12px rgba(0,212,255,.3)' : '0 0 12px rgba(108,99,255,.3)',
          }}
        >
          {running ? '...' : '→'}
        </button>
        {running && (
          <button
            onClick={() => {
              _globalAbort?.abort()
              _globalAbort = null
              emitCCStatus(false)
              setRunning(false)
            }}
            style={{
              padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,80,80,.35)',
              background:'rgba(255,80,80,.1)', color:'#ff5050', fontSize:12,
              cursor:'pointer', fontWeight:700, flexShrink:0, alignSelf:'flex-end',
            }}
          >
            ✕ หยุด
          </button>
        )}
      </div>
    </div>
  )
}
