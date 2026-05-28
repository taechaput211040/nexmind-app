'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AffiliateProduct {
  id: string
  name: string
  icon: string
  commission: number   // % per sale
  color: string
  category: string
}

interface Transaction {
  id: string
  productId: string
  amount: number
  commission: number
  status: 'confirmed' | 'pending' | 'processing'
  ts: string
  source: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const PRODUCTS: AffiliateProduct[] = [
  { id: 'collagen', name: 'Collagen Plus', icon: '💊', commission: 30, color: '#f472b6', category: 'Health' },
  { id: 'course',   name: 'Trading Course', icon: '📚', commission: 40, color: '#f59e0b', category: 'Education' },
  { id: 'vpn',      name: 'VPN Pro',        icon: '🔐', commission: 25, color: '#60a5fa', category: 'Software' },
  { id: 'broker',   name: 'Broker XAU',     icon: '📈', commission: 35, color: '#34d399', category: 'Finance' },
  { id: 'hosting',  name: 'Cloud Hosting',  icon: '☁️',  commission: 20, color: '#a78bfa', category: 'Tech' },
]

const SOURCES = ['Facebook Ads', 'TikTok', 'LINE OA', 'Organic SEO', 'YouTube', 'Instagram']

function genTx(id: number): Transaction {
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
  const amount = Math.floor(Math.random() * 4000) + 500
  const commission = Math.round(amount * (product.commission / 100))
  const statuses: Transaction['status'][] = ['confirmed', 'pending', 'processing']
  const status = Math.random() > 0.3 ? 'confirmed' : statuses[Math.floor(Math.random() * statuses.length)]
  const minsAgo = Math.floor(Math.random() * 180)
  const ts = new Date(Date.now() - minsAgo * 60000)
  return {
    id: `TX${String(id).padStart(4, '0')}`,
    productId: product.id,
    amount, commission, status,
    ts: ts.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
  }
}

// Initial transactions
const INIT_TXS: Transaction[] = Array.from({ length: 12 }, (_, i) => genTx(i + 1))

// ─── Components ───────────────────────────────────────────────────────────────
function StatBox({
  label, value, sub, color, icon,
}: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,.4)', border: `2px solid ${color}55`,
      boxShadow: `3px 3px 0 0 ${color}33`, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--dim)', letterSpacing: 1 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontFamily: "'Space Mono',monospace", color, fontWeight: 700, letterSpacing: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: "'Space Mono',monospace" }}>{sub}</div>}
    </div>
  )
}

