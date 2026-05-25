import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'
import type { TableRow } from './types'

const rows: TableRow[] = [
  { id: 't1', channel: 'Affiliate', agent: 'SCOUT', conversions: 184, revenue: 33120, ctr: 4.2, status: 'active' },
  { id: 't2', channel: 'Content', agent: 'INK', conversions: 97, revenue: 14550, ctr: 3.1, status: 'review' },
  { id: 't3', channel: 'Newsletter', agent: 'INK', conversions: 63, revenue: 9450, ctr: 2.4, status: 'paused' },
]

function bodyChannelOrder() {
  const [, ...bodyRows] = screen.getAllByRole('row') // drop header row
  return bodyRows.map(r => within(r).getAllByRole('cell')[0].textContent)
}

describe('DataTable', () => {
  it('renders one body row per record plus the header', () => {
    render(<DataTable rows={rows} />)
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1)
  })

  it('renders all column headers', () => {
    render(<DataTable rows={rows} />)
    for (const h of ['Channel', 'Conversions', 'Revenue', 'CTR', 'Agent', 'Status']) {
      expect(screen.getByText(h)).toBeInTheDocument()
    }
  })

  it('formats revenue with a ฿ prefix and grouping', () => {
    render(<DataTable rows={rows} />)
    expect(screen.getByText('฿33,120')).toBeInTheDocument()
  })

  it('defaults to revenue descending', () => {
    render(<DataTable rows={rows} />)
    expect(bodyChannelOrder()).toEqual(['Affiliate', 'Content', 'Newsletter'])
  })

  it('toggles sort direction when a column header is clicked', async () => {
    const user = userEvent.setup()
    render(<DataTable rows={rows} />)
    // Revenue is the active sort key; clicking flips it to ascending.
    await user.click(screen.getByText('Revenue'))
    expect(bodyChannelOrder()).toEqual(['Newsletter', 'Content', 'Affiliate'])
  })

  it('sorts by a new numeric column descending on first click', async () => {
    const user = userEvent.setup()
    render(<DataTable rows={rows} />)
    await user.click(screen.getByText('Conversions'))
    expect(bodyChannelOrder()).toEqual(['Affiliate', 'Content', 'Newsletter'])
  })
})
