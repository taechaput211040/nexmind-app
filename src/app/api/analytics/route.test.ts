import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { RANGE_DAYS } from '@/lib/analytics'
import type { DateRange } from '@/components/analytics/types'

// persistSnapshot touches the filesystem — stub it so route tests stay pure.
vi.mock('@/lib/analytics', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/analytics')>()
  return { ...actual, persistSnapshot: vi.fn().mockResolvedValue(undefined) }
})

import { GET as getAnalytics } from './route'
import { GET as getKpis } from './kpis/route'
import { GET as getTimeseries } from './timeseries/route'
import { GET as getAggregations } from './aggregations/route'
import * as lib from '@/lib/analytics'

const RANGES: DateRange[] = ['7d', '30d', '90d']

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/analytics', () => {
  it.each(RANGES)('returns a raw AnalyticsData snapshot for range=%s', async range => {
    const res = await getAnalytics(req(`/api/analytics?range=${range}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.range).toBe(range)
    expect(body.timeseries).toHaveLength(RANGE_DAYS[range])
    expect(body.kpis.length).toBeGreaterThan(0)
    expect(body.table.length).toBeGreaterThan(0)
    expect(() => new Date(body.updatedAt).toISOString()).not.toThrow()
  })

  it('persists a snapshot on success', async () => {
    await getAnalytics(req('/api/analytics?range=7d'))
    expect(lib.persistSnapshot).toHaveBeenCalledOnce()
  })

  it('falls back to the default range when the param is missing', async () => {
    const res = await getAnalytics(req('/api/analytics'))
    const body = await res.json()
    expect(body.range).toBe(lib.DEFAULT_RANGE)
  })

  it('falls back to the default range when the param is invalid', async () => {
    const res = await getAnalytics(req('/api/analytics?range=bogus'))
    const body = await res.json()
    expect(body.range).toBe(lib.DEFAULT_RANGE)
  })

  it('returns 500 with an error message when building fails', async () => {
    vi.spyOn(lib, 'buildAnalytics').mockImplementation(() => {
      throw new Error('boom')
    })
    const res = await getAnalytics(req('/api/analytics?range=30d'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Failed to build analytics snapshot' })
  })
})

describe('GET /api/analytics/kpis', () => {
  it.each(RANGES)('wraps KPIs in a success envelope for range=%s', async range => {
    const res = await getKpis(req(`/api/analytics/kpis?range=${range}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.range).toBe(range)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    for (const k of body.data) {
      expect(k.color).toMatch(/^var\(--[a-z]+\)$/)
    }
  })

  it('defaults the range when the param is invalid', async () => {
    const res = await getKpis(req('/api/analytics/kpis?range=99x'))
    const body = await res.json()
    expect(body.range).toBe(lib.DEFAULT_RANGE)
  })

  it('returns a 500 failure envelope when computation throws', async () => {
    vi.spyOn(lib, 'buildKpis').mockImplementation(() => {
      throw new Error('boom')
    })
    const res = await getKpis(req('/api/analytics/kpis?range=7d'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to compute KPIs')
  })
})

describe('GET /api/analytics/timeseries', () => {
  it.each(RANGES)('returns one point per day for range=%s', async range => {
    const res = await getTimeseries(req(`/api/analytics/timeseries?range=${range}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(RANGE_DAYS[range])
    for (const p of body.data) {
      expect(p.revenue).toBeGreaterThanOrEqual(0)
      expect(p.visitors).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns a 500 failure envelope when building throws', async () => {
    vi.spyOn(lib, 'buildTimeseries').mockImplementation(() => {
      throw new Error('boom')
    })
    const res = await getTimeseries(req('/api/analytics/timeseries?range=30d'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to build timeseries')
  })
})

describe('GET /api/analytics/aggregations', () => {
  it.each(RANGES)('returns bounded rollups for range=%s', async range => {
    const res = await getAggregations(req(`/api/analytics/aggregations?range=${range}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.range).toBe(range)
    expect(body.data.totalRevenue).toBeGreaterThan(0)
    expect(body.data.conversionRate).toBeGreaterThan(0)
    expect(body.data.conversionRate).toBeLessThanOrEqual(100)
    expect(body.data.breakdown.reduce((s: number, b: { value: number }) => s + b.value, 0)).toBe(100)
  })

  it('returns a 500 failure envelope when aggregation throws', async () => {
    vi.spyOn(lib, 'buildAggregations').mockImplementation(() => {
      throw new Error('boom')
    })
    const res = await getAggregations(req('/api/analytics/aggregations?range=7d'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Failed to compute aggregations')
  })
})
