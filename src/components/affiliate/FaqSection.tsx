'use client'
import { useState } from 'react'
import { FAQS } from '@/data/affiliate'
import { SectionHeader } from './SectionHeader'

/* Accordion FAQ. First item open by default. */
export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section>
      <SectionHeader tag="◆ FAQ" title="คำถามที่พบบ่อย" />
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <div key={f.q} style={{
              borderRadius:'var(--aff-radius-md)',
              background:'var(--comm-card-bg)',
              border: isOpen ? 'var(--aff-border-strong)' : 'var(--aff-border-soft)',
              boxShadow: isOpen ? 'var(--aff-glow-gold)' : 'var(--comm-card-shadow)',
              transition:'all .25s ease',
              overflow:'hidden',
            }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width:'100%', textAlign:'left',
                  padding:'16px 20px',
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                  background:'transparent', border:'none', cursor:'pointer',
                  color:'var(--text)', fontSize:14, fontWeight:700,
                }}
              >
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{
                    width:24, height:24, borderRadius:'50%',
                    background:'var(--aff-cta-bg)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:800, color:'var(--aff-ink)',
                    fontFamily:"'Space Mono',monospace",
                    flexShrink:0,
                  }}>{String(i + 1).padStart(2,'0')}</span>
                  {f.q}
                </span>
                <span style={{
                  fontSize:18, color:'var(--aff-gold)',
                  transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition:'transform .2s ease',
                }}>+</span>
              </button>
              {isOpen && (
                <div style={{
                  padding:'0 20px 18px 54px',
                  fontSize:13, lineHeight:1.6, color:'var(--muted)',
                  animation:'fade-up .3s ease both',
                }}>{f.a}</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
