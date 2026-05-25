import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { logEntries as seedLogs } from '@/data/agents'

const DATA_FILE = path.join(process.cwd(), 'data', 'logs.json')

async function readLogs() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(seedLogs, null, 2))
    return seedLogs
  }
}

async function writeLogs(data: unknown) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function GET() {
  const data = await readLogs()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await readLogs()
  const newEntry = {
    ...body,
    id: `log${Date.now()}`,
    timestamp: new Date().toISOString(),
  }
  // Prepend newest first, keep max 200
  data.unshift(newEntry)
  if (data.length > 200) data.splice(200)
  await writeLogs(data)
  return NextResponse.json(newEntry, { status: 201 })
}
