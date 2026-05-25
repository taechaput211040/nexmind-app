'use client'
import type { Stat } from '@/data/affiliate'
import { STATS } from '@/data/affiliate'
import { useRevealOnMount } from '@/hooks/useRevealOnMount'
import { Counter } from './Counter'
import { SectionHeader } from './SectionHeader'

function StatCard({ stat, i }: { stat: Stat; i: number }) {
  const vis = useRevealOnMount(i * 90 + 60)
  return (
    <div className="aff-stat-card" style={{
      position:'relative', overflow:'hidden',
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--comm-card-bg)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--comm-card-shadow)',
      padding:'22px 24px',
      opacity: vis ? 1 : 0,
      transform: vis ? undefined : 'translateY(20px)',
      transition:'opacity .5s cubic-bezier(.2,.7,.3,1), transform .35s cubic-bezier(.2,.7,.3,1), box-shadow .35s ease, border-color .35s ease',
      display:'flex', flexDirection:'column', gap:14,
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--comm-card-accent)' }} />
      <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background: stat.gradient, opacity:.08, filter:'blur(34px)' }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{
          width:42, height:42, borderRadius:12,
          background:'var(--aff-glass-light)',
          border:'var(--aff-border-soft)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20,
        }}>{stat.icon}</div>
        <span style={{
          fontSize:10, fontFamily:"'Space Mono',monospace", fontWeight:700,
          padding:'3px 10px', borderRadius:'var(--aff-radius-pill)',
          background: stat.positive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
          color: stat.positive ? 'var(--comm-positive)' : 'var(--comm-negative)',
          letterSpacing:1,
        }}>{stat.delta}</span>
      </div>

      <div>
        <p style={{
          fontSize:38, fontWeight:800, lineHeight:1,
          background: stat.gradient,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text',
          fontFamily:"'Space Mono',monospace",
          filter:'drop-shadow(0 0 12px rgba(251,191,36,.25))',
        }}>
          {vis ? <Counter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} active={vis} /> : '0'}
        </p>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginTop:6 }}>{stat.label}</p>
      </div>
    </div>
  )
}

/* Performance stats — animated metric cards. */
export function StatsGrid() {
  return (
    <section>
      <SectionHeader tag="◆ PERFORMANCE" title="Stats Dashboard" subtitle="Real-time metrics · last 30 days" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
        {STATS.map((s, i) => <StatCard key={s.key} stat={s} i={i} />)}
      </div>
    </section>
  )
}
