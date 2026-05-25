import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierProgress } from './TierProgress'
import { getTierProgress, TIER_ORDER, TIER_THRESHOLDS } from '@/data/affiliate'

describe('TierProgress', () => {
  it('renders the remaining gap to the next tier', () => {
    render(<TierProgress />)
    const { gap } = getTierProgress()
    expect(
      screen.getByText(new RegExp(`฿${gap.toLocaleString()}`)),
    ).toBeInTheDocument()
  })

  it('renders every tier in the ladder with its threshold', () => {
    render(<TierProgress />)
    for (const t of TIER_ORDER) {
      // ladder labels render lowercase; uppercasing is CSS-only
      expect(screen.getByText(t)).toBeInTheDocument()
      expect(
        screen.getByText(`฿${TIER_THRESHOLDS[t].toLocaleString()}`),
      ).toBeInTheDocument()
    }
  })

  it('marks the current tier with a NOW badge', () => {
    render(<TierProgress />)
    expect(screen.getByText('NOW')).toBeInTheDocument()
  })
})
