import { NextRequest, NextResponse } from 'next/server'
import type { TimePoint } from '@/components/analytics/types'
import { ApiResult, buildTimeseries, fail, ok, RANGE_DAYS, resolveRange } from '@/lib/analytics'

export const runtime = 'nodejs'

// GET /api/analytics/timeseries?range=7d|30d|90d
// Daily revenue / visitor series for line charts.
export async function GET(req: NextRequest): Promise<NextResponse<ApiResult<TimePoint[]>>> {
  try {
    const range = resolveRange(req.nextUrl.searchParams.get('range'))
    const series = buildTimeseries(RANGE_DAYS[range])
    return NextResponse.json(ok(series, range))
  } catch (error) {
    console.error('[API:analytics/timeseries] Error:', error)
    return NextResponse.json(fail('Failed to build timeseries'), { status: 500 })
  }
}
