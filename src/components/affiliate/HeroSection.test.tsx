import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HeroSection } from './HeroSection'
import { REFERRAL_LINK, CURRENT_EARNINGS } from '@/data/affiliate'

describe('HeroSection', () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } })
  })

  it('renders the referral link and lifetime earnings', () => {
    render(<HeroSection />)
    expect(screen.getByText(REFERRAL_LINK)).toBeInTheDocument()
    expect(
      screen.getByText(`฿${CURRENT_EARNINGS.toLocaleString()}`),
    ).toBeInTheDocument()
  })

  it('copies the referral link to the clipboard on click', async () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByText(/COPY LINK/i))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(REFERRAL_LINK))
  })

  it('shows COPIED confirmation feedback after a successful copy', async () => {
    render(<HeroSection />)
    expect(screen.getByText(/COPY LINK/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/COPY LINK/i))
    expect(await screen.findByText(/COPIED/i)).toBeInTheDocument()
  })
})
