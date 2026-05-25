/* Tagline + title + optional subtitle, used atop each affiliate section. */
export function SectionHeader({
  tag,
  title,
  subtitle,
}: {
  tag: string
  title: string
  subtitle?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:'var(--aff-gold)', letterSpacing:3, fontWeight:700, marginBottom:6 }}>{tag}</p>
      <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', lineHeight:1.15, margin:0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{subtitle}</p>}
    </div>
  )
}
