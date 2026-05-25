import type { BreakdownItem } from './types'

interface Props {
  data: BreakdownItem[]
  /** Unit suffix for the value labels, e.g. '%' */
  unit?: string
}

export default function BarChart({ data, unit = '%' }: Props) {
  if (data.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--cmd-label)' }}>No data</p>
  }
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex flex-col gap-3">
      {data.map(d => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--cmd-text-soft)' }}>{d.label}</span>
            <span className="text-xs font-mono" style={{ color: d.color }}>{d.value}{unit}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--magic-glass)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color, boxShadow: `0 0 8px color-mix(in srgb,${d.color} 40%,transparent)` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
