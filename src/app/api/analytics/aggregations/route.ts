import { NextRequest, NextResponse } from 'next/server'
import { Aggregations, ApiResult, buildAggregations, fail, ok, resolveRange } from '@/lib/analytics'

export const runtime = 'nodejs'

// GET /api/analytics/aggregations?range=7d|30d|90d
// Rolled-up totals + revenue-share breakdown for the selected period.
export async function GET(req: NextRequest): Promise<NextResponse<ApiResult<Aggregations>>> {
  try {
    const range = resolveRange(req.nextUrl.searchParams.get('range'))
    const aggregations = buildAggregations(range)
    return NextResponse.json(ok(aggregations, range))
  } catch (error) {
    console.error('[API:analytics/aggregations] Error:', error)
    return NextResponse.json(fail('Failed to compute aggregations'), { status: 500 })
  }
}
