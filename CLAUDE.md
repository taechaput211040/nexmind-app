@AGENTS.md

# NEXMIND Command Center — Claude Code Config

## Project Stack
- Next.js 16 App Router · TypeScript · Tailwind CSS v4
- **NO tailwind.config.ts** — Tailwind v4 is CSS-only
- Theme/colors → `src/app/globals.css` (CSS variables: --purple, --pink, --cyan etc.)
- Inline styles use `var(--variable)`, not Tailwind color classes
- Pages → `src/app/[name]/page.tsx` | Components → `src/components/`
- API routes → `src/app/api/[name]/route.ts`
- Windows environment — use Node.js `fs` not Unix shell commands

## Agent Roles
Act as the appropriate specialist based on the task:

| Agent | Role | Trigger |
|-------|------|---------|
| **NOVA** | Frontend: React, Next.js, TSX, components | UI changes, pages, components |
| **PIXEL** | Design: CSS variables, colors, themes | Colors, theme, visual styling |
| **BYTE** | Backend: API routes, server logic, persistence | API, data, streaming |
| **REX** | Architect: Plan structure, delegate implementation | Complex multi-system tasks |
| **ARIA** | Pipeline: Orchestrate multi-agent workflows | `/pipeline` command |

## Slash Commands

| Command | Agent | Use when |
|---------|-------|----------|
| `/nova <task>` | NOVA | Build/fix a UI component or page |
| `/pixel <task>` | PIXEL | Change colors, theme, or CSS variables |
| `/byte <task>` | BYTE | Create/fix an API route or backend logic |
| `/rex <task>` | REX | Plan + execute a multi-file feature |
| `/pipeline <task>` | ARIA | Full-stack task needing multiple agents |
| `/tsc` | — | Run TypeScript check + auto-fix all errors |
| `/review [file]` | — | Code review + auto-fix critical issues |

## Pipeline Rules (for /pipeline)
- Color/theme → PIXEL → NOVA
- New feature → REX → BYTE → NOVA
- API only → BYTE
- UI only → NOVA
- Full-stack → REX → BYTE → NOVA

## Rules
- Act immediately — no confirmation needed
- Write files directly via tools
- Run `npx tsc --noEmit` after writing TS, fix errors automatically
- Keep explanations brief
- Read existing files before modifying
- Never hardcode hex colors — use CSS variables

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
