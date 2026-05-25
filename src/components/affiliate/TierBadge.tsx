import type { Tier } from '@/data/affiliate'

const TIER_EMOJI: Record<Tier, string> = {
  platinum: '💎',
  gold: '🏆',
  silver: '🥈',
  bronze: '🥉',
}

/* Pill badge for an affiliate tier. */
export function TierBadge({ tier, size = 'sm' }: { tier: Tier; size?: 'sm' | 'lg' }) {
  const bg = `var(--tier-${tier}-bg)`
  const glow = `var(--tier-${tier}-glow)`
  const px = size === 'lg' ? '8px 18px' : '4px 12px'
  const fs = size === 'lg' ? 13 : 10
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding: px, borderRadius:'var(--aff-radius-pill)',
      background: bg, boxShadow: glow,
      fontSize: fs, fontWeight:800, letterSpacing:1.5,
      color:'var(--aff-ink)', fontFamily:"'Space Mono',monospace",
      textTransform:'uppercase',
    }}>
      {TIER_EMOJI[tier]} {tier}
    </span>
  )
}
