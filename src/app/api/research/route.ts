import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')

// ── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'ai-tools',
    name: 'AI Tools & Models',
    topic: 'Latest AI language models, coding assistants, and developer AI tools released or updated in 2025. Include specific model names, versions, capabilities, and what makes them notable.',
  },
  {
    id: 'ai-agents',
    name: 'AI Agents & Automation',
    topic: 'AI agent frameworks, multi-agent systems, autonomous coding agents, and workflow automation tools in 2025. Focus on practical architectures, patterns, and real use cases.',
  },
  {
    id: 'dev-ecosystem',
    name: 'Dev Ecosystem',
    topic: 'Next.js, TypeScript, React, and frontend tooling updates in 2025. New libraries, breaking changes, best practices, and performance improvements.',
  },
  {
    id: 'market-trends',
    name: 'Market & Startup Trends',
    topic: 'AI startup funding rounds, new product launches, enterprise AI adoption, and tech industry shifts in 2025. Focus on actionable market intelligence.',
  },
]

// ── CC CLI spawn (uses Max plan OAuth — identical to main pipeline) ──────────
function getEnv() {
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  return env
}

function spawnCC(cwd: string) {
  return spawn(
    'claude',
    ['--print', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions'],
    { cwd, env: getEnv(), shell: true, stdio: ['pipe', 'pipe', 'pipe'] },
  )
}

async function runAgent(prompt: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawnCC(cwd)
    proc.stdin?.write(prompt, 'utf8')
    proc.stdin?.end()

    let buf = '', outputText = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8')
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        try {
          const ev = JSON.parse(line)
          if (ev.type === 'assistant' && ev.message?.content) {
            for (const block of ev.message.content) {
              if (block.type === 'text' && block.text) outputText += block.text
            }
          }
        } catch { /* skip */ }
      }
    })
    proc.on('close', () => resolve(outputText.trim()))
    proc.on('error', reject)
  })
}

// ── Research one category ────────────────────────────────────────────────────
async function researchCategory(
  id: string,
  name: string,
  topic: string,
  cwd: string,
  send: (ev: object) => void,
): Promise<string> {
  send({ type: 'status', text: `SCOUT: Researching ${name}...` })

  // Phase 1: SCOUT researches (uses web_search if available, falls back to knowledge)
  const scoutPrompt = `You are SCOUT — Research & Analysis agent for NEXMIND Command Center.

Your task: Research the following topic and produce a concise knowledge entry.

TOPIC: ${topic}

Instructions:
1. Use your web_search tool to find the most recent and relevant information
2. If web search is unavailable, use your training knowledge — focus on specifics
3. Write a knowledge entry with exactly this structure:

## ${name}
- [specific finding 1 — include name, version, date if known]
- [specific finding 2]
- [specific finding 3]
- [specific finding 4]
- [specific finding 5]
- [specific finding 6 — optional if highly relevant]

Rules:
- Each bullet must be a concrete fact, not a vague statement
- Include tool names, model names, library versions, company names
- Max 6 bullets, min 4 bullets
- No fluff, no hedging, no "it's worth noting that..."
- Language: English only
- Total length: under 200 words`

  const scoutResult = await runAgent(scoutPrompt, cwd)

  // Phase 2: ARIA condenses to final clean format
  send({ type: 'status', text: `ARIA: Condensing ${name}...` })

  const ariaPrompt = `You are ARIA — Executive Secretary of NEXMIND Command Center.

Raw research was just completed on: ${name}

Raw output:
${scoutResult}

Your task: Extract and clean the bullet points into a final knowledge entry.
- Keep only the bullet points (lines starting with -)
- Fix any duplicates or vague bullets
- Ensure each bullet is concrete and actionable
- Max 6 bullets
- Output ONLY the bullet points, no headers, no extra text

Example output format:
- Claude 4 Opus released with 200K context and improved reasoning (May 2025)
- GitHub Copilot adds multi-file editing and test generation features
- Cursor IDE reaches 1M users, adds Claude 3.7 integration`

  const ariaResult = await runAgent(ariaPrompt, cwd)
  return ariaResult
}

// ── Save entry + rebuild index ────────────────────────────────────────────────
async function saveEntry(id: string, name: string, content: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  await fs.mkdir(path.join(KB_DIR, id), { recursive: true })
  await fs.writeFile(
    path.join(KB_DIR, id, `${today}.md`),
    `# ${name} — ${today}\n> Generated by NEXMIND Research Pipeline\n\n${content}\n\n---\n*Auto-generated*\n`,
    'utf8',
  )
}

async function rebuildIndex(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const sections: string[] = []

  for (const cat of CATEGORIES) {
    let files: string[] = []
    try {
      files = (await fs.readdir(path.join(KB_DIR, cat.id)))
        .filter(f => f.endsWith('.md') && !f.startsWith('.'))
        .sort().reverse()
    } catch { continue }
    if (!files.length) continue

    const content = await fs.readFile(path.join(KB_DIR, cat.id, files[0]), 'utf8')
    const bullets = content.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 4).join('\n')
    if (bullets) sections.push(`## ${cat.name} (${files[0].replace('.md', '')})\n${bullets}`)
  }

  await fs.writeFile(
    path.join(KB_DIR, 'index.md'),
    `# NEXMIND Knowledge Index\n> Last updated: ${today} | Auto-generated\n\n<!-- KNOWLEDGE_START -->\n${sections.join('\n\n')}\n<!-- KNOWLEDGE_END -->\n\n---\n*Full entries: knowledge-base/{category}/{date}.md*\n`,
    'utf8',
  )
}

// ── POST — run research pipeline ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { categories: reqCats } = body as { categories?: string[] }
  const toResearch = reqCats ? CATEGORIES.filter(c => reqCats.includes(c.id)) : CATEGORIES
  const cwd = path.resolve(process.cwd())
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }
      try {
        send({ type: 'start', total: toResearch.length })
        for (let i = 0; i < toResearch.length; i++) {
          const cat = toResearch[i]
          send({ type: 'progress', index: i, total: toResearch.length, category: cat.id })
          const summary = await researchCategory(cat.id, cat.name, cat.topic, cwd, send)
          await saveEntry(cat.id, cat.name, summary)
          send({ type: 'saved', category: cat.id, name: cat.name })
        }
        send({ type: 'status', text: 'Rebuilding knowledge index...' })
        await rebuildIndex()
        send({ type: 'done', message: 'Knowledge base updated successfully.' })
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}

// ── GET — list all entries ────────────────────────────────────────────────────
export async function GET() {
  const result: Record<string, { date: string; preview: string }[]> = {}

  for (const cat of CATEGORIES) {
    let files: string[] = []
    try {
      files = (await fs.readdir(path.join(KB_DIR, cat.id)))
        .filter(f => f.endsWith('.md') && !f.startsWith('.'))
        .sort().reverse()
    } catch {
      result[cat.id] = []
      continue
    }
    result[cat.id] = await Promise.all(
      files.slice(0, 10).map(async f => {
        const content = await fs.readFile(path.join(KB_DIR, cat.id, f), 'utf8')
        const preview = content.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 2).join(' ').slice(0, 120)
        return { date: f.replace('.md', ''), preview }
      })
    )
  }

  return Response.json({
    categories: CATEGORIES.map(c => ({ id: c.id, name: c.name, entries: result[c.id] ?? [] })),
  })
}
