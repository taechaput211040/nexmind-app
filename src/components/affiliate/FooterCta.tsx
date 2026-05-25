/* Closing support / contact banner. */
export function FooterCta() {
  return (
    <section style={{
      textAlign:'center',
      padding:'32px 24px',
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--aff-bg-conv)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--aff-shadow-premium)',
      position:'relative', overflow:'hidden',
    }}>
      <div aria-hidden style={{ position:'absolute', inset:0, background:'var(--aff-bg-shimmer)', backgroundSize:'200% 100%', animation:'shimmer 8s linear infinite', mixBlendMode:'overlay', opacity:.3 }} />
      <p style={{ position:'relative', fontSize:11, fontFamily:"'Space Mono',monospace", color:'var(--aff-gold)', letterSpacing:3, fontWeight:700 }}>◆ NEXMIND AFFILIATE</p>
      <p style={{ position:'relative', fontSize:13, color:'var(--muted)', marginTop:6 }}>support · taec@nexmind.ai · TG: @nexmind_partners</p>
    </section>
  )
}