const STATUS_COLOR_TX: Record<Transaction['status'], string> = {
  confirmed: '#00ff88',
  pending:   '#f59e0b',
  processing: '#00d4ff',
}
const STATUS_LABEL_TX: Record<Transaction['status'], string> = {
  confirmed:  '✓ CONFIRMED',
  pending:    '◌ PENDING',
  processing: '⚡ PROCESSING',
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AffiliatePage() {
  const [txs, setTxs] = useState<Transaction[]>(INIT_TXS)
  const [txCounter, setTxCounter] = useState(13)
  const [live, setLive] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [time, setTime] = useState('')

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // Simulate incoming transactions
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      setTxCounter(c => {
        const newTx = genTx(c)
        setTxs(prev => [newTx, ...prev].slice(0, 40))
        return c + 1
      })
    }, 5000 + Math.random() * 8000)
    return () => clearInterval(id)
  }, [live])

  const filtered = selectedProduct ? txs.filter(t => t.productId === selectedProduct) : txs
  const confirmed = txs.filter(t => t.status === 'confirmed')
  const totalEarned = confirmed.reduce((sum, t) => sum + t.commission, 0)
  const totalSales = confirmed.reduce((sum, t) => sum + t.amount, 0)
  const pendingEarned = txs.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.commission, 0)
  const todayEarned = Math.round(totalEarned * 0.35)

  const generateReport = useCallback(() => {
    const byProduct: Record<string, { sales: number; commission: number; count: number }> = {}
    confirmed.forEach(tx => {
      const p = PRODUCTS.find(p => p.id === tx.productId)!
      if (!byProduct[tx.productId]) byProduct[tx.productId] = { sales: 0, commission: 0, count: 0 }
      byProduct[tx.productId].sales += tx.amount
      byProduct[tx.productId].commission += tx.commission
      byProduct[tx.productId].count++
    })

    const lines = [
      `NEXMIND AFFILIATE REPORT — ${new Date().toLocaleDateString('th-TH')}`,
      `${'─'.repeat(50)}`,
      ``,
      `📊 OVERVIEW`,
      `  Total Sales:       ฿${totalSales.toLocaleString()}`,
      `  Total Commission:  ฿${totalEarned.toLocaleString()}`,
      `  Today's Earned:    ฿${todayEarned.toLocaleString()}`,
      `  Pending:           ฿${pendingEarned.toLocaleString()}`,
      `  Transactions:      ${txs.length}`,
      ``,
      `📦 BY PRODUCT`,
      ...Object.entries(byProduct).map(([id, data]) => {
        const p = PRODUCTS.find(p => p.id === id)!
        return `  ${p.icon} ${p.name.padEnd(18)} x${data.count} | ฿${data.commission.toLocaleString()} commission`
      }),
      ``,
      `🏆 TOP SOURCE: ${SOURCES[0]}`,
      ``,
      `Generated by NEXMIND COIN agent · ${new Date().toLocaleTimeString('th-TH')}`,
    ]
    setReport(lines.join('\n'))
  }, [confirmed, totalSales, totalEarned, todayEarned, pendingEarned, txs.length])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Space Mono',monospace", paddingBottom: 40 }}>
      {/* Scanlines */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'repeating-linear-gradient(transparent,transparent 3px,rgba(0,0,0,.04) 3px,rgba(0,0,0,.04) 6px)' }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1, background: 'rgba(0,0,0,.65)',
        borderBottom: '2px solid rgba(94,234,212,.35)', padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 2px 0 0 rgba(94,234,212,.12)',
      }}>
        <span style={{ fontSize: 22 }}>💰</span>
        <div>
          <div style={{ fontSize: 13, color: '#5eead4', fontWeight: 700, letterSpacing: 2 }}>AFFILIATE REVENUE OPS</div>
          <div style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 1 }}>REAL-TIME INCOME TRACKER · COIN DEPT</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Live toggle */}
          <button
            onClick={() => setLive(l => !l)}
            style={{
              fontSize: 9, padding: '4px 10px',
              border: `1px solid ${live ? '#00ff8866' : '#ffffff33'}`,
              background: live ? 'rgba(0,255,136,.1)' : 'rgba(255,255,255,.05)',
              color: live ? '#00ff88' : 'var(--dim)',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {live ? '● LIVE' : '○ PAUSED'}
          </button>
          <div style={{ fontSize: 11, color: '#5eead4', letterSpacing: 2 }}>{time}█</div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, maxWidth: 900 }}>
          <StatBox label="TOTAL EARNED" value={`฿${totalEarned.toLocaleString()}`} sub="confirmed commissions" color="#00ff88" icon="💵" />
          <StatBox label="TODAY" value={`฿${todayEarned.toLocaleString()}`} sub="estimated today" color="#5eead4" icon="📅" />
          <StatBox label="PENDING" value={`฿${pendingEarned.toLocaleString()}`} sub="awaiting confirmation" color="#f59e0b" icon="⏳" />
          <StatBox label="TOTAL SALES" value={`฿${totalSales.toLocaleString()}`} sub={`${txs.length} transactions`} color="#60a5fa" icon="📊" />
        </div>

        {/* Product filter */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 9, color: '#5eead4', letterSpacing: 2, borderBottom: '1px solid rgba(94,234,212,.3)', paddingBottom: 4 }}>
            ▸ PRODUCTS — click to filter
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                fontSize: 9, padding: '5px 12px', cursor: 'pointer',
                border: `1px solid ${!selectedProduct ? '#5eead4' : '#ffffff33'}`,
                background: !selectedProduct ? 'rgba(94,234,212,.15)' : 'rgba(255,255,255,.04)',
                color: !selectedProduct ? '#5eead4' : 'var(--dim)', letterSpacing: 1,
              }}
            >ALL ({txs.length})</button>
            {PRODUCTS.map(p => {
              const count = txs.filter(t => t.productId === p.id).length
              const earn = txs.filter(t => t.productId === p.id && t.status === 'confirmed').reduce((s, t) => s + t.commission, 0)
              const isSelected = selectedProduct === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(isSelected ? null : p.id)}
                  style={{
                    fontSize: 9, padding: '5px 12px', cursor: 'pointer',
                    border: `1px solid ${isSelected ? p.color : p.color + '44'}`,
                    background: isSelected ? `${p.color}18` : 'rgba(0,0,0,.3)',
                    color: isSelected ? p.color : 'var(--dim)', letterSpacing: 1,
                    boxShadow: isSelected ? `2px 2px 0 0 ${p.color}33` : 'none',
                  }}
                >
                  {p.icon} {p.name} ({count}) · ฿{earn.toLocaleString()}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, maxWidth: 900 }}>
          {/* Transaction feed */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 9, color: '#5eead4', letterSpacing: 2, borderBottom: '1px solid rgba(94,234,212,.3)', paddingBottom: 4 }}>
              ▸ LIVE FEED — {filtered.length} transactions
              {live && <span style={{ color: '#00ff88', marginLeft: 8 }}>● streaming</span>}
            </p>
            <div style={{
              background: 'rgba(0,0,0,.5)', border: '2px solid rgba(94,234,212,.3)',
              boxShadow: '3px 3px 0 0 rgba(94,234,212,.15)',
              maxHeight: 420, overflowY: 'auto',
            }}>
              {filtered.map((tx, i) => {
                const product = PRODUCTS.find(p => p.id === tx.productId)!
                const stColor = STATUS_COLOR_TX[tx.status]
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderBottom: '1px solid rgba(255,255,255,.04)',
                      background: i === 0 && live ? 'rgba(0,255,136,.04)' : 'transparent',
                      transition: 'background .3s',
                    }}
                  >
                    {/* New badge */}
                    {i === 0 && live && (
                      <span style={{ fontSize: 7, color: '#00ff88', border: '1px solid #00ff8844', padding: '1px 4px', flexShrink: 0 }}>NEW</span>
                    )}
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{product.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                        <span style={{ fontSize: 8, color: 'var(--dim)', marginLeft: 6 }}>{tx.source}</span>
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--dim)', marginTop: 1 }}>
                        {tx.id} · {tx.ts}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: stColor, fontWeight: 700 }}>+฿{tx.commission.toLocaleString()}</div>
                      <div style={{ fontSize: 8, color: stColor }}>{STATUS_LABEL_TX[tx.status]}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Commission rates */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 9, color: '#5eead4', letterSpacing: 2, borderBottom: '1px solid rgba(94,234,212,.3)', paddingBottom: 4 }}>
                ▸ COMMISSION RATES
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRODUCTS.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{p.icon}</span>
                    <div style={{ flex: 1, fontSize: 9, color: 'var(--muted)' }}>{p.name}</div>
                    <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,.08)' }}>
                      <div style={{ width: `${p.commission * 2.5}%`, height: '100%', background: p.color }} />
                    </div>
                    <span style={{ fontSize: 9, color: p.color, minWidth: 28 }}>{p.commission}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Report */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 9, color: '#5eead4', letterSpacing: 2, borderBottom: '1px solid rgba(94,234,212,.3)', paddingBottom: 4 }}>
                ▸ COIN REPORT
              </p>
              <button
                onClick={generateReport}
                style={{
                  width: '100%', fontSize: 10, padding: '8px 12px', cursor: 'pointer',
                  border: '2px solid rgba(94,234,212,.5)', background: 'rgba(94,234,212,.1)',
                  color: '#5eead4', letterSpacing: 1, fontFamily: "'Space Mono',monospace",
                  boxShadow: '3px 3px 0 0 rgba(94,234,212,.2)',
                }}
              >
                💰 GENERATE REPORT
              </button>
              {report && (
                <div style={{
                  marginTop: 8, background: 'rgba(0,0,0,.7)',
                  border: '1px solid rgba(94,234,212,.3)', padding: '10px 12px',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  <pre style={{ margin: 0, fontSize: 9, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {report}
                  </pre>
                </div>
              )}
            </div>

            {/* Agent status */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 9, color: '#5eead4', letterSpacing: 2, borderBottom: '1px solid rgba(94,234,212,.3)', paddingBottom: 4 }}>
                ▸ FINANCE TEAM STATUS
              </p>
              {[
                { name: 'COIN', icon: '💰', status: 'online',  msg: 'tracking revenue...' },
                { name: 'DEAL', icon: '🤝', status: 'busy',    msg: 'closing partner deal...' },
                { name: 'BOOST', icon: '📈', status: 'idle',   msg: 'ads paused' },
              ].map(ag => (
                <div key={ag.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ fontSize: 14 }}>{ag.icon}</span>
                  <span style={{ fontSize: 9, color: '#5eead4', fontWeight: 700, minWidth: 40 }}>{ag.name}</span>
                  <div style={{
                    width: 6, height: 6, flexShrink: 0,
                    background: ag.status === 'online' ? '#00ff88' : ag.status === 'busy' ? '#00d4ff' : '#f59e0b',
                  }} />
                  <span style={{ fontSize: 8, color: 'var(--dim)' }}>{ag.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
