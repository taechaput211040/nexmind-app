import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/agentPrompts'

export const runtime = 'nodejs'

// ─── Token limits ตาม mode ───────────────────────────────────
const MAX_TOKENS: Record<string, number> = {
  aria:     600,   // orchestrator — ตอบสั้นกระชับ
  dm:       800,   // direct chat — ตอบได้ยาวขึ้น
  allhands: 400,   // group — แต่ละคนตอบสั้นๆ
}

// ─── จำกัด history ส่งไปแค่ N messages ล่าสุด ────────────────
const MAX_HISTORY = 8

export async function POST(req: NextRequest) {
  const { messages, agentId, mode, projectContext } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'
  const systemPrompt = buildSystemPrompt(agentId ?? 'aria', mode ?? 'aria', projectContext)
  const maxTokens = MAX_TOKENS[mode ?? 'dm'] ?? 600

  // ── Trim history — ส่งแค่ N messages ล่าสุด ──
  // role อาจมาเป็น 'taec'|'agent' (จาก Msg type) หรือ 'user'|'assistant' (ถ้า map แล้ว)
  const trimmed = (messages as { role: string; content: string }[])
    .slice(-MAX_HISTORY)
    .map(m => ({
      role: (m.role === 'taec' || m.role === 'user') ? 'user' : 'assistant',
      content: m.content,
    }))

  // ── Ensure alternating roles (Anthropic requires user/assistant alternating) ──
  const formatted: { role: string; content: string }[] = []
  for (const m of trimmed) {
    const last = formatted[formatted.length - 1]
    if (last && last.role === m.role) {
      // merge consecutive same-role messages
      last.content += '\n' + m.content
    } else {
      formatted.push({ ...m })
    }
  }
  // must start with user
  if (formatted.length > 0 && formatted[0].role !== 'user') {
    formatted.shift()
  }

  // ── Prompt caching — ลด cost 90% สำหรับ system prompt ──
  const systemBlock = [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }, // cache system prompt ไว้ 5 นาที
    },
  ]

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31', // enable prompt caching
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemBlock,
      messages: formatted,
      stream: true,
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    return new Response(JSON.stringify({ error: err }), {
      status: anthropicRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Stream SSE ──
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              continue
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`))
              }
              if (parsed.type === 'message_stop') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
