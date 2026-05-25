import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BarChart from './BarChart'
import type { BreakdownItem } from './types'

const data: BreakdownItem[] = [
  { label: 'Affiliate', value: 47, color: 'var(--gold)' },
  { label: 'Content', value: 26, color: 'var(--cyan)' },
  { label: 'Trading', value: 18, color: 'var(--pink)' },
]

describe('BarChart', () => {
  it('renders a labelled bar for every item', () => {
    render(<BarChart data={data} />)
    for (const d of data) {
      expect(screen.getByText(d.label)).toBeInTheDocument()
    }
  })

  it('appends the default % unit to values', () => {
    render(<BarChart data={data} />)
    expect(screen.getByText('47%')).toBeInTheDocument()
  })

  it('honours a custom unit', () => {
    render(<BarChart data={[{ label: 'Revenue', value: 5, color: 'var(--gold)' }]} unit="k" />)
    expect(screen.getByText('5k')).toBeInTheDocument()
  })

  it('renders a fallback when there is no data', () => {
    render(<BarChart data={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
