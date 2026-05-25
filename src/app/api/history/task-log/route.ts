import { NextRequest, NextResponse } from 'next/server'
import { getTaskLog, addTaskLogEntry, type TaskLogEntryParsed } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/history/task-log?limit=100
export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10)
    const entries = getTaskLog(limit)
    return NextResponse.json({ entries })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/history/task-log
// Body: { entry: TaskLogEntryParsed }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { entry: TaskLogEntryParsed }
    if (!body.entry) return NextResponse.json({ error: 'entry required' }, { status: 400 })
    addTaskLogEntry(body.entry)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
