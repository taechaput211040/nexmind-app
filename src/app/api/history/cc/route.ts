import { NextRequest, NextResponse } from 'next/server'
import {
  getCCSessions,
  getCCSessionWithMessages,
  upsertCCSession,
  appendCCMessage,
  deleteCCSession,
  type CCSession,
  type CCMessage,
} from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/history/cc                        → list sessions (latest 50)
// GET /api/history/cc?sessionId=xxx          → session + messages
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (sessionId) {
      const session = getCCSessionWithMessages(sessionId)
      if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ session })
    }
    const sessions = getCCSessions(50)
    return NextResponse.json({ sessions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/history/cc
// Body: { session }         — upsert session metadata
// Body: { message }         — append single CC message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      session?: Omit<CCSession, 'messages'>
      message?: CCMessage
    }

    if (body.session) {
      upsertCCSession(body.session)
      return NextResponse.json({ ok: true })
    }

    if (body.message) {
      appendCCMessage(body.message)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Provide session or message' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/history/cc?sessionId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    deleteCCSession(sessionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
