import { NextRequest, NextResponse } from 'next/server'
import type { AnalyticsData } from '@/components/analytics/types'
import { buildAnalytics, persistSnapshot, resolveRange } from '@/lib/analytics'

export const runtime = 'nodejs'

// GET /api/analytics?range=7d|30d|90d
// Combined snapshot consumed directly by the dashboard client.
// Returns raw AnalyticsData (not the envelope) to preserve the existing contract.
export async function GET(req: NextRequest): Promise<NextResponse<AnalyticsData | { error: string }>> {
  try {
    const range = resolveRange(req.nextUrl.searchParams.get('range'))
    const data = buildAnalytics(range)
    await persistSnapshot(data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API:analytics] Error:', error)
    return NextResponse.json({ error: 'Failed to build analytics snapshot' }, { status: 500 })
  }
}
