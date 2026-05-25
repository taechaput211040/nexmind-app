# NEXMIND Knowledge Index
> Last updated: 2026-05-25 | Auto-generated

<!-- KNOWLEDGE_START -->
## AI Tools & Models (2026-05-25)
- Claude Opus 4.5 (Anthropic, Nov 2025) — first model >80% on SWE-bench Verified (80.9%); leads agentic/tool-driven coding
- GPT-5.2-Codex (OpenAI, Dec 2025) — agentic coding variant, 80.0% on SWE-bench Verified
- Gemini 3 Pro (Google, Nov 2025) — 1M-token context, multimodal, strong algorithmic + tool use
- Claude Code (Anthropic, Feb 2025) — terminal-native agentic coding tool with autonomous task execution

## AI Agents & Automation (2026-05-25)
- Claude Opus 4.7 (Anthropic) ทำคะแนน SWE-bench Verified 87.6% นำ leaderboard coding agents; Claude Code อ่านทั้ง codebase, plan ข้ามไฟล์, รัน shell + tests
- LangGraph 1.0 (2025) — graph-based stateful workflows, latency ต่ำสุดใน benchmark, เหมาะ production ที่ต้อง state control + human-in-the-loop
- CrewAI — role/goal/backstory abstraction, นิยาม multi-agent ได้ใน <20 บรรทัด Python; barrier เข้าต่ำสุด
- AutoGen รวมเป็น Microsoft Agent Framework (conversational multi-agent + Azure); OpenAI Agents SDK (เม.ย. 2026) เพิ่ม native sandbox execution, MCP, sub-agent handoff

## Dev Ecosystem (2026-05-25)
- Next.js 16 (LTS, Oct 2025): Turbopack เป็น default bundler — production build เร็ว 2–5×, Fast Refresh เร็วถึง 10×
- Next.js 16 breaking: `params`/`cookies()`/`headers()` async-only, `middleware.ts` → `proxy.ts`, ตัด legacy AMP + `next lint`
- Cache Components: directive `"use cache"` แทน implicit caching, compiler gen cache key ให้เอง
- React 19.2 + React Compiler stable: auto-memoization ลด re-render ไม่ต้อง `useMemo`/`useCallback`, Next.js 16 support เต็ม

## Market & Startup Trends (2026-05-25)
- OpenAI raised $40B Series F at $300B valuation (Apr 2025), hit $500B by year-end — largest private valuation ever
- Anthropic closed $13B Series F at $183B post-money, then $30B Series G at $380B post-money (led by GIC, Coatue)
- xAI raised ~$20B Series E at ~$200B valuation
- AI captured ~50% of global VC in 2025 — $211B total, up 85% YoY; mega-rounds ($100M+) were 79% of AI funding
<!-- KNOWLEDGE_END -->

---
*Full entries: knowledge-base/{category}/{date}.md*
