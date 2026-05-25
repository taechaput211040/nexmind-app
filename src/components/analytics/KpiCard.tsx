'use client'
import { useState, useEffect } from 'react'
import type { Kpi } from './types'

function fmt(value: number, unit: string) {
  if (unit === '฿') return `฿${Math.round(value).toLocaleString('en-US')}`
  if (unit === '%') return `${value.toFixed(1)}%`
  return Math.round(value).toLocaleString('en-US')
}

// Animated count-up that respects the KPI's display unit.
function Counter({ target, unit }: { target: number; unit: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 650
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setVal(target * p)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <>{fmt(val, unit)}</>
}

const trendMeta = {
  up:   { arrow: '▲', color: 'var(--arcane-emerald)' },
  down: { arrow: '▼', color: 'var(--red)' },
  flat: { arrow: '▬', color: 'var(--cmd-label)' },
} as const

export default function KpiCard({ kpi }: { kpi: Kpi }) {
  const t = trendMeta[kpi.trend]
  const [vis, setVis] = useState(false)
  const [hover, setHover] = useState(false)
  const tint = (pct: number) => `color-mix(in srgb,${kpi.color} ${pct}%,transparent)`

  useEffect(() => {
    const id = setTimeout(() => setVis(true), 60)
    return () => clearTimeout(id)
  }, [])

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--cmd-card-radius)',
        background: 'var(--magic-glass)',
        border: `1px solid ${tint(hover ? 55 : 28)}`,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(var(--magic-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
        boxShadow: hover
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 22px ${tint(40)}`
          : 'var(--magic-glow-soft)',
        opacity: vis ? 1 : 0,
        transform: vis ? (hover ? 'translateY(-5px) scale(1.01)' : 'translateY(0)') : 'translateY(18px)',
        transition: 'opacity .5s ease, transform .38s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease, border-color .3s ease',
        cursor: 'default',
      }}
    >
      {/* Top accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${kpi.color},transparent)`, opacity: hover ? 1 : 0.6, transition: 'opacity .3s', pointerEvents: 'none' }} />
      {/* Corner glow blob */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: kpi.color, opacity: hover ? 0.12 : 0.07, filter: 'blur(32px)', transition: 'opacity .3s', pointerEvents: 'none' }} />

      {/* Label + accent dot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--cmd-text-soft)' }}>{kpi.label}</p>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: kpi.color, boxShadow: `0 0 10px ${tint(70)}`, flexShrink: 0 }} />
      </div>

      {/* Value */}
      <p style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: kpi.color, textShadow: `0 0 18px ${tint(45)}`, fontFamily: "'Space Mono',monospace", letterSpacing: -1 }}>
        {vis ? <Counter target={kpi.value} unit={kpi.unit} /> : fmt(0, kpi.unit)}
      </p>

      {/* Trend / delta */}
      <p style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", marginTop: 12, color: t.color }}>
        {t.arrow} {Math.abs(kpi.delta)}% <span style={{ color: 'var(--cmd-label)' }}>vs prev</span>
      </p>
    </div>
  )
}
