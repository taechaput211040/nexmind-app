'use client'
import { useEffect, useState } from 'react'
import type { AnalyticsData, DateRange } from './types'
import KpiCard from './KpiCard'
import LineChart from './LineChart'
import BarChart from './BarChart'
import DataTable from './DataTable'

const RANGES: DateRange[] = ['7d', '30d', '90d']

const glass: React.CSSProperties = {
  background: 'var(--magic-glass)',
  border: '1px solid var(--magic-glass-border)',
  boxShadow: 'var(--magic-glow-soft)',
  backdropFilter: 'blur(var(--magic-glass-blur))',
  WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
  borderRadius: 'var(--cmd-card-radius)',
}

// Top accent stripe for a glass panel.
function PanelStripe({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)`, borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/analytics?range=${range}`)
      .then(res => res.json())
      .then((d: AnalyticsData) => { if (alive) setData(d) })
      .catch(() => { if (alive) setData(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [range])

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--nebula-bg)', padding: '32px clamp(20px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient nebula orbs */}
      <div style={{ position: 'fixed', top: -160, left: 40,  width: 560, height: 560, borderRadius: '50%', background: 'var(--magic-orb-1)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 18s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: -160, right: 40, width: 460, height: 460, borderRadius: '50%', background: 'var(--magic-orb-2)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 22s ease-in-out infinite reverse' }} />
      <div style={{ position: 'fixed', top: '40%', left: '45%', width: 380, height: 380, borderRadius: '50%', background: 'var(--magic-orb-3)', filter: 'blur(110px)', pointerEvents: 'none', zIndex: 0, animation: 'orb-drift 26s ease-in-out infinite' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Header ── */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', padding: '6px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--magic-cyan)', letterSpacing: 3, fontWeight: 700, textShadow: 'var(--magic-text-glow)' }}>⚡ NEXMIND AI CO.</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--arcane-rune)', display: 'inline-block' }} />
              <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--arcane-rune)', letterSpacing: 2 }}>THE LEDGER</span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
              <span style={{ background: 'var(--magic-grad-heading)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Analytics</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--cmd-text-soft)', marginTop: 8 }}>Revenue, traffic &amp; conversion metrics across all channels</p>
          </div>

          {/* Range toggle */}
          <div style={{ ...glass, display: 'flex', alignItems: 'center', gap: 4, padding: 5 }}>
            {RANGES.map(r => {
              const on = range === r
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: on ? 'var(--arcane-gold)' : 'transparent',
                    color: on ? 'var(--arcane-void)' : 'var(--cmd-text-soft)',
                    fontWeight: on ? 700 : 400,
                    boxShadow: on ? 'var(--magic-glow-gold)' : 'none',
                    transition: 'all .2s',
                  }}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </header>

        {loading && !data ? (
          <p style={{ fontSize: 13, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)' }}>Loading metrics…</p>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18 }}>
              {data.kpis.map(k => <KpiCard key={k.id} kpi={k} />)}
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
              <div style={{ ...glass, padding: '22px 24px', position: 'relative' }}>
                <PanelStripe color="var(--magic-purple)" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cmd-text)', marginBottom: 16 }}>Revenue &amp; Traffic Trend</h2>
                <LineChart data={data.timeseries} />
              </div>
              <div style={{ ...glass, padding: '22px 24px', position: 'relative' }}>
                <PanelStripe color="var(--magic-cyan)" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cmd-text)', marginBottom: 16 }}>Revenue by Channel</h2>
                <BarChart data={data.breakdown} unit="%" />
              </div>
            </div>

            {/* Table */}
            <div style={{ ...glass, padding: '22px 24px', position: 'relative' }}>
              <PanelStripe color="var(--arcane-gold)" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cmd-text)' }}>Channel Performance</h2>
                <p style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: 'var(--cmd-label)' }}>
                  Updated {new Date(data.updatedAt).toLocaleString('en-GB')}
                </p>
              </div>
              <DataTable rows={data.table} />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--red)' }}>Failed to load analytics.</p>
        )}
      </div>
    </div>
  )
}
