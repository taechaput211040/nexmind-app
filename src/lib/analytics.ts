// ─── Analytics data layer ───
// Shared builder + persistence used by every /api/analytics* route.
// Keeps endpoints thin and the data contract in one place.

import { promises as fs } from 'fs'
import path from 'path'
import type {
  AnalyticsData,
  BreakdownItem,
  DateRange,
  Kpi,
  TableRow,
  TimePoint,
} from '@/components/analytics/types'

// ─── API response envelopes ───
// The combined /api/analytics route returns raw AnalyticsData (the dashboard
// client consumes it directly). The granular sub-routes wrap their payloads
// in this typed envelope for explicit success/error discrimination.

export interface ApiSuccess<T> {
  success: true
  range: DateRange
  data: T
  updatedAt: string
}

export interface ApiError {
  success: false
  error: string
  updatedAt: string
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

export function ok<T>(data: T, range: DateRange): ApiSuccess<T> {
  return { success: true, range, data, updatedAt: new Date().toISOString() }
}

export function fail(error: string): ApiError {
  return { success: false, error, updatedAt: new Date().toISOString() }
}

const DATA_FILE = path.join(process.cwd(), 'data', 'analytics.json')

export const RANGE_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

export const DEFAULT_RANGE: DateRange = '30d'

/** Narrow an arbitrary query param to a valid DateRange. */
export function isRange(v: string | null): v is DateRange {
  return v === '7d' || v === '30d' || v === '90d'
}

/** Resolve a query param to a DateRange, falling back to the default. */
export function resolveRange(v: string | null): DateRange {
  return isRange(v) ? v : DEFAULT_RANGE
}

/** Deterministic pseudo-random so charts look organic but stable per day-index. */
function wave(i: number, base: number, amp: number) {
  return Math.round(base + amp * (Math.sin(i * 0.7) + Math.sin(i * 0.23) * 0.6))
}

export function buildTimeseries(days: number): TimePoint[] {
  const out: TimePoint[] = []
  const today = new Date()
  for (let n = days - 1; n >= 0; n--) {
    const d = new Date(today)
    d.setDate(today.getDate() - n)
    const i = days - n
    out.push({
      date: d.toISOString().slice(0, 10),
      revenue: wave(i, 4200, 1400),
      visitors: wave(i + 3, 1850, 520),
    })
  }
  return out
}

export function buildTable(): TableRow[] {
  return [
    { id: 't1', channel: 'Affiliate — Collagen', agent: 'SCOUT', conversions: 184, revenue: 33120, ctr: 4.2, status: 'active' },
    { id: 't2', channel: 'Content — AI Tools',    agent: 'INK',   conversions: 97,  revenue: 14550, ctr: 3.1, status: 'active' },
    { id: 't3', channel: 'XAU/USD Signals',       agent: 'HAWK',  conversions: 42,  revenue: 21000, ctr: 6.8, status: 'review' },
    { id: 't4', channel: 'Newsletter Funnel',     agent: 'INK',   conversions: 63,  revenue: 9450,  ctr: 2.4, status: 'paused' },
    { id: 't5', channel: 'TikTok Organic',        agent: 'SCOUT', conversions: 128, revenue: 7680,  ctr: 5.5, status: 'active' },
  ]
}

export function buildKpis(timeseries: TimePoint[], table: TableRow[]): Kpi[] {
  const totalRevenue = timeseries.reduce((s, p) => s + p.revenue, 0)
  const totalVisitors = timeseries.reduce((s, p) => s + p.visitors, 0)
  const totalConversions = table.reduce((s, r) => s + r.conversions, 0)

  return [
    { id: 'rev',  label: 'Total Revenue',  value: totalRevenue,     unit: '฿', delta: 12.4, trend: 'up',   color: 'var(--gold)' },
    { id: 'vis',  label: 'Visitors',       value: totalVisitors,    unit: '',  delta: 8.1,  trend: 'up',   color: 'var(--cyan)' },
    { id: 'conv', label: 'Conversions',    value: totalConversions, unit: '',  delta: -2.3, trend: 'down', color: 'var(--pink)' },
    { id: 'rate', label: 'Avg Conv. Rate', value: 3.8,              unit: '%', delta: 0.4,  trend: 'up',   color: 'var(--green)' },
  ]
}

export function buildBreakdown(): BreakdownItem[] {
  return [
    { label: 'Affiliate', value: 47, color: 'var(--gold)' },
    { label: 'Content',   value: 26, color: 'var(--cyan)' },
    { label: 'Trading',   value: 18, color: 'var(--pink)' },
    { label: 'Other',     value: 9,  color: 'var(--green)' },
  ]
}

export interface Aggregations {
  totalRevenue: number
  totalVisitors: number
  totalConversions: number
  /** Conversions ÷ visitors, percent (2 dp) */
  conversionRate: number
  /** Mean revenue per day across the period (rounded) */
  avgDailyRevenue: number
  /** Revenue share by channel category */
  breakdown: BreakdownItem[]
}

export function buildAggregations(range: DateRange): Aggregations {
  const timeseries = buildTimeseries(RANGE_DAYS[range])
  const table = buildTable()
  const totalRevenue = timeseries.reduce((s, p) => s + p.revenue, 0)
  const totalVisitors = timeseries.reduce((s, p) => s + p.visitors, 0)
  const totalConversions = table.reduce((s, r) => s + r.conversions, 0)
  const days = timeseries.length || 1
  return {
    totalRevenue,
    totalVisitors,
    totalConversions,
    conversionRate: totalVisitors ? Math.round((totalConversions / totalVisitors) * 10000) / 100 : 0,
    avgDailyRevenue: Math.round(totalRevenue / days),
    breakdown: buildBreakdown(),
  }
}

export function buildAnalytics(range: DateRange): AnalyticsData {
  const timeseries = buildTimeseries(RANGE_DAYS[range])
  const table = buildTable()
  return {
    range,
    kpis: buildKpis(timeseries, table),
    timeseries,
    breakdown: buildBreakdown(),
    table,
    updatedAt: new Date().toISOString(),
  }
}

/** Best-effort snapshot persistence — never throws (mirrors quests route pattern). */
export async function persistSnapshot(data: AnalyticsData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  } catch {
    // non-fatal — caller serves computed data regardless
  }
}
