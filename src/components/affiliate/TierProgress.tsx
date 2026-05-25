'use client'
import {
  CURRENT_EARNINGS,
  CURRENT_TIER,
  NEXT_TIER,
  TIER_ORDER,
  TIER_THRESHOLDS,
  getTierProgress,
} from '@/data/affiliate'
import { TierBadge } from './TierBadge'

/* Tier ladder + progress bar toward the next tier. */
export function TierProgress() {
  const progress = getTierProgress()

  return (
    <section style={{
      position:'relative', overflow:'hidden',
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--comm-card-bg)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--aff-shadow-premium)',
      padding:'28px 32px',
    }}>
      <div aria-hidden style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--comm-card-accent)' }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, marginBottom:24, flexWrap:'wrap' }}>
        <div>
          <p style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--aff-gold)', letterSpacing:3, fontWeight:700, marginBottom:6 }}>◆ TIER PROGRESSION</p>
          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', margin:0 }}>
            อีก <span style={{
              background:'var(--stat-text-gold)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
            }}>฿{progress.gap.toLocaleString()}</span> ถึง Platinum 💎
          </h2>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Platinum tier · 45% commission + instant payout</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <TierBadge tier={CURRENT_TIER} size="lg" />
          <span style={{ fontSize:18, color:'var(--muted)' }}>→</span>
          <TierBadge tier={NEXT_TIER} size="lg" />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ position:'relative', height:14, borderRadius:'var(--aff-radius-pill)', background:'var(--aff-glass-light)', border:'var(--aff-border-soft)', overflow:'hidden', marginBottom:14 }}>
        <div style={{
          position:'absolute', inset:0, width:`${progress.pct}%`,
          background:'var(--aff-cta-bg)',
          boxShadow:'var(--aff-glow-gold)',
          borderRadius:'var(--aff-radius-pill)',
          transition:'width 1s cubic-bezier(.2,.7,.3,1)',
        }} />
        <div aria-hidden style={{
          position:'absolute', inset:0, width:`${progress.pct}%`,
          background:'var(--aff-bg-shimmer)', backgroundSize:'200% 100%',
          animation:'shimmer 3s linear infinite',
          mixBlendMode:'overlay', opacity:.6,
          borderRadius:'var(--aff-radius-pill)',
        }} />
      </div>

      {/* Tier ladder */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {TIER_ORDER.map(t => {
          const reached = CURRENT_EARNINGS >= TIER_THRESHOLDS[t]
          const isCurrent = t === CURRENT_TIER
          return (
            <div key={t} style={{
              padding:'12px 14px',
              borderRadius:'var(--aff-radius-md)',
              background: isCurrent ? 'var(--aff-active-bg)' : 'var(--aff-glass-light)',
              border: isCurrent ? 'var(--aff-border-strong)' : 'var(--aff-border-soft)',
              opacity: reached ? 1 : 0.55,
              position:'relative',
            }}>
              {isCurrent && <span style={{
                position:'absolute', top:-8, right:10,
                fontSize:9, fontWeight:800, letterSpacing:1.5,
                padding:'2px 8px', borderRadius:'var(--aff-radius-pill)',
                background:'var(--aff-cta-bg)', color:'var(--aff-ink)',
                fontFamily:"'Space Mono',monospace",
              }}>NOW</span>}
              <p style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:`var(--tier-${t})`, letterSpacing:2, fontWeight:700, textTransform:'uppercase' }}>{t}</p>
              <p style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginTop:4, fontFamily:"'Space Mono',monospace" }}>
                ฿{TIER_THRESHOLDS[t].toLocaleString()}
              </p>
              <p style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{reached ? '✓ unlocked' : 'locked'}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
