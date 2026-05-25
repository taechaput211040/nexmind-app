import type { CSSProperties, ReactNode } from 'react'

/** Frosted arcane-glass panel -- magic layer surface with optional accent border. */
export function Panel({ children, accent, style }: { children: ReactNode; accent?: string; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--magic-glass)',
      borderRadius: 'var(--cmd-card-radius)',
      border: `1px solid ${accent ? `color-mix(in srgb, ${accent} 32%, transparent)` : 'var(--magic-glass-border)'}`,
      boxShadow: 'var(--magic-glow-soft)',
      padding: '22px 24px',
      backdropFilter: 'blur(var(--magic-glass-blur))',
      WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Mono uppercase section eyebrow with optional status dot. */
export function SectionLabel({ text, color = 'var(--cmd-label)', dot, count }: { text: string; color?: string; dot?: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 8px ${dot}`, animation: 'glow-pulse 2s ease-in-out infinite' }} />}
      <p style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color, letterSpacing: 2, fontWeight: 700, margin: 0 }}>
        {text}{typeof count === 'number' ? ` — ${count}` : ''}
      </p>
    </div>
  )
}
