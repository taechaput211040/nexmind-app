'use client'
import { CURRENT_EARNINGS, CURRENT_TIER, REFERRAL_LINK } from '@/data/affiliate'
import { useClipboard } from '@/hooks/useClipboard'
import { Counter } from './Counter'
import { TierBadge } from './TierBadge'

/* Hero banner: program pitch, lifetime earnings, copyable referral link. */
export function HeroSection() {
  const { copied, copy } = useClipboard()
  const copyLink = () => copy(REFERRAL_LINK)

  return (
    <section style={{
      position:'relative', overflow:'hidden',
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--aff-bg-conv)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--aff-shadow-premium)',
      padding:'40px 44px',
      animation:'premium-rise .7s cubic-bezier(.2,.7,.3,1) both',
    }}>
      <div aria-hidden style={{ position:'absolute', inset:0, background:'var(--aff-bg-shimmer)', backgroundSize:'200% 100%', animation:'shimmer 6s linear infinite', mixBlendMode:'overlay', opacity:.35, pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'var(--aff-royal)', opacity:.18, filter:'blur(70px)' }} />

      <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:'var(--aff-gold)', letterSpacing:3, fontWeight:700 }}>◆ AFFILIATE PROGRAM</span>
          <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--aff-gold)' }} />
          <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:'var(--muted)', letterSpacing:2 }}>PARTNER HUB</span>
          <TierBadge tier={CURRENT_TIER} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:24, flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 480px' }}>
            <h1 style={{ fontSize:42, fontWeight:800, lineHeight:1.1, margin:0, color:'var(--text)' }}>
              แชร์.{' '}
              <span style={{
                background:'var(--stat-text-gold)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
              }}>รับ commission.</span>{' '}
              สูงสุด <span style={{ color:'var(--aff-emerald)' }}>40%</span>
            </h1>
            <p style={{ fontSize:14, color:'var(--muted)', marginTop:10, maxWidth:560 }}>
              Premium partner program · 90-day cookie · monthly payout · marketing assets ครบชุด
            </p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <p style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--muted)', letterSpacing:2 }}>LIFETIME EARNED</p>
            <p style={{
              fontSize:34, fontWeight:800, lineHeight:1,
              background:'var(--stat-text-gold)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              fontFamily:"'Space Mono',monospace",
            }}><Counter target={CURRENT_EARNINGS} prefix="฿" /></p>
          </div>
        </div>

        {/* Referral link bar */}
        <div style={{
          marginTop:8,
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 18px',
          borderRadius:'var(--aff-radius-md)',
          background:'var(--ref-link-bg)',
          border:`1px solid var(--ref-link-border)`,
          boxShadow:'var(--aff-shadow-inner)',
        }}>
          <span style={{ fontSize:18 }}>🔗</span>
          <code style={{
            flex:1, fontSize:14, fontWeight:600,
            color:'var(--ref-link-text)',
            fontFamily:"'Space Mono',monospace",
            background:'transparent',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>{REFERRAL_LINK}</code>
          <button
            onClick={copyLink}
            className={copied ? 'aff-copy-btn is-copied' : 'aff-copy-btn'}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'10px 22px', borderRadius:'var(--aff-radius-md)',
              background: copied ? 'var(--ref-copy-success)' : 'var(--aff-cta-bg)',
              border:'none', cursor:'pointer',
              color: copied ? '#fff' : 'var(--aff-ink)',
              fontSize:13, fontWeight:800, letterSpacing:1,
              fontFamily:"'Space Mono',monospace",
              boxShadow: copied ? 'var(--aff-glow-emerald)' : 'var(--aff-glow-cta)',
              transition:'all .25s ease',
            }}
          >
            {copied ? '✓ COPIED' : '⎘ COPY LINK'}
          </button>
          <button
            onClick={copyLink}
            title="Share"
            className="aff-share-btn"
            style={{
              width:44, height:44, borderRadius:'var(--aff-radius-md)',
              background:'var(--aff-glass-light)',
              border:'var(--aff-border-medium)',
              cursor:'pointer', fontSize:16,
              color:'var(--text)',
              transition:'all .2s ease',
            }}
          >↗</button>
        </div>
      </div>
    </section>
  )
}
