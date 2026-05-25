import { describe, it, expect } from 'vitest'
import {
  RANGE_DAYS,
  DEFAULT_RANGE,
  isRange,
  resolveRange,
  buildTimeseries,
  buildTable,
  buildKpis,
  buildBreakdown,
  buildAggregations,
  buildAnalytics,
  ok,
  fail,
} from './analytics'
import type { DateRange } from '@/components/analytics/types'

const RANGES: DateRange[] = ['7d', '30d', '90d']

describe('range helpers', () => {
  it('narrows valid range strings', () => {
    expect(isRange('7d')).toBe(true)
    expect(isRange('30d')).toBe(true)
    expect(isRange('90d')).toBe(true)
  })

  it('rejects invalid range strings', () => {
    expect(isRange('1d')).toBe(false)
    expect(isRange(null)).toBe(false)
    expect(isRange('')).toBe(false)
  })

  it('resolves valid ranges through and falls back otherwise', () => {
    expect(resolveRange('7d')).toBe('7d')
    expect(resolveRange('bogus')).toBe(DEFAULT_RANGE)
    expect(resolveRange(null)).toBe(DEFAULT_RANGE)
  })
})

describe('buildTimeseries', () => {
  it.each(RANGES)('emits one ascending-date point per day for %s', range => {
    const series = buildTimeseries(RANGE_DAYS[range])
    expect(series).toHaveLength(RANGE_DAYS[range])
    const dates = series.map(p => p.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('produces non-negative revenue and visitors', () => {
    for (const p of buildTimeseries(30)) {
      expect(p.revenue).toBeGreaterThanOrEqual(0)
      expect(p.visitors).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('buildKpis', () => {
  it('derives totals from the timeseries and table', () => {
    const series = buildTimeseries(RANGE_DAYS['30d'])
    const table = buildTable()
    const kpis = buildKpis(series, table)

    const rev = kpis.find(k => k.id === 'rev')!
    const conv = kpis.find(k => k.id === 'conv')!
    expect(rev.value).toBe(series.reduce((s, p) => s + p.revenue, 0))
    expect(conv.value).toBe(table.reduce((s, r) => s + r.conversions, 0))
  })

  it('uses CSS variable color tokens for every KPI', () => {
    for (const k of buildKpis(buildTimeseries(7), buildTable())) {
      expect(k.color).toMatch(/^var\(--[a-z]+\)$/)
    }
  })
})

describe('buildBreakdown', () => {
  it('returns shares that sum to 100', () => {
    const total = buildBreakdown().reduce((s, b) => s + b.value, 0)
    expect(total).toBe(100)
  })
})

describe('buildAggregations', () => {
  it('matches the standalone builders for the same range', () => {
    const agg = buildAggregations('30d')
    const series = buildTimeseries(RANGE_DAYS['30d'])
    const table = buildTable()
    expect(agg.totalRevenue).toBe(series.reduce((s, p) => s + p.revenue, 0))
    expect(agg.totalConversions).toBe(table.reduce((s, r) => s + r.conversions, 0))
    expect(agg.avgDailyRevenue).toBe(Math.round(agg.totalRevenue / series.length))
  })

  it('computes conversion rate as a bounded percentage', () => {
    const agg = buildAggregations('7d')
    expect(agg.conversionRate).toBeGreaterThan(0)
    expect(agg.conversionRate).toBeLessThanOrEqual(100)
  })
})

describe('buildAnalytics', () => {
  it.each(RANGES)('returns a coherent snapshot for %s', range => {
    const data = buildAnalytics(range)
    expect(data.range).toBe(range)
    expect(data.timeseries).toHaveLength(RANGE_DAYS[range])
    expect(data.kpis.length).toBeGreaterThan(0)
    expect(data.table.length).toBeGreaterThan(0)
    expect(() => new Date(data.updatedAt).toISOString()).not.toThrow()
  })
})

describe('response envelopes', () => {
  it('wraps success payloads', () => {
    const res = ok([1, 2, 3], '7d')
    expect(res.success).toBe(true)
    expect(res.range).toBe('7d')
    expect(res.data).toEqual([1, 2, 3])
  })

  it('wraps failures', () => {
    const res = fail('boom')
    expect(res.success).toBe(false)
    expect(res.error).toBe('boom')
  })
})
