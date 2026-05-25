import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CommissionTable } from './CommissionTable'
import { COMMISSIONS } from '@/data/affiliate'

describe('CommissionTable', () => {
  it('renders every column header', () => {
    render(<CommissionTable />)
    for (const h of ['PRODUCT', 'TIER', 'RATE', 'SALES', 'EARNED', 'STATUS']) {
      expect(screen.getByText(h)).toBeInTheDocument()
    }
  })

  it('renders one row per commission record', () => {
    render(<CommissionTable />)
    // header row + one row per commission
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(COMMISSIONS.length + 1)
  })

  it('renders each product name', () => {
    render(<CommissionTable />)
    for (const c of COMMISSIONS) {
      expect(screen.getByText(c.product)).toBeInTheDocument()
    }
  })

  it('formats a negative commission with a leading minus sign', () => {
    render(<CommissionTable />)
    const negative = COMMISSIONS.find(c => c.earned < 0)!
    const row = screen.getByText(negative.product).closest('tr')!
    expect(
      within(row).getByText(`-฿${Math.abs(negative.earned).toLocaleString()}`),
    ).toBeInTheDocument()
  })
})
