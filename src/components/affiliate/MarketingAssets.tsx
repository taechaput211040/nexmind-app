'use client'
import { useMemo, useState } from 'react'
import type { AssetType } from '@/data/affiliate'
import { ASSETS, ASSET_FILTERS } from '@/data/affiliate'
import { SectionHeader } from './SectionHeader'

/* Downloadable marketing creatives with a type filter. */
export function MarketingAssets() {
  const [filter, setFilter] = useState<'all' | AssetType>('all')

  const filtered = useMemo(
    () => filter === 'all' ? ASSETS : ASSETS.filter(a => a.type === filter),
    [filter],
  )

  return (
    <section>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <SectionHeader tag="◆ MARKETING ASSETS" title="Banners & Creatives" subtitle="High-converting designs · ready to deploy" />
        <div style={{ display:'flex', gap:6, padding:4, borderRadius:'var(--aff-radius-pill)', background:'var(--aff-glass-light)', border:'var(--aff-border-soft)' }}>
          {ASSET_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'6px 14px',
              borderRadius:'var(--aff-radius-pill)',
              border:'none', cursor:'pointer',
              fontSize:10, fontWeight:700, letterSpacing:1.5,
              background: filter === f ? 'var(--aff-cta-bg)' : 'transparent',
              color: filter === f ? 'var(--aff-ink)' : 'var(--muted)',
              fontFamily:"'Space Mono',monospace",
              textTransform:'uppercase',
              boxShadow: filter === f ? 'var(--aff-glow-gold)' : 'none',
              transition:'all .2s ease',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {filtered.map(a => (
          <div key={a.name} style={{
            borderRadius:'var(--aff-radius-md)',
            background:'var(--comm-card-bg)',
            border:'var(--aff-border-medium)',
            boxShadow:'var(--comm-card-shadow)',
            overflow:'hidden',
            transition:'all .25s ease',
          }}>
            <div style={{
              height:120,
              background:'var(--aff-bg-conv)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:48,
              borderBottom:'var(--aff-border-soft)',
              position:'relative', overflow:'hidden',
            }}>
              <div aria-hidden style={{ position:'absolute', inset:0, background:'var(--aff-bg-shimmer)', backgroundSize:'200% 100%', animation:'shimmer 5s linear infinite', mixBlendMode:'overlay', opacity:.3 }} />
              <span style={{ position:'relative', zIndex:1 }}>{a.preview}</span>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{a.name}</p>
              <p style={{ fontSize:10, color:'var(--muted)', fontFamily:"'Space Mono',monospace", marginTop:3, letterSpacing:1, textTransform:'uppercase' }}>{a.type} · {a.size} · ↓ {a.downloads}</p>
              <button style={{
                marginTop:10, width:'100%',
                padding:'8px 12px',
                borderRadius:'var(--aff-radius-sm)',
                background:'var(--aff-cta-bg)',
                border:'none', cursor:'pointer',
                fontSize:11, fontWeight:800, letterSpacing:1.5,
                color:'var(--aff-ink)',
                fontFamily:"'Space Mono',monospace",
                boxShadow:'var(--aff-glow-cta)',
                textTransform:'uppercase',
              }}>↓ Download</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
