import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ARIA dispatch prompt — วิเคราะห์ message แล้วเลือก agents ที่เกี่ยวข้อง
const DISPATCH_PROMPT = `You are ARIA, Grand Secretary of NEXMIND AI CO.

Your job: analyze the user's message and decide which agents should respond.

AVAILABLE AGENTS:
- nova: Frontend (React, Next.js, TypeScript, UI/UX code)
- byte: Backend (API, database, server, Node.js, Python)
- rex: Architecture (system design, tech decisions, code review)
- zeta: QA (testing, bugs, quality)
- forge: DevOps (deployment, Docker, CI/CD, infra)
- luna: UX/UI Design (wireframes, user experience, design system)
- pixel: Visual Design (graphics, branding, visual assets)
- reel: Video (video content, editing)
- scout: Research (market research, SEO, trends, keywords)
- ink: Content Writing (articles, blog, copywriting)
- grace: Editing (proofreading, editing content)
- vibe: Social Media (social posts, community)
- hawk: Trading Signals (Gold/Forex analysis, market signals)
- blade: Trade Execution (order execution, trade ops)
- sage: Risk Management (position sizing, risk analysis)
- auto: Algo Trading (automated strategies)
- atlas: Data Analysis (dashboards, reporting, insights)
- memo: Memory (knowledge base, past decisions, context)
- cipher: Intelligence (competitive intel, data gathering)
- coin: Finance (P&L, revenue, budgeting)
- deal: Sales (sales strategy, CRM, leads)
- boost: Ads (advertising, paid media)
- lex: Legal (legal review, compliance)
- nexus: R&D (research, new tech, innovation)
- echo: Voice (voice/audio content)

RULES:
- Return ONLY a JSON array of agent IDs, nothing else
- Max 4 agents per message
- Choose only agents directly relevant to the task
- If it's about code/dev → nova, byte, rex
- If it's about trading/market → hawk, sage
- If it's about content → scout, ink, vibe
- If it's about business/finance → coin, deal
- If it's general company update → aria only (return ["aria"])
- Always include memo if the message involves important decisions

Example output: ["nova","byte","rex"]
Example output: ["hawk","sage"]
Example output: ["scout","ink"]`

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  // dispatch ใช้ Haiku เสมอ — งานแค่เลือก agent ไม่ต้องการ model แรง
  const model = 'claude-haiku-4-5-20251001'

  if (!apiKey) return NextResponse.json({ agents: ['aria'] })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model,
        max_tokens: 60, // แค่ JSON array สั้นๆ
        system: [{ type: 'text', text: DISPATCH_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: message }],
      }),
    })

    const data = await res.json()
    const raw = data.content?.[0]?.text?.trim() ?? '["aria"]'

    // parse JSON array
    const match = raw.match(/\[.*?\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        return NextResponse.json({ agents: parsed.slice(0, 4) })
      }
    }
  } catch { /* fallback */ }

  return NextResponse.json({ agents: ['aria'] })
}
