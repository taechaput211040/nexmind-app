import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { quests as seedQuests } from '@/data/agents'

const DATA_FILE = path.join(process.cwd(), 'data', 'quests.json')

async function readQuests() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    // Seed from static data on first run
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(seedQuests, null, 2))
    return seedQuests
  }
}

async function writeQuests(data: unknown) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function GET() {
  const data = await readQuests()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await readQuests()
  const newQuest = {
    ...body,
    id: `q${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  data.push(newQuest)
  await writeQuests(data)
  return NextResponse.json(newQuest, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const data = await readQuests()
  const idx = data.findIndex((q: { id: string }) => q.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
  data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() }
  await writeQuests(data)
  return NextResponse.json(data[idx])
}
