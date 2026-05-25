import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiCard from './KpiCard'
import type { Kpi } from './types'

const baht: Kpi = { id: 'rev', label: 'Total Revenue', value: 120000, unit: '฿', delta: 12.4, trend: 'up', color: 'var(--gold)' }
const pct: Kpi = { id: 'rate', label: 'Avg Conv. Rate', value: 3.8, unit: '%', delta: -0.4, trend: 'down', color: 'var(--green)' }
const count: Kpi = { id: 'vis', label: 'Visitors', value: 9500, unit: '', delta: 0, trend: 'flat', color: 'var(--cyan)' }

describe('KpiCard', () => {
  it('renders the label', () => {
    render(<KpiCard kpi={baht} />)
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
  })

  it('formats a baht value with the ฿ prefix and grouping', () => {
    render(<KpiCard kpi={baht} />)
    expect(screen.getByText('฿120,000')).toBeInTheDocument()
  })

  it('formats a percentage value with a % suffix', () => {
    render(<KpiCard kpi={pct} />)
    expect(screen.getByText('3.8%')).toBeInTheDocument()
  })

  it('formats a plain count with grouping and no unit', () => {
    render(<KpiCard kpi={count} />)
    expect(screen.getByText('9,500')).toBeInTheDocument()
  })

  it('shows an up arrow and the absolute delta', () => {
    render(<KpiCard kpi={baht} />)
    expect(screen.getByText(/▲/)).toBeInTheDocument()
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
  })

  it('shows a down arrow for a negative trend using the absolute delta', () => {
    render(<KpiCard kpi={pct} />)
    expect(screen.getByText(/▼/)).toBeInTheDocument()
    expect(screen.getByText(/0\.4%/)).toBeInTheDocument()
  })
})
