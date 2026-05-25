import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityPanels } from './ActivityPanels'
import { REFERRALS, PAYOUTS } from '@/data/affiliate'

describe('ActivityPanels', () => {
  it('renders both the referrals and payout history headings', () => {
    render(<ActivityPanels />)
    expect(screen.getByText('New Sign-ups')).toBeInTheDocument()
    expect(screen.getByText('Recent Transfers')).toBeInTheDocument()
  })

  it('lists every recent referral by name', () => {
    render(<ActivityPanels />)
    for (const r of REFERRALS) {
      expect(screen.getByText(r.user)).toBeInTheDocument()
    }
  })

  it('renders a dash for referrals with no earned value yet', () => {
    render(<ActivityPanels />)
    const zeroValue = REFERRALS.filter(r => r.value === 0)
    expect(screen.getAllByText('—')).toHaveLength(zeroValue.length)
  })

  it('renders each payout reference and amount', () => {
    render(<ActivityPanels />)
    for (const p of PAYOUTS) {
      expect(screen.getByText(new RegExp(p.ref))).toBeInTheDocument()
      expect(
        screen.getByText(`฿${p.amount.toLocaleString()}`),
      ).toBeInTheDocument()
    }
  })
})
