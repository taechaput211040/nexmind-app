// ─── Analytics data contracts ───
// Shared between the API route (src/app/api/analytics/route.ts)
// and the dashboard components.

export type DateRange = '7d' | '30d' | '90d'

export type KpiTrend = 'up' | 'down' | 'flat'

export interface Kpi {
  id: string
  label: string
  value: number
  /** Display unit: '฿', '%', or '' for plain counts */
  unit: string
  /** Percent change vs previous period */
  delta: number
  trend: KpiTrend
  /** CSS variable token, e.g. 'var(--gold)' */
  color: string
}

export interface TimePoint {
  /** ISO date 'YYYY-MM-DD' */
  date: string
  revenue: number
  visitors: number
}

export interface BreakdownItem {
  label: string
  value: number
  /** CSS variable token */
  color: string
}

export type RowStatus = 'active' | 'paused' | 'review'

export interface TableRow {
  id: string
  channel: string
  agent: string
  conversions: number
  revenue: number
  /** Click-through rate, percent */
  ctr: number
  status: RowStatus
}

export interface AnalyticsData {
  range: DateRange
  kpis: Kpi[]
  timeseries: TimePoint[]
  breakdown: BreakdownItem[]
  table: TableRow[]
  /** ISO timestamp */
  updatedAt: string
}
