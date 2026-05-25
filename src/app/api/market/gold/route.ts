// ═══════════════════════════════════════
// API: GOLD MARKET ANALYSIS
// Endpoint: /api/market/gold
// ═══════════════════════════════════════

import { NextResponse } from 'next/server';
import { getCurrentGoldAnalysis } from '@/data/goldMarketAnalysis';

export async function GET() {
  try {
    const analysis = getCurrentGoldAnalysis();

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API:Gold] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch gold market analysis',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════
// FUTURE: POST for custom analysis params
// ═══════════════════════════════════════
// export async function POST(request: Request) {
//   const body = await request.json();
//   const { timeframe, includeOptions } = body;
//   // ... custom analysis logic
// }
