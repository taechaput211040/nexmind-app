'use client'
import { useState } from 'react'
import StatCard, { type StatCardData } from '@/components/StatCard'

const presets = [
  { icon:'⏰', label:'Gold Morning Brief',  agent:'HAWK',  time:'08:00', freq:'Daily',   desc:'XAU/USD signal + market outlook every morning', active:true  },
  { icon:'📊', label:'Trend Daily Digest',  agent:'SCOUT', time:'09:00', freq:'Daily',   desc:'Trending topics + keyword opportunities',         active:true  },
  { icon:'🔮', label:'ARIA Session Start',  agent:'ARIA',  time:'08:30', freq:'Daily',   desc:'Check MEMO + pending tasks + brief TAEC',         active:true  },
  { icon:'💰', label:'Weekly P&L Report',   agent:'COIN',  time:'18:00', freq:'Weekly',  desc:'Weekly revenue and expense summary',               active:false },
  { icon:'🧠', label:'MEMO Consolidation', agent:'MEMO',  time:'23:00', freq:'Daily',   desc:'Update knowledge base + lesson learned',           active:false },
  { icon:'📱', label:'Social Post Queue',   agent:'VIBE',  time:'10:00', freq:'Weekly',  desc:'Generate content queue for next week',             active:false },
]

const glass: React.CSSProperties = {
  background: 'var(--magic-glass)',
  border: '1px solid var(--magic-glass-border)',
  boxShadow: 'var(--magic-glow-soft)',
  backdropFilter: 'blur(var(--magic-glass-blur))',
  WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
  borderRadius: 'var(--cmd-card-radius)',
}

export default function Scheduler() {
  const [tasks, setTasks] = useState(presets)
  const [hovered, setHovered] = useState<number | null>(null)

  const toggle = (i: number) =>
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, active: !t.active } : t))

  const statCards: StatCardData[] = [
    { label:'Active Tasks', value: tasks.filter(t=>t.active).length,                      unit:'running now', icon:'⚡', accent:'var(--arcane-emerald)', glow:'var(--magic-glow-emerald)' },
    { label:'Daily Runs',   value: tasks.filter(t=>t.freq==='Daily'  && t.active).length,  unit:'every day',   icon:'📅', accent:'var(--magic-purple)',   glow:'var(--magic-glow-purple)' },
    { label:'Weekly Runs',  value: tasks.filter(t=>t.freq==='Weekly' && t.active).length,  unit:'every week',  icon:'🗓️', accent:'var(--arcane-gold)',    glow:'var(--magic-glow-gold)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nebula-bg)', padding: '32px clamp(20px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', padding: '6px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--magic-cyan)', letterSpacing: 3, fontWeight: 700 }}>CHRONO TOWER</span>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-rune)', letterSpacing: 2 }}>CRON JOBS</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 800, color: 'var(--cmd-text)', lineHeight: 1.1, margin: 0 }}>
              <span style={{ background: 'var(--magic-grad-heading)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Scheduler</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--cmd-text-soft)', marginTop: 8 }}>Cron jobs — agent run automatically on schedule</p>
          </div>
          <button style={{ alignSelf: 'center', cursor: 'pointer', padding: '10px 22px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--magic-grad-cta)', color: '#07071a', border: 'none', boxShadow: 'var(--magic-glow-aurora)', whiteSpace: 'nowrap' }}>+ New Task</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18 }}>
          {statCards.map((card, i) => <StatCard key={card.label} card={card} i={i} />)}
        </div>

        <div style={{ ...glass, padding: '22px 24px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--magic-purple),transparent)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-rune)', letterSpacing: 2, fontWeight: 700 }}>SCHEDULED TASKS &mdash; {tasks.length}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--cmd-divider)' }} />
          </div>

          {tasks.map((task, i) => {
            const isHover = hovered === i
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 18px', borderRadius: 12,
                  background: task.active ? 'color-mix(in srgb,var(--arcane-emerald) 6%,transparent)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${task.active ? 'color-mix(in srgb,var(--arcane-emerald) 28%,transparent)' : 'var(--cmd-divider)'}`,
                  boxShadow: task.active
                    ? (isHover ? '0 6px 26px color-mix(in srgb,var(--arcane-emerald) 20%,transparent)' : '0 0 16px color-mix(in srgb,var(--arcane-emerald) 12%,transparent)')
                    : (isHover ? '0 6px 22px rgba(0,0,0,0.4)' : 'none'),
                  opacity: task.active ? 1 : (isHover ? 0.82 : 0.62),
                  transform: isHover ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'all .22s cubic-bezier(.2,.8,.3,1)',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{task.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cmd-text)' }}>{task.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Space Mono',monospace", letterSpacing: .5, padding: '2px 8px', borderRadius: 99, color: 'var(--magic-purple)', background: 'color-mix(in srgb,var(--magic-purple) 14%,transparent)', border: '1px solid color-mix(in srgb,var(--magic-purple) 30%,transparent)' }}>{task.agent}</span>
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", letterSpacing: .5, padding: '2px 8px', borderRadius: 99, color: 'var(--arcane-rune)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--cmd-divider)' }}>{task.freq}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--cmd-text-soft)', lineHeight: 1.4 }}>{task.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 15, color: 'var(--arcane-gold)', textShadow: 'var(--magic-glow-gold)' }}>{task.time}</p>
                    <p style={{ fontSize: 9, color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace", letterSpacing: .5, marginTop: 2 }}>next run</p>
                  </div>
                  <button
                    onClick={() => toggle(i)}
                    aria-label={`Toggle ${task.label}`}
                    style={{
                      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                      background: task.active ? 'var(--arcane-emerald)' : 'rgba(255,255,255,0.09)',
                      border: `1px solid ${task.active ? 'var(--arcane-emerald)' : 'var(--magic-glass-border)'}`,
                      position: 'relative', cursor: 'pointer',
                      boxShadow: task.active ? 'var(--magic-glow-emerald)' : 'none',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--cmd-text)', position: 'absolute', top: 2, left: task.active ? 22 : 2, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.45)' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 11, color: 'var(--cmd-label)', lineHeight: 1.5 }}>
          Phase 1: connect with n8n + LINE Notify to trigger real agent tasks
        </p>
      </div>
    </div>
  )
}
