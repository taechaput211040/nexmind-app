import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LineChart from './LineChart'
import type { TimePoint } from './types'

const data: TimePoint[] = [
  { date: '2026-05-01', revenue: 4200, visitors: 1800 },
  { date: '2026-05-02', revenue: 4600, visitors: 1900 },
  { date: '2026-05-03', revenue: 5100, visitors: 2050 },
]

describe('LineChart', () => {
  it('renders a labelled accessible svg', () => {
    render(<LineChart data={data} />)
    expect(screen.getByRole('img', { name: /revenue and visitors over time/i })).toBeInTheDocument()
  })

  it('renders both series legends', () => {
    render(<LineChart data={data} />)
    expect(screen.getByText('Revenue (฿)')).toBeInTheDocument()
    expect(screen.getByText('Visitors')).toBeInTheDocument()
  })

  it('labels the first and last dates on the x-axis', () => {
    render(<LineChart data={data} />)
    expect(screen.getByText('05-01')).toBeInTheDocument()
    expect(screen.getByText('05-03')).toBeInTheDocument()
  })

  it('renders a fallback when there is no data', () => {
    render(<LineChart data={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
