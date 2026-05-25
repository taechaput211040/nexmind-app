/* ─────────────────────────────────────────
   Affiliate · Premium Partner Hub
   Composition only — data lives in @/data/affiliate,
   behaviour in @/hooks/*, UI in @/components/affiliate/*.
───────────────────────────────────────── */
import {
  HeroSection,
  StatsGrid,
  TierProgress,
  CommissionTable,
  ActivityPanels,
  MarketingAssets,
  FaqSection,
  FooterCta,
} from '@/components/affiliate'

export default function AffiliatePage() {
  return (
    <div style={{
      minHeight:'100vh',
      background:'var(--aff-bg-premium)',
      padding:'28px 32px 60px',
      position:'relative',
      overflow:'hidden',
    }}>
      {/* Ambient glow */}
      <div aria-hidden style={{ position:'fixed', top:-120, left:200, width:520, height:520, borderRadius:'50%', background:'rgba(124,58,237,.10)', filter:'blur(100px)', pointerEvents:'none', zIndex:0 }} />
      <div aria-hidden style={{ position:'fixed', bottom:-150, right:80, width:480, height:480, borderRadius:'50%', background:'rgba(251,191,36,.08)', filter:'blur(100px)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', display:'flex', flexDirection:'column', gap:32 }}>
        <HeroSection />
        <StatsGrid />
        <div className="aff-rise" style={{ animationDelay:'120ms' }}><TierProgress /></div>
        <div className="aff-rise" style={{ animationDelay:'200ms' }}><CommissionTable /></div>
        <div className="aff-rise" style={{ animationDelay:'280ms' }}><ActivityPanels /></div>
        <div className="aff-rise" style={{ animationDelay:'360ms' }}><MarketingAssets /></div>
        <div className="aff-rise" style={{ animationDelay:'440ms' }}><FaqSection /></div>
        <div className="aff-rise" style={{ animationDelay:'520ms' }}><FooterCta /></div>
      </div>
    </div>
  )
}
