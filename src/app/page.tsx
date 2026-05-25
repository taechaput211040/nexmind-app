'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { agents, logEntries } from '@/data/agents'
import StatCard, { type StatCardData } from '@/components/StatCard'

const statCards: StatCardData[] = [
  { label: 'Active Agents',     value: 12,    prefix: '',  unit: 'of 26 total',     icon: '👥', accent: 'var(--magic-purple)', glow: 'var(--magic-glow-purple)' },
  { label: 'Pending Quests',    value: 8,     prefix: '',  unit: 'needs approval',  icon: '📋', accent: 'var(--magic-pink)',   glow: 'var(--magic-glow-pink)' },
  { label: 'Missions Done',     value: 7,     prefix: '',  unit: 'completed today', icon: '✅', accent: 'var(--magic-cyan)',   glow: 'var(--magic-glow-cyan)' },
  { label: 'Revenue This Week', value: 24800, prefix: '฿', unit: '+12% vs last wk', icon: '💰', accent: 'var(--arcane-gold)',  glow: 'var(--magic-glow-gold)' },
]

const agentById = Object.fromEntries(agents.map(a => [a.id, a]))

const logStatusColor: Record<string, string> = {
  success:     'var(--arcane-emerald)',
  in_progress: 'var(--magic-cyan)',
  failed:      'var(--magic-pink)',
}

const logTime = (ts: string) => ts.split(' ')[1] ?? ts

const glass: React.CSSProperties = {
  background: 'var(--magic-glass)',
  border: '1px solid var(--magic-glass-border)',
  boxShadow: 'var(--magic-glow-soft)',
  backdropFilter: 'blur(var(--magic-glass-blur))',
  WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
  borderRadius: 'var(--cmd-card-radius)',
}

