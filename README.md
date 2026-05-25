# NEXMIND Command Center

> **Your AI guild, commanded from one bridge.**
> A multi-agent operations console built on Next.js 16 + Claude.
> 26 specialist agents across 8 departments, with chat, mission board,
> analytics, knowledge base, and a live research pipeline — all in one
> Futuristic-Arcane themed dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Claude](https://img.shields.io/badge/Claude-Anthropic-d97757)](https://www.anthropic.com/)

---

## Table of Contents

1. [What is NEXMIND?](#what-is-nexmind)
2. [Highlights](#highlights)
3. [Tech Stack](#tech-stack)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Available Scripts](#available-scripts)
7. [The Guild — Agents & Departments](#the-guild--agents--departments)
8. [Pages / Routes](#pages--routes)
9. [API Routes](#api-routes)
10. [Project Structure](#project-structure)
11. [Data Layer](#data-layer)
12. [Knowledge Base & Research Pipeline](#knowledge-base--research-pipeline)
13. [Theming — Futuristic Arcane (Dark Nebula)](#theming--futuristic-arcane-dark-nebula)
14. [Working with Claude Code](#working-with-claude-code)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Troubleshooting](#troubleshooting)
18. [License](#license)

---

## What is NEXMIND?

**NEXMIND Command Center** is a single-operator cockpit for running an AI "guild" —
a roster of specialist Claude agents (frontend dev, designer, backend, trader,
analyst, content writer, etc.) that you can chat with, dispatch missions to,
schedule, and monitor from one place.

It is built for one human commander ("TAEC") to orchestrate many AI workers
without context-switching across browser tabs, terminals, and chat windows.

```
   ┌─────────────────────────────────────────────────────────┐
   │                  TAEC (the commander)                   │
   └────────────────────────┬────────────────────────────────┘
                            │
                            ▼
   ┌─────────────────────────────────────────────────────────┐
   │              NEXMIND Command Center  (this app)         │
   │  Dashboard · Chat · Quests · Scheduler · Analytics ...  │
   └────────────────────────┬────────────────────────────────┘
                            │ Claude SDK + Claude Code CLI
                            ▼
   ┌─────────────────────────────────────────────────────────┐
   │  ARIA  NOVA  PIXEL  BYTE  REX  HAWK  BLADE  ATLAS  ...  │
   │              (26 agents · 8 departments)                │
   └─────────────────────────────────────────────────────────┘
```

---

## Highlights

- **Unified chat** with any agent (DM mode) or the whole guild (War Council)
- **Quest board** — propose tasks, approve them, dispatch to the right agent
- **Live agent roster** with department colors, status (online/busy/idle), model tier (Opus/Sonnet/Haiku)
- **Code execution** via the Claude Code CLI (`/api/claude-code`) — agents can read repos, run shell, edit files
- **Analytics dashboard** — KPI cards, time series, aggregations over agent activity
- **Workspace browser** — explore connected git repos, run diffs, clone, push
- **Mission Log** — append-only audit trail of every agent action
- **Knowledge Base** auto-refreshed by a daily research pipeline
- **SQLite persistence** (`better-sqlite3`) — zero infra, ships with the app
- **Theming via CSS variables only** — Tailwind v4 CSS-first config, no `tailwind.config.ts`
- **Futuristic-Arcane "Dark Nebula"** aesthetic — glass panels, purple/cyan/gold glow

---

## Tech Stack

| Layer            | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Framework        | **Next.js 16.2** (App Router, Turbopack, async params/cookies/headers) |
| UI Runtime       | **React 19.2** (+ React Compiler)                                      |
| Language         | **TypeScript 5**                                                       |
| Styling          | **Tailwind CSS v4** (CSS-only config in `globals.css`)                 |
| Database         | **SQLite** via `better-sqlite3` (WAL mode)                             |
| AI SDK           | **`@anthropic-ai/sdk`** (Claude Haiku 4.5 / Sonnet / Opus)             |
| Code agents      | **Claude Code CLI** (spawned subprocess, OAuth from Max plan)          |
| Doc parsing      | `pdf-parse`, `mammoth` (DOCX), `xlsx`                                  |
| Tests            | **Vitest** + Testing Library + jsdom                                   |
| Lint             | ESLint 9 + `eslint-config-next`                                        |
| Knowledge graph  | **Graphify** (`graphify-out/`)                                         |

---

## Quick Start

### Prerequisites

- **Node.js 20+** (LTS)
- **npm** (or pnpm/yarn — `package-lock.json` is included)
- **Windows / macOS / Linux** — the app uses Node `fs` only, no Unix shell deps
- *(optional)* **Claude Code CLI** if you want code-agent features (`/api/claude-code`, `/api/research`)
- *(optional)* **`gh` CLI** for the workspace git features

### Install & run

```bash
# 1) clone
git clone https://github.com/taechaput211040/nexmind-app.git
cd nexmind-app

# 2) install
npm install

# 3) configure
cp .env.local.example .env.local
# then edit .env.local — at minimum set ANTHROPIC_API_KEY

# 4) start the dev server
npm run dev
```

Open <http://localhost:3000> → you should see the **Command Bridge** dashboard.

> First run will create `data/nexmind.db` automatically (SQLite, WAL mode).

---

## Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

| Variable             | Required | Description                                                           |
| -------------------- | :------: | --------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  |    ✅    | Claude API key from <https://console.anthropic.com>                   |
| `CLAUDE_MODEL`       |    ➖    | Default chat model (e.g. `claude-haiku-4-5-20251001`)                 |
| `CLAUDE_CODE_MODEL`  |    ➖    | Override model used when spawning Claude Code (Opus/Sonnet for code)  |

> ⚠️ `.env.local` is **gitignored** — never commit your key.
> The research pipeline (`/api/research`) intentionally **strips**
> `ANTHROPIC_API_KEY` before spawning Claude Code, so the CLI's own Max-plan
> OAuth is used. Don't rely on the env var being present in spawned children.

---

## Available Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Next.js dev server (Turbopack) on `http://localhost:3000` |
| `npm run build`      | Production build                                          |
| `npm run start`      | Run the production build                                  |
| `npm run lint`       | ESLint                                                    |
| `npm test`           | Run Vitest once                                           |
| `npm run test:watch` | Vitest in watch mode                                      |

---

## The Guild — Agents & Departments

NEXMIND ships with **26 agents** spread across **8 departments**. Each agent has
an id, tier (`LEGENDARY` / `EPIC` / `RARE`), default model (`opus` / `sonnet` /
`haiku`), domain ownership, and a referral map (who to delegate to).

| Department       | Color token        | Members (examples)                       |
| ---------------- | ------------------ | ---------------------------------------- |
| 🔮 Secretary     | `--dept-secretary` | **ARIA** (Grand Secretary / orchestrator) |
| ⚒️ Dev Forge     | `--dept-dev`       | **REX**, **NOVA**, **BYTE**, ZETA, FORGE |
| 🎨 Design        | `--dept-design`    | **LUNA**, **PIXEL**, REEL                |
| 📝 Content       | `--dept-content`   | SCOUT, INK, GRACE, VIBE                  |
| 📈 Trading       | `--dept-trading`   | **HAWK**, **BLADE**, SAGE, AUTO          |
| 🧠 Intelligence  | `--dept-intel`     | **ATLAS**, MEMO, CIPHER                  |
| 💰 Finance       | `--dept-finance`   | COIN, DEAL, BOOST                        |
| ⚙️ Systems       | `--dept-systems`   | LEX, NEXUS, ECHO                         |

The full roster lives in [`src/data/agents.ts`](src/data/agents.ts).
Per-agent system prompts and routing rules are in
[`src/lib/agentPrompts.ts`](src/lib/agentPrompts.ts).

### Global rules (apply to every agent)

```
1. TAEC is the boss
2. Reply in the same language TAEC used (TH / EN / mixed)
3. Be concise and to the point
4. Surface problems immediately — don't hide, don't guess
5. No hallucination
```

---

## Pages / Routes

All pages live under `src/app/`. The sidebar is defined in
[`src/components/Sidebar.tsx`](src/components/Sidebar.tsx).

| Icon | Page              | Path             | What it does                                          |
| :--: | ----------------- | ---------------- | ----------------------------------------------------- |
| ⚡   | Command Bridge    | `/`              | Dashboard — KPIs, recent log, agent grid              |
| 🗺️  | The Realm         | `/map`           | Visual map of the guild & departments                 |
| ⚔️  | War Council       | `/guild-room`    | Multi-agent group chat                                |
| 👥  | The Guild         | `/roster`        | Full agent roster with filters                        |
| 📋  | Mission Board     | `/quests`        | Propose / approve / dispatch quests                   |
| ⏰  | Chrono Tower      | `/scheduler`     | Schedule recurring jobs                               |
| 📜  | Scroll Vault      | `/scroll-vault`  | Long-term memory & notes                              |
| 🔭  | Watchtower        | `/observatory`   | Live tail of agent activity                           |
| 📊  | Intel Deck        | `/analytics`     | KPIs, time series, aggregations                       |
| 📡  | Chronicle         | `/mission-log`   | Append-only audit log of every action                 |
| ⚙️  | Settings          | `/settings`      | App settings                                          |
| 💸  | Affiliate         | `/affiliate`     | Affiliate / referral tracker                          |

---

## API Routes

Every route is a Next.js App Router handler in `src/app/api/<name>/route.ts`.

### Conversations

- `POST /api/chat` — Stream a Claude completion for a single message
- `POST /api/dm` — Direct-message a specific agent (persists to SQLite)
- `POST /api/agent` — One-shot agent task
- `POST /api/dispatch` — Hand a task to ARIA, who routes to the right agent
- `GET  /api/history/dm` — Fetch DM history for an agent
- `GET  /api/history/cc` — Fetch Claude Code session history
- `GET  /api/history/task-log` — Fetch task log

### Quests, logs, tasks

- `GET / POST /api/quests` — list / create quests
- `GET / POST /api/task` — task lifecycle
- `GET  /api/logs` — recent log entries

### Workspace (git repos)

- `GET  /api/workspace` — list workspaces
- `GET  /api/workspace/files` — file tree
- `GET  /api/workspace/file-content` — read a file
- `GET  /api/workspace/diff` — git diff
- `GET  /api/workspace/git` — git status / log
- `POST /api/workspace/clone` — clone a repo
- `POST /api/workspace/graphify` — run Graphify on a workspace
- `GET  /api/workspace/browse` — browse contents
- `GET  /api/workspace/context` — assemble context for an agent
- `POST /api/git` — generic git op
- `POST /api/read-file` / `POST /api/write-file` — file I/O

### Analytics

- `GET /api/analytics` — overall payload
- `GET /api/analytics/kpis` — KPI cards
- `GET /api/analytics/timeseries` — line/area data
- `GET /api/analytics/aggregations` — grouped breakdowns

### Research & market

- `POST /api/research` — **SSE stream**. Runs the daily knowledge-base update.
  Emits `{type:"status"}`, `{type:"saved",category}`, `{type:"done"}`, `{type:"error"}`.
- `POST /api/research/entry` — Save a single research entry
- `GET  /api/market/gold` — Gold (XAU) market snapshot

### Execution

- `POST /api/claude-code` — Spawn the Claude Code CLI for an agent task
- `POST /api/terminal` — Run a shell command

---

## Project Structure

```
nexmind-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Command Bridge (dashboard)
│   │   ├── layout.tsx            # Root layout (sidebar + theme)
│   │   ├── globals.css           # Tailwind v4 + CSS variables (THE theme file)
│   │   ├── api/                  # API routes (see above)
│   │   ├── analytics/            # /analytics
│   │   ├── guild-room/           # /guild-room (group chat)
│   │   ├── map/  roster/  quests/  scheduler/
│   │   ├── scroll-vault/  observatory/  mission-log/
│   │   ├── settings/  affiliate/
│   ├── components/               # Reusable UI
│   │   ├── Sidebar.tsx
│   │   ├── AgentChat.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── Panel.tsx
│   │   ├── PipelineToast.tsx
│   │   ├── StatCard.tsx
│   │   ├── affiliate/
│   │   └── analytics/
│   ├── data/                     # Static seed data
│   │   ├── agents.ts             # 26 agent definitions
│   │   ├── affiliate.ts
│   │   └── goldMarketAnalysis.ts
│   ├── lib/                      # Server utilities
│   │   ├── db.ts                 # SQLite (better-sqlite3) + schema
│   │   ├── models.ts             # Model tiers & color tokens
│   │   ├── agentPrompts.ts       # Per-agent system prompts + routing
│   │   ├── analytics.ts
│   │   └── workspaceName.test.ts
│   ├── hooks/                    # React hooks
│   └── types/                    # Shared TS types
├── data/                         # SQLite DB + JSON snapshots
│   ├── nexmind.db                # main DB (auto-created)
│   ├── analytics.json
│   └── quests.json
├── knowledge-base/               # Auto-refreshed research notes
│   ├── index.md                  # Generated index
│   ├── ai-tools/   ai-agents/   dev-ecosystem/   market-trends/
│   ├── ai-market-2025.md
│   └── dev-ecosystem-2025.md
├── docs/                         # Architecture & design specs
│   ├── analytics-architecture.md
│   ├── analytics.md
│   └── character-design-prompts.md
├── graphify-out/                 # Code graph (god nodes, communities, wiki)
├── public/                       # Static assets (agent portraits etc.)
├── scripts/                      # One-off node scripts
├── .env.local.example
├── .env.local                    # ← your secrets (gitignored)
├── .gitignore
├── .graphifyignore
├── next.config.ts
├── tsconfig.json
├── vitest.config.mts
├── vitest.setup.ts
├── AGENTS.md                     # Rules for AI agents working in this repo
├── CLAUDE.md                     # Claude Code config + slash commands
└── package.json
```

---

## Data Layer

The app uses a **single embedded SQLite database** at `data/nexmind.db` (created
on first boot, WAL mode for concurrent reads). Schema is defined and migrated
in [`src/lib/db.ts`](src/lib/db.ts).

| Table          | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `dm_messages`  | Direct-message history per agent                           |
| `cc_sessions`  | Claude Code sessions (one per spawn)                       |
| `cc_messages`  | Messages within a Claude Code session                      |
| `task_log`     | Append-only log of agent actions (drives `/mission-log`)   |
| `workspaces`   | Registered git workspaces                                  |

A few JSON files are also written for things that don't need a query layer
(`data/quests.json`, `data/analytics.json`).

---

## Knowledge Base & Research Pipeline

`POST /api/research` runs a **server-sent events** stream that, for each
category in [`src/app/api/research/route.ts`](src/app/api/research/route.ts):

1. Spawns the **Claude Code CLI** as a subprocess (no API key — uses the CLI's
   own Max-plan OAuth, so it must be installed and logged in on the host).
2. Asks it to research the category (AI tools, AI agents, dev ecosystem,
   market trends).
3. Writes the result to `knowledge-base/<category>/<slug>.md`.
4. Rebuilds `knowledge-base/index.md`.

The event stream:

```
data: {"type":"status","text":"Researching AI Tools…"}
data: {"type":"saved","category":"ai-tools","name":"Claude Opus 4.6"}
data: {"type":"status","text":"Researching Dev Ecosystem…"}
data: {"type":"saved","category":"dev-ecosystem","name":"Next.js 16"}
data: {"type":"done","message":"4 categories updated"}
data: [DONE]
```

You can also trigger this on a schedule — see the scheduled task referenced
in this repo (runs daily, hits `http://localhost:3000/api/research`, requires
the dev server to be up).

---

## Theming — Futuristic Arcane (Dark Nebula)

**There is no `tailwind.config.ts`.** Tailwind v4 is CSS-first. All theme
tokens live in [`src/app/globals.css`](src/app/globals.css) as CSS variables:

```css
:root {
  /* Magic palette */
  --magic-purple: ...;
  --magic-pink:   ...;
  --magic-cyan:   ...;
  --arcane-gold:  ...;
  --arcane-emerald: ...;

  /* Glass surfaces */
  --magic-glass:        ...;
  --magic-glass-border: ...;
  --magic-glass-blur:   ...;
  --magic-glow-soft:    ...;

  /* Backgrounds */
  --nebula-bg: ...;

  /* Headings */
  --magic-grad-heading: linear-gradient(...);

  /* Department colors */
  --dept-secretary: ...;
  --dept-dev:       ...;
  --dept-design:    ...;
  /* etc. */
}
```

Convention used throughout the app:

- **Inline styles use `var(--token)`**, NOT Tailwind color classes.
- Cards use a shared `glass` style object (see top of `src/app/page.tsx`).
- Pages wrap content in `--nebula-bg` + ambient orbs + centered `maxWidth: 1340`.

See [`docs/analytics.md`](docs/analytics.md) for the canonical theme spec
(written as a re-skin brief, but it's the best reference for the design system).

---

## Working with Claude Code

This repo is set up to be **driven** by Claude Code. The relevant configs:

- **`AGENTS.md`** — base rules for any AI agent in the repo (Next.js 16 is *not*
  the version your training data knows; Graphify graph available)
- **`CLAUDE.md`** — Claude Code project config: agent roles (NOVA/PIXEL/BYTE/REX/ARIA),
  slash commands, and pipeline rules

The slash commands map to specialist roles:

| Command            | Agent | Use when                                  |
| ------------------ | ----- | ----------------------------------------- |
| `/nova <task>`     | NOVA  | Build/fix a UI component or page          |
| `/pixel <task>`    | PIXEL | Change colors, theme, or CSS variables    |
| `/byte <task>`     | BYTE  | Create/fix an API route or backend logic  |
| `/rex <task>`      | REX   | Plan + execute a multi-file feature       |
| `/pipeline <task>` | ARIA  | Full-stack task needing multiple agents   |
| `/tsc`             | —     | Run TypeScript check + auto-fix errors    |
| `/review [file]`   | —     | Code review + auto-fix critical issues    |

The Graphify graph (`graphify-out/`) gives Claude Code a god-node view of the
codebase. Run `graphify update .` after non-trivial changes to keep it fresh.

---

## Testing

```bash
npm test            # run all Vitest suites once
npm run test:watch  # interactive watch mode
```

Tests live next to the code they cover (`*.test.ts` / `*.test.tsx`).
Setup: [`vitest.setup.ts`](vitest.setup.ts) — wires `@testing-library/jest-dom`
matchers and jsdom.

Examples:

- `src/lib/db.test.ts`
- `src/lib/analytics.test.ts`
- `src/lib/models.test.ts`
- `src/data/affiliate.test.ts`

---

## Deployment

### Local "production"

```bash
npm run build
npm start
# -> http://localhost:3000
```

### Notes for hosting

- `better-sqlite3` is a **native module** — your host must support native
  compilation, OR build the binary on a matching platform and ship it.
- The `/api/claude-code` and `/api/research` routes spawn the Claude Code CLI
  as a subprocess. They only work in environments where:
  - `claude` (the CLI) is on `PATH`
  - The CLI is already authenticated (Max-plan OAuth)
- The `data/` directory must be **writable** at runtime.
- Vercel is **not a great fit** because of the spawn-subprocess + writable-disk
  requirements. A small VPS, a Docker container with the CLI baked in, or
  running locally on the operator's own machine all work well.

---

## Troubleshooting

**`better-sqlite3` fails to install**
Build tools are missing. On Windows install the "Desktop development with C++"
workload via Visual Studio Build Tools, or use `npm install --build-from-source`.

**`/api/research` returns 500 immediately**
The Claude Code CLI isn't installed or isn't logged in on the host. Install it,
run `claude` once, log in, then retry.

**Lock file errors like `.git/index.lock` blocking commits**
A previous git process didn't exit cleanly. Delete `.git/index.lock` manually.

**Analytics page looks flat / no glass**
You're on an old build — the canonical theme tokens are in `globals.css`. See
`docs/analytics.md` for the re-skin spec.

**Tailwind classes for colors aren't working**
You're using a Tailwind v4 CSS-only setup. Use `style={{ color: 'var(--magic-cyan)' }}`
instead of `text-cyan-400`.

**Port 3000 already in use**
`npm run dev -- -p 3001` (or whatever port).

---

## License

Private — © Taechaput. All rights reserved.

If you want to use parts of this for your own project, open an issue on the
GitHub repo: <https://github.com/taechaput211040/nexmind-app>
