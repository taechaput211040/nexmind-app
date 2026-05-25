import { NextRequest, NextResponse } from 'next/server'
import type { Kpi } from '@/components/analytics/types'
import {
  ApiResult,
  buildKpis,
  buildTable,
  buildTimeseries,
  fail,
  ok,
  RANGE_DAYS,
  resolveRange,
} from '@/lib/analytics'

export const runtime = 'nodejs'

// GET /api/analytics/kpis?range=7d|30d|90d
// Top-line metrics / KPIs for the selected period.
export async function GET(req: NextRequest): Promise<NextResponse<ApiResult<Kpi[]>>> {
  try {
    const range = resolveRange(req.nextUrl.searchParams.get('range'))
    const timeseries = buildTimeseries(RANGE_DAYS[range])
    const kpis = buildKpis(timeseries, buildTable())
    return NextResponse.json(ok(kpis, range))
  } catch (error) {
    console.error('[API:analytics/kpis] Error:', error)
    return NextResponse.json(fail('Failed to compute KPIs'), { status: 500 })
  }
}
