import type { CommissionStatus } from '@/data/affiliate'
import { COMMISSIONS } from '@/data/affiliate'
import { SectionHeader } from './SectionHeader'

const STATUS_COLOR: Record<CommissionStatus, string> = {
  positive: 'var(--comm-positive)',
  pending: 'var(--comm-pending)',
  negative: 'var(--comm-negative)',
}

const STATUS_BG: Record<CommissionStatus, string> = {
  positive: 'rgba(16,185,129,.12)',
  pending: 'rgba(251,191,36,.12)',
  negative: 'rgba(239,68,68,.12)',
}

const HEADERS = ['Product', 'Tier', 'Rate', 'Sales', 'Earned', 'Status'] as const

/* Commission breakdown table, by product. */
export function CommissionTable() {
  return (
    <section>
      <SectionHeader tag="◆ COMMISSIONS" title="Commission Breakdown" subtitle="By product · current cycle" />
      <div style={{
        borderRadius:'var(--aff-radius-lg)',
        background:'var(--comm-card-bg)',
        border:'var(--aff-border-medium)',
        boxShadow:'var(--comm-card-shadow)',
        overflow:'hidden',
      }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--aff-glass-light)', borderBottom:'var(--aff-border-soft)' }}>
              {HEADERS.map(h => (
                <th key={h} style={{
                  textAlign: h === 'Earned' || h === 'Sales' ? 'right' : 'left',
                  padding:'14px 18px',
                  fontSize:10, fontWeight:700, letterSpacing:2,
                  color:'var(--aff-gold)',
                  fontFamily:"'Space Mono',monospace",
                }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMMISSIONS.map((c, i) => (
              <tr key={c.product} className="aff-row" style={{
                borderBottom: i === COMMISSIONS.length - 1 ? 'none' : '1px solid var(--aff-glass-border)',
                animation:`row-rise .5s cubic-bezier(.2,.7,.3,1) ${i * 70 + 80}ms both`,
              }}>
                <td style={{ padding:'14px 18px', fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.product}</td>
                <td style={{ padding:'14px 18px', fontSize:11, color:'var(--muted)' }}>
                  <span style={{
                    padding:'3px 9px', borderRadius:'var(--aff-radius-pill)',
                    background:'var(--aff-glass-light)', border:'var(--aff-border-soft)',
                    fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:1,
                  }}>{c.tier}</span>
                </td>
                <td style={{ padding:'14px 18px', fontSize:13, fontWeight:700, color:'var(--aff-gold)', fontFamily:"'Space Mono',monospace" }}>{c.rate}</td>
                <td style={{ padding:'14px 18px', fontSize:13, color:'var(--text)', textAlign:'right', fontFamily:"'Space Mono',monospace" }}>{c.sales}</td>
                <td style={{
                  padding:'14px 18px', textAlign:'right',
                  fontSize:14, fontWeight:800,
                  color: STATUS_COLOR[c.status],
                  fontFamily:"'Space Mono',monospace",
                }}>{c.earned < 0 ? '-' : ''}฿{Math.abs(c.earned).toLocaleString()}</td>
                <td style={{ padding:'14px 18px' }}>
                  <span style={{
                    fontSize:10, fontWeight:700, letterSpacing:1,
                    padding:'3px 10px', borderRadius:'var(--aff-radius-pill)',
                    background: STATUS_BG[c.status],
                    color: STATUS_COLOR[c.status],
                    fontFamily:"'Space Mono',monospace",
                    textTransform:'uppercase',
                  }}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
