import type { TimePoint } from './types'

interface Props {
  data: TimePoint[]
}

const W = 720
const H = 240
const PAD = { top: 16, right: 16, bottom: 28, left: 16 }

interface Series {
  key: 'revenue' | 'visitors'
  label: string
  color: string
}

const SERIES: Series[] = [
  { key: 'revenue',  label: 'Revenue (฿)', color: 'var(--arcane-gold)' },
  { key: 'visitors', label: 'Visitors',    color: 'var(--magic-cyan)' },
]

function pointsFor(data: TimePoint[], key: Series['key']) {
  const xs = data.map((_, i) => PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right))
  const vals = data.map(d => d[key])
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const span = max - min || 1
  const ys = vals.map(v => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom))
  return xs.map((x, i) => ({ x, y: ys[i] }))
}

export default function LineChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--cmd-label)' }}>No data</p>
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: 'var(--cmd-text-soft)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} role="img" aria-label="Revenue and visitors over time">
        {/* horizontal gridlines */}
        {[0.25, 0.5, 0.75].map(f => {
          const y = PAD.top + f * (H - PAD.top - PAD.bottom)
          return <line key={f} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--cmd-divider)" strokeWidth={0.5} opacity={0.6} />
        })}

        {SERIES.map(s => {
          const pts = pointsFor(data, s.key)
          const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          const area = `${line} L${pts[pts.length - 1].x},${H - PAD.bottom} L${pts[0].x},${H - PAD.bottom} Z`
          return (
            <g key={s.key}>
              <path d={area} fill={s.color} opacity={0.08} />
              <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}

        {/* x-axis end labels */}
        <text x={PAD.left} y={H - 8} fontSize={10} fill="var(--cmd-label)" fontFamily="monospace">{data[0].date.slice(5)}</text>
        <text x={W - PAD.right} y={H - 8} fontSize={10} fill="var(--cmd-label)" fontFamily="monospace" textAnchor="end">{data[data.length - 1].date.slice(5)}</text>
      </svg>
    </div>
  )
}
