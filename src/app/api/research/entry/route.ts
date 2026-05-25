import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const date = url.searchParams.get('date')

  if (!category || !date) {
    return Response.json({ error: 'Missing category or date' }, { status: 400 })
  }

  // Sanitize inputs — no path traversal
  const safeCategory = category.replace(/[^a-z0-9-]/g, '')
  const safeDate = date.replace(/[^0-9-]/g, '')

  const filePath = path.join(KB_DIR, safeCategory, `${safeDate}.md`)

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return Response.json({ content })
  } catch {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }
}
