'use client'
import { useState, useEffect } from 'react'

function Counter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(target / 40)
    const t = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(t) } else setVal(start)
    }, 22)
    return () => clearInterval(t)
  }, [target])
  return <>{prefix}{val.toLocaleString()}{suffix}</>
}

export interface StatCardData {
  label: string
  value: number
  prefix?: string
  unit: string
  icon: string
  accent: string
  glow: string
}

export default function StatCard({ card, i }: { card: StatCardData; i: number }) {
  const [vis, setVis] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVis(true), i * 90 + 60)
    return () => clearTimeout(t)
  }, [i])

  const accentTint = (pct: number) => `color-mix(in srgb,${card.accent} ${pct}%,transparent)`

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--cmd-card-radius)',
        background: 'var(--magic-glass)',
        border: `1px solid ${accentTint(hover ? 55 : 28)}`,
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(var(--magic-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
        boxShadow: hover
          ? `0 8px 40px rgba(0,0,0,0.5), ${card.glow}`
          : `0 4px 28px rgba(0,0,0,0.4), ${accentTint(12)} 0 0 0 0`,
        opacity: vis ? 1 : 0,
        transform: vis ? (hover ? 'translateY(-5px) scale(1.01)' : 'translateY(0)') : 'translateY(22px)',
        transition: 'opacity .5s ease, transform .38s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease, border-color .3s ease',
        cursor: 'default',
      }}
    >
      {/* Top accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${card.accent},transparent)`, opacity: hover ? 1 : 0.6, transition: 'opacity .3s' }} />
      {/* Corner glow blob */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: card.accent, opacity: hover ? .12 : .07, filter: 'blur(32px)', transition: 'opacity .3s', pointerEvents: 'none' }} />

      {/* Icon + LIVE badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accentTint(14),
          border: `1px solid ${accentTint(32)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          boxShadow: `0 0 14px ${accentTint(20)}`,
        }}>{card.icon}</div>
        <span style={{
          fontSize: 9, fontFamily: "'Space Mono',monospace",
          padding: '3px 9px', borderRadius: 20,
          background: accentTint(14),
          color: card.accent,
          letterSpacing: 2, fontWeight: 700,
          border: `1px solid ${accentTint(25)}`,
        }}>LIVE</span>
      </div>

      {/* Number */}
      <p style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: card.accent, textShadow: card.glow, fontFamily: "'Space Mono',monospace", letterSpacing: -1 }}>
        {vis ? <Counter target={card.value} prefix={card.prefix} /> : (card.prefix ?? '') + '0'}
      </p>

      {/* Label + unit */}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cmd-stat-label)', marginTop: 10 }}>{card.label}</p>
      <p style={{ fontSize: 11, color: 'var(--cmd-stat-unit)', marginTop: 3 }}>{card.unit}</p>

      {/* Bottom divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg,${accentTint(20)},transparent)`, marginTop: 14 }} />
    </div>
  )
}