export default function Dashboard() {
  const router = useRouter()
  const [cmd, setCmd] = useState('')
  const [time, setTime] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const onlineAgents = agents.filter(a => a.status === 'online')
  const busyAgents   = agents.filter(a => a.status === 'busy')
  const recentLogs   = logEntries.slice(0, 7)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nebula-bg)', padding: '32px clamp(20px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient nebula orbs */}
      <div style={{ position: 'fixed', top: -160, left: 40,  width: 560, height: 560, borderRadius: '50%', background: 'var(--magic-orb-1)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 18s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: -160, right: 40, width: 460, height: 460, borderRadius: '50%', background: 'var(--magic-orb-2)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 22s ease-in-out infinite reverse' }} />
      <div style={{ position: 'fixed', top: '40%', left: '45%', width: 380, height: 380, borderRadius: '50%', background: 'var(--magic-orb-3)', filter: 'blur(110px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 26s ease-in-out infinite' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', padding: '6px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--magic-cyan)', letterSpacing: 3, fontWeight: 700, textShadow: 'var(--magic-text-glow)' }}>⚡ NEXMIND AI CO.</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--arcane-rune)', display: 'inline-block' }} />
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-rune)', letterSpacing: 2 }}>COMMAND BRIDGE</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 800, color: 'var(--cmd-text)', lineHeight: 1.1, margin: 0 }}>
              สวัสดีครับ,{' '}
              <span style={{ background: 'var(--magic-grad-heading)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TAEC</span>
              {' '}👑
            </h1>
            <p style={{ fontSize: 13, color: 'var(--cmd-text-soft)', marginTop: 8 }}>มี 8 เรื่องรอการตัดสินใจ · วันนี้ทำไปแล้ว 7 missions</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 28, fontWeight: 700, color: 'var(--magic-cyan)', lineHeight: 1, textShadow: 'var(--magic-text-glow)', letterSpacing: 1 }}>{time}</p>
            <p style={{ fontSize: 11, color: 'var(--arcane-rune)', marginTop: 6, fontFamily: "'Space Mono',monospace" }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </header>

        {/* ── Quick command bar ── */}
        <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--aurora-soft)', border: '1px solid rgba(155,109,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔮</div>
          <input
            ref={inputRef}
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && cmd.trim()) router.push('/guild-room') }}
            placeholder='พิมคำสั่งให้ ARIA เช่น "refactor หน้า affiliate" หรือ "สรุปงานวันนี้"...'
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: 'var(--cmd-text)', caretColor: 'var(--magic-cyan)', fontFamily: 'Inter,sans-serif' }}
          />
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--arcane-rune)', fontFamily: "'Space Mono',monospace", padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>Enter ↵</span>
            <Link href="/guild-room" style={{ textDecoration: 'none', padding: '8px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--magic-grad-cta)', color: '#07071a', boxShadow: 'var(--magic-glow-aurora)', whiteSpace: 'nowrap' }}>ส่ง ARIA →</Link>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18 }}>
          {statCards.map((card, i) => <StatCard key={card.label} card={card} i={i} />)}
        </div>

        {/* ── Main grid: Roster + Activity log ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 20, alignItems: 'start' }}>

          {/* Agent roster panel */}
          <div style={{ ...glass, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Panel top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--magic-purple),transparent)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />

            {/* Online agents */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--arcane-emerald)', boxShadow: 'var(--magic-glow-emerald)', animation: 'glow-pulse 2s ease-in-out infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-emerald)', letterSpacing: 2, fontWeight: 700 }}>ONLINE — {onlineAgents.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {onlineAgents.map(ag => (
                  <Link key={ag.id} href="/guild-room" title={ag.title} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px', borderRadius: 99,
                      background: `color-mix(in srgb,${ag.color} 12%,transparent)`,
                      border: `1px solid color-mix(in srgb,${ag.color} 35%,transparent)`,
                      boxShadow: `0 0 10px color-mix(in srgb,${ag.color} 15%,transparent)`,
                      cursor: 'pointer', transition: 'all .2s',
                    }}>
                      <span style={{ fontSize: 13 }}>{ag.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: ag.color, fontFamily: "'Space Mono',monospace", letterSpacing: .5 }}>{ag.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {busyAgents.length > 0 && (
              <div>
                <div style={{ height: 1, background: 'var(--cmd-divider)', margin: '4px 0 14px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--arcane-gold)', boxShadow: 'var(--magic-glow-gold)', animation: 'glow-pulse 2s ease-in-out infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-gold)', letterSpacing: 2, fontWeight: 700 }}>BUSY — {busyAgents.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {busyAgents.map(ag => (
                    <div key={ag.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px', borderRadius: 99,
                      background: 'color-mix(in srgb,var(--arcane-gold) 10%,transparent)',
                      border: '1px solid color-mix(in srgb,var(--arcane-gold) 30%,transparent)',
                    }}>
                      <span style={{ fontSize: 13 }}>{ag.emoji}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--arcane-gold)', fontFamily: "'Space Mono',monospace" }}>{ag.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity log panel */}
          <div style={{ ...glass, padding: '22px 24px', position: 'relative' }}>
            {/* Panel top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--magic-cyan),transparent)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-rune)', letterSpacing: 2, fontWeight: 700 }}>ACTIVITY LOG</span>
              <div style={{ flex: 1, height: 1, background: 'var(--cmd-divider)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentLogs.map((log, i) => {
                const ag = agentById[log.agentId]
                const statusColor = logStatusColor[log.status] ?? 'var(--cmd-accent)'
                return (
                  <div key={log.id} style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '11px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--cmd-divider)',
                  }}>
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)', flexShrink: 0, marginTop: 3, width: 38, letterSpacing: .5 }}>{logTime(log.timestamp)}</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0, marginTop: 5, boxShadow: `0 0 8px ${statusColor}`, animation: log.status === 'in_progress' ? 'glow-pulse 1.5s ease-in-out infinite' : 'none' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: "'Space Mono',monospace",
                          color: ag?.color ?? 'var(--cmd-accent)',
                          padding: '1px 7px', borderRadius: 4,
                          background: `color-mix(in srgb,${ag?.color ?? 'var(--magic-purple)'} 14%,transparent)`,
                          border: `1px solid color-mix(in srgb,${ag?.color ?? 'var(--magic-purple)'} 28%,transparent)`,
                        }}>
                          {ag?.name ?? log.agentId.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--cmd-text)', fontWeight: 600 }}>{log.action}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--cmd-text-soft)', marginTop: 4, lineHeight: 1.4 }}>{log.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
