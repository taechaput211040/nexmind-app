import { NextRequest, NextResponse } from 'next/server'
import { getDMHistory, saveDMMessages, appendDMMessage, clearDMHistory, type DMMessage } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/history/dm?agentId=aria&limit=100
export async function GET(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get('agentId')
    const limit   = parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10)
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    const messages = getDMHistory(agentId, limit)
    return NextResponse.json({ agentId, messages })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/history/dm
// Body: { agentId, messages }   — bulk upsert (replaces all for agent)
// Body: { message }             — append single message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      agentId?: string
      messages?: DMMessage[]
      message?: DMMessage
    }

    if (body.message) {
      // Single message append
      appendDMMessage(body.message)
      return NextResponse.json({ ok: true })
    }

    if (body.agentId && body.messages) {
      // Bulk upsert
      saveDMMessages(body.agentId, body.messages)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Provide message or (agentId + messages)' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/history/dm?agentId=aria
export async function DELETE(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get('agentId')
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    clearDMHistory(agentId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
