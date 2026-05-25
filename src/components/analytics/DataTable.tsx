'use client'
import { useState } from 'react'
import type { TableRow, RowStatus } from './types'

type SortKey = 'channel' | 'conversions' | 'revenue' | 'ctr'

const statusColor: Record<RowStatus, string> = {
  active: 'var(--arcane-emerald)',
  paused: 'var(--cmd-label)',
  review: 'var(--arcane-gold)',
}

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'channel',     label: 'Channel',     numeric: false },
  { key: 'conversions', label: 'Conversions', numeric: true  },
  { key: 'revenue',     label: 'Revenue',     numeric: true  },
  { key: 'ctr',         label: 'CTR',         numeric: true  },
]

export default function DataTable({ rows }: { rows: TableRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'revenue', dir: 'desc' })

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort.key]
    const bv = b[sort.key]
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv))
    return sort.dir === 'asc' ? cmp : -cmp
  })

  function toggle(key: SortKey) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--cmd-divider)' }}>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                className="py-2 px-3 font-medium cursor-pointer select-none"
                style={{ color: 'var(--cmd-label)', textAlign: col.numeric ? 'right' : 'left' }}
              >
                {col.label}
                {sort.key === col.key && <span className="ml-1 font-mono">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
            <th className="py-2 px-3 font-medium text-left" style={{ color: 'var(--cmd-label)' }}>Agent</th>
            <th className="py-2 px-3 font-medium text-left" style={{ color: 'var(--cmd-label)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--cmd-divider)' }}>
              <td className="py-2.5 px-3" style={{ color: 'var(--cmd-text)' }}>{r.channel}</td>
              <td className="py-2.5 px-3 font-mono text-right" style={{ color: 'var(--cmd-text)' }}>{r.conversions}</td>
              <td className="py-2.5 px-3 font-mono text-right" style={{ color: 'var(--arcane-gold)' }}>฿{r.revenue.toLocaleString('en-US')}</td>
              <td className="py-2.5 px-3 font-mono text-right" style={{ color: 'var(--cmd-text)' }}>{r.ctr}%</td>
              <td className="py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--magic-cyan)' }}>{r.agent}</td>
              <td className="py-2.5 px-3">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: `color-mix(in srgb,${statusColor[r.status]} 14%,transparent)`, color: statusColor[r.status] }}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
