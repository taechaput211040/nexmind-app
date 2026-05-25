import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsGrid } from './StatsGrid'
import { STATS } from '@/data/affiliate'

describe('StatsGrid', () => {
  it('renders the dashboard section heading', () => {
    render(<StatsGrid />)
    expect(screen.getByText('Stats Dashboard')).toBeInTheDocument()
  })

  it('renders a labelled card for every stat', () => {
    render(<StatsGrid />)
    for (const s of STATS) {
      expect(screen.getByText(s.label)).toBeInTheDocument()
    }
  })

  it('renders each stat delta indicator', () => {
    render(<StatsGrid />)
    for (const s of STATS) {
      expect(screen.getByText(s.delta)).toBeInTheDocument()
    }
  })
})
