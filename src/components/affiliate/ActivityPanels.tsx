import { PAYOUTS, REFERRALS } from '@/data/affiliate'
import { SectionHeader } from './SectionHeader'

function ReferralsPanel() {
  return (
    <div style={{
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--comm-card-bg)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--comm-card-shadow)',
      padding:'22px 24px',
    }}>
      <SectionHeader tag="◆ RECENT REFERRALS" title="New Sign-ups" />
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {REFERRALS.map(r => (
          <div key={r.email} className="aff-list-item" style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'12px 14px',
            borderRadius:'var(--aff-radius-md)',
            background:'var(--aff-glass-light)',
            border:'var(--aff-border-soft)',
          }}>
            <div style={{
              width:38, height:38, borderRadius:'50%',
              background:'var(--aff-bg-conv)',
              border:'var(--aff-border-medium)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color:'var(--text)',
              flexShrink:0,
            }}>{r.user.split(' ').map(p => p[0]).join('')}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{r.user}</p>
              <p style={{ fontSize:10, color:'var(--muted)', fontFamily:"'Space Mono',monospace" }}>{r.email} · via {r.source}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{
                fontSize:13, fontWeight:800,
                color: r.status === 'churned' ? 'var(--comm-negative)' : r.value > 0 ? 'var(--comm-positive)' : 'var(--comm-pending)',
                fontFamily:"'Space Mono',monospace",
              }}>{r.value > 0 ? `฿${r.value.toLocaleString()}` : '—'}</p>
              <p style={{ fontSize:9, color:'var(--dim)', fontFamily:"'Space Mono',monospace", letterSpacing:1, textTransform:'uppercase' }}>{r.joined} · {r.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PayoutsPanel() {
  return (
    <div style={{
      borderRadius:'var(--aff-radius-lg)',
      background:'var(--comm-card-bg)',
      border:'var(--aff-border-medium)',
      boxShadow:'var(--comm-card-shadow)',
      padding:'22px 24px',
    }}>
      <SectionHeader tag="◆ PAYOUT HISTORY" title="Recent Transfers" />
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {PAYOUTS.map(p => (
          <div key={p.ref} className="aff-list-item" style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px',
            borderRadius:'var(--aff-radius-md)',
            background:'var(--aff-glass-light)',
            border:'var(--aff-border-soft)',
          }}>
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{p.method}</p>
              <p style={{ fontSize:10, color:'var(--muted)', fontFamily:"'Space Mono',monospace", marginTop:2 }}>{p.date} · {p.ref}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{
                fontSize:14, fontWeight:800,
                background: p.status === 'paid' ? 'var(--stat-grad-conv)' : 'var(--stat-grad-pending)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                fontFamily:"'Space Mono',monospace",
              }}>฿{p.amount.toLocaleString()}</p>
              <span style={{
                fontSize:9, fontWeight:700, letterSpacing:1,
                padding:'2px 8px', borderRadius:'var(--aff-radius-pill)',
                background: p.status === 'paid' ? 'rgba(16,185,129,.12)' : 'rgba(251,191,36,.14)',
                color: p.status === 'paid' ? 'var(--comm-positive)' : 'var(--comm-pending)',
                fontFamily:"'Space Mono',monospace",
                textTransform:'uppercase',
              }}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Side-by-side referrals + payout history. */
export function ActivityPanels() {
  return (
    <section style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:20 }}>
      <ReferralsPanel />
      <PayoutsPanel />
    </section>
  )
}
