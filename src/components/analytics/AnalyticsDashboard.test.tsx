import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnalyticsDashboard from './AnalyticsDashboard'
import { buildAnalytics } from '@/lib/analytics'
import type { DateRange } from './types'

// Capture the range each request asks for so we can assert filter wiring.
const requested: DateRange[] = []

function mockFetch() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    const range = (new URL(url, 'http://localhost').searchParams.get('range') ?? '30d') as DateRange
    requested.push(range)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(buildAnalytics(range)),
    } as Response)
  })
}

describe('AnalyticsDashboard (integration)', () => {
  beforeEach(() => {
    requested.length = 0
    vi.stubGlobal('fetch', mockFetch())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the default range on mount and renders the header', async () => {
    render(<AnalyticsDashboard />)
    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(requested[0]).toBe('30d')
  })

  it('renders a KPI card for every metric once loaded', async () => {
    render(<AnalyticsDashboard />)
    const expected = buildAnalytics('30d').kpis
    // 'Visitors' also appears as a chart legend, so match one-or-more.
    for (const k of expected) {
      expect((await screen.findAllByText(k.label)).length).toBeGreaterThan(0)
    }
  })

  it('renders the charts and channel table sections', async () => {
    render(<AnalyticsDashboard />)
    expect(await screen.findByText('Revenue & Traffic Trend')).toBeInTheDocument()
    expect(screen.getByText('Revenue by Channel')).toBeInTheDocument()
    expect(screen.getByText('Channel Performance')).toBeInTheDocument()
  })

  it('renders a row for every channel from the snapshot', async () => {
    render(<AnalyticsDashboard />)
    const table = buildAnalytics('30d').table
    for (const r of table) {
      expect(await screen.findByText(r.channel)).toBeInTheDocument()
    }
  })

  it('refetches with the selected range when a filter is clicked', async () => {
    const user = userEvent.setup()
    render(<AnalyticsDashboard />)
    await screen.findByRole('heading', { name: 'Analytics' })

    await user.click(screen.getByRole('button', { name: '7d' }))
    await waitFor(() => expect(requested).toContain('7d'))
  })

  it('shows an error message when the snapshot fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))))
    render(<AnalyticsDashboard />)
    expect(await screen.findByText('Failed to load analytics.')).toBeInTheDocument()
  })

  it('exposes the three range filters', async () => {
    render(<AnalyticsDashboard />)
    await screen.findByRole('heading', { name: 'Analytics' })
    for (const r of ['7d', '30d', '90d']) {
      expect(screen.getByRole('button', { name: r })).toBeInTheDocument()
    }
  })

  it('formats the revenue total inside the KPI grid', async () => {
    render(<AnalyticsDashboard />)
    const rev = buildAnalytics('30d').kpis.find(k => k.id === 'rev')!
    const label = await screen.findByText('Total Revenue')
    const card = label.closest('div')!.parentElement!
    expect(within(card).getByText(`฿${rev.value.toLocaleString('en-US')}`)).toBeInTheDocument()
  })
})
