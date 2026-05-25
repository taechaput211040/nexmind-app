import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getAgentModel } from '@/lib/models'

export const runtime = 'nodejs'

const DEFAULT_WORK_DIR = path.resolve(process.cwd())
const IS_WIN = process.platform === 'win32'

const AGENT_ROLES: Record<string, string> = {
  aria: `ARIA — Executive Secretary & Pipeline Orchestrator
- You are the executive secretary and team lead of NEXMIND Command Center
- Answer conversational questions, summaries, and status updates DIRECTLY — no code
- For summary requests: be specific — mention actual file names, component names, and line ranges that were changed
- If reporting errors: include the exact error message, not a generic "there was an issue"
- Keep responses concise (4-6 lines max), professional, and in the SAME LANGUAGE as the user (Thai if Thai, English if English)
- DO NOT write or modify any code files — you coordinate, you never implement
- DO NOT make up results — only report what the other agents actually did`,

  pixel: `PIXEL — CSS & Theme Specialist

STEP 1 — READ FIRST (mandatory, no exceptions):
  Read the FULL content of src/app/globals.css before touching anything.
  Identify ALL existing CSS variable names and their current values.
  Never assume a variable name — always verify it exists in the file.

STEP 2 — PLAN your changes:
  List exactly which variables you will change and to what values.
  If a requested color does not map to an existing variable, say so — do NOT invent new variable names.

STEP 3 — EDIT with surgical precision:
  Modify ONLY the specific CSS variable values that were explicitly requested.
  Do NOT reformat, reorder, or comment out any lines you were not asked to touch.
  Do NOT touch any .tsx, .ts, or other files — globals.css ONLY.
  Use exact hex values (e.g. #1a1a2e) — no hsl(), no rgb(), no Tailwind classes.

STEP 4 — VERIFY:
  Re-read the changed lines and confirm the new values are correct.
  Report exactly what changed (variable name: old value to new value).`,

  nova: `NOVA — Frontend Specialist

STEP 1 — ORIENT (mandatory):
  Read graphify-out/GRAPH_REPORT.md to find which files are relevant.
  Then READ the target file(s) in FULL before writing a single line.
  Understand the existing component structure, props, state, and imports.
  Never write code based on assumptions — only on what you actually read.

STEP 2 — PLAN your changes:
  Describe exactly what you will add/change/remove and why.
  Confirm which file(s) will be touched. Avoid touching unrelated files.

STEP 3 — IMPLEMENT with minimal diff:
  Make only the changes needed for the task — do NOT refactor unrelated code.
  All colors MUST use var(--variable) from globals.css — NEVER hardcoded hex, rgb, hsl.
  All spacing should use consistent units already used in the file.
  Preserve ALL existing functionality — do not break what was working.
  Keep the same code style (quotes, semicolons, indentation) as the existing file.
  Imports: only add what is needed, never remove existing imports unless they become unused.
  Every card/panel MUST have: background var(--magic-glass), border var(--magic-glass-border), boxShadow var(--magic-glow-soft), backdropFilter blur(var(--magic-glass-blur)).

STEP 4 — VERIFY TypeScript:
  Run: npx tsc --noEmit
  If there are errors, fix ALL of them before finishing. Never leave TS errors.

STEP 5 — UPDATE graph:
  Run: graphify update .

STEP 6 — REPORT:
  List every file changed and what was changed (function/component name + what was added/modified).`,

  byte: `BYTE — Backend Specialist

STEP 1 — ORIENT (mandatory):
  Read graphify-out/GRAPH_REPORT.md to locate the relevant route files and utilities.
  Then READ the target route file(s) in FULL before writing anything.
  Understand the existing request/response contract, error handling, and imports.
  Never assume the structure — read it first.

STEP 2 — PLAN your changes:
  Identify exactly what endpoint/function needs changing.
  Confirm you will NOT change the existing API response shape unless explicitly asked.
  If adding a new endpoint, confirm it does not conflict with existing ones.

STEP 3 — IMPLEMENT with minimal diff:
  Always include at the top of every route file: export const runtime = 'nodejs'
  Windows environment rules — use Node.js APIs only:
    - File I/O: use fs, fs/promises — NEVER shell commands (find, grep, head, cat)
    - Paths: use path.join() — NEVER hardcoded forward slashes
    - Env vars: always provide fallback defaults
  Preserve ALL existing endpoints and their response shapes.
  Preserve ALL existing error handling patterns.
  Do NOT reformat or reorganize code you were not asked to touch.
  Handle errors gracefully — every async call needs try/catch.

STEP 4 — VERIFY TypeScript:
  Run: npx tsc --noEmit
  Fix ALL errors before finishing. Never leave TS errors.

STEP 5 — UPDATE graph:
  Run: graphify update .

STEP 6 — REPORT:
  List every endpoint added/changed, the request shape, and the response shape.`,

  rex: `REX — Architect

STEP 1 — ORIENT:
  Read graphify-out/GRAPH_REPORT.md fully — god nodes, communities, and edge counts reveal impact.
  Identify ALL files that will be affected by this change (direct + transitive dependencies).
  Read each affected file before touching it.

STEP 2 — PRODUCE a written plan first:
  List: what files will be created, what files will be modified, what will be deleted.
  List: what interfaces/types will change and who uses them.
  List: what the execution order must be (e.g. types first, then implementations).
  Output this plan clearly before writing any code.

STEP 3 — IMPLEMENT in the correct order:
  Do shared types/interfaces first.
  Do utility/helper files second.
  Do components/routes last.
  After each file: run npx tsc --noEmit and fix errors immediately before moving on.

STEP 4 — VERIFY the whole system:
  Run npx tsc --noEmit one final time across the entire project.
  Fix every remaining error. Do not hand off with broken types.

STEP 5 — UPDATE graph:
  Run: graphify update .`,

  luna: `LUNA — UX & Animation Specialist

STEP 1 — READ FIRST:
  Read src/app/globals.css to see existing keyframes and transitions.
  Read the target component file(s) to understand current structure before adding animations.

STEP 2 — PLAN:
  List what animations you will add and where (CSS file vs component inline styles).
  Ensure animation names do not conflict with existing @keyframes in globals.css.

STEP 3 — IMPLEMENT:
  Keep animations subtle and performant — prefer transform/opacity over layout-triggering properties.
  Use CSS variables for animation durations where possible.
  Never remove existing animations — only add or adjust.
  If modifying a .tsx file, read it fully first, change only the style/className props needed.

STEP 4 — VERIFY:
  If any .tsx was changed: run npx tsc --noEmit and fix all errors.
  Confirm no existing transitions were accidentally removed.`,

  scout: `SCOUT — Research & Analysis

STEP 1 — ORIENT with Graphify:
  Read graphify-out/GRAPH_REPORT.md — use god nodes and communities to find the right files fast.
  Check graphify-out/wiki/ if it exists for deeper module-level context.

STEP 2 — INVESTIGATE:
  Read the actual source files identified — do not just report graph data, verify with real code.
  Look for: patterns, anti-patterns, duplication, missing error handling, type issues.
  Cross-reference: if a function is called in many places, read the callers too.

STEP 3 — REPORT precisely:
  File path + line numbers for every finding.
  Distinguish between: confirmed bugs, potential issues, and code smells.
  Provide actionable recommendations, not vague observations.
  If asked to fix: list the exact changes needed before implementing them.`,
}

function loadKnowledgeIndex(): string {
  try {
    const indexPath = path.join(process.cwd(), 'knowledge-base', 'index.md')
    const raw = fs.readFileSync(indexPath, 'utf8')
    const match = raw.match(/<!-- KNOWLEDGE_START -->([\s\S]*?)<!-- KNOWLEDGE_END -->/)
    if (!match || !match[1].trim() || match[1].includes('No entries yet')) return ''
    const lines = match[1].trim().split('\n').filter(Boolean)
    const kept = lines.slice(0, 24)
    return `\n## Current Knowledge (auto-updated daily)\n${kept.join('\n')}`
  } catch {
    return ''
  }
}


// Write session summary to ARIA_MEMORY.md in the workspace
function writeAriaMemory(cwd: string, task: string, agentList: string[], summary: string) {
  try {
    const memPath = path.join(cwd, 'ARIA_MEMORY.md')
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    const entry = [
      '---',
      '### ' + ts,
      '**Task:** ' + task.slice(0, 200),
      '**Agents:** ' + agentList.join(' → '),
      '**Outcome:**',
      summary.trim(),
      '',
    ].join('\n')

    let existing = ''
    try { existing = fs.readFileSync(memPath, 'utf8') } catch { /* new file */ }

    let content: string
    const header = '# 🧠 ARIA MEMORY\n_Auto-updated after every pipeline. Agents read this to understand project history._\n\n'
    if (!existing) {
      content = header + entry
    } else {
      const newContent = existing + entry
      const lines = newContent.split('\n')
      // Keep max 150 lines to avoid context bloat
      if (lines.length > 150) {
        const kept = lines.slice(-147)
        content = header + kept.join('\n')
      } else {
        content = newContent
      }
    }
    fs.writeFileSync(memPath, content, 'utf8')
  } catch { /* non-critical — never crash the pipeline */ }
}

const PROJECT_CONTEXT = `## Project: NEXMIND Command Center
Stack: Next.js 16 App Router · TypeScript · Tailwind CSS v4 (NO tailwind.config.ts — CSS-only)
Theme: Futuristic Arcane — Dark Nebula (#07071a) + Magic Glass + Neon Glows
Structure: Pages -> src/app/[name]/page.tsx | Components -> src/components/ | API -> src/app/api/[name]/route.ts

## Design System Rules (READ BEFORE TOUCHING ANY UI)
ALWAYS use CSS variables from src/app/globals.css — NEVER raw hex, rgb, or hsl values.

### Magic Glass Card (use for EVERY section/panel/card — no exceptions):
  background:              var(--magic-glass)
  border:                  1px solid var(--magic-glass-border)
  box-shadow:              var(--magic-glow-soft)
  backdrop-filter:         blur(var(--magic-glass-blur))
  -webkit-backdrop-filter: blur(var(--magic-glass-blur))
  border-radius:           var(--cmd-card-radius)

### Accent glow colors:
  Purple  -> var(--magic-purple)  + var(--magic-glow-purple)
  Cyan    -> var(--magic-cyan)    + var(--magic-glow-cyan)
  Pink    -> var(--magic-pink)    + var(--magic-glow-pink)
  Gold    -> var(--arcane-gold)   + var(--magic-glow-gold)
  Emerald -> var(--arcane-emerald)+ var(--magic-glow-emerald)

### Text hierarchy:
  Primary   -> var(--cmd-text)       #e0e0f4
  Secondary -> var(--cmd-text-soft)  #8888bb
  Labels    -> var(--cmd-label)      #5a5a88
  Dim rune  -> var(--arcane-rune)    #7c7cb0

### CRITICAL anti-patterns — NEVER do these:
  - background: transparent on cards/panels
  - background: #hex or rgb() or hsl() directly
  - box-shadow: none on interactive elements
  - No backdrop-filter on glass panels

## Codebase Knowledge Graph (Graphify)
A pre-built AST knowledge graph lives at graphify-out/GRAPH_REPORT.md (330 nodes, 461 edges).
ALWAYS read graphify-out/GRAPH_REPORT.md BEFORE grepping or exploring files.
After editing files run: graphify update .${loadKnowledgeIndex()}`

function ariaPlanPrompt(task: string, context?: string, workspaceCtx?: string): string {
  return `You are ARIA — Executive Secretary & Pipeline Orchestrator for NEXMIND Command Center.

${workspaceCtx ? `## ACTIVE WORKSPACE:\n${workspaceCtx}\n` : ''}
Available agents:
- aria: YOU — answer conversational questions, summaries, status requests
- pixel: CSS variables, colors, theme changes (globals.css ONLY)
- nova: React components, pages, TSX frontend code
- byte: API routes, backend logic, server-side code
- rex: Architecture planning, complex multi-file refactors
- luna: Animations, transitions, UX micro-interactions
- scout: Code research, analysis, finding patterns

${context ? `## Context from previous pipeline:\n${context}\n\n` : ''}Routing rules — pick the MINIMUM agents needed:
- Task mentions "เลขา", "ARIA", "สรุป", "ผล", "recap", "ทำไรไป", "เกิดอะไร", or is a question about previous work -> aria ONLY
- Task is conversational or asks for explanation (no file changes needed) -> aria ONLY
- Colors/theme/CSS only -> pixel ONLY
- UI/components only -> nova ONLY (use pixel first if new colors are needed)
- API/backend only -> byte ONLY
- Multi-file architecture -> rex first, then byte/nova
- Animations only -> luna ONLY

Respond with ONLY the JSON block — no explanation:

NEXMIND_PIPELINE_START
{"agents":["agent1"],"tasks":{"agent1":"specific actionable instructions"},"summary":"one-line description"}
NEXMIND_PIPELINE_END

Task: ${task}`
}

function ariaSummaryPrompt(task: string, agentWork: string): string {
  return `You are ARIA — Executive Secretary of NEXMIND Command Center.

A pipeline just completed for this task: "${task}"

What each agent did:
${agentWork}

Write a closing summary in the SAME LANGUAGE as the task (Thai if task is in Thai, English if English).
Format EXACTLY like this (skip line if no issues):
OK: [what was accomplished, be specific — mention file names]
ISSUE: [any errors or issues encountered]
NEXT: [one specific actionable next step]

Keep it under 4 lines total. Be concrete. No fluff.`
}

function agentPrompt(agentId: string, task: string, context: string, workspaceCtx?: string): string {
  const role = AGENT_ROLES[agentId] ?? `${agentId.toUpperCase()} — Specialist`
  return [
    `## YOUR ROLE: ${role}`,
    workspaceCtx ? `## WORKSPACE CONTEXT:\n${workspaceCtx}` : PROJECT_CONTEXT,
    context ? `## CONTEXT FROM PREVIOUS AGENTS:\n${context}` : '',
    `## YOUR TASK:\n${task}`,
    `## EXECUTION RULES (apply to ALL agents, no exceptions):
1. READ before you WRITE — always read the full file before editing any part of it
2. MINIMAL DIFF — change only what the task requires; do not refactor, reformat, or reorganize unrelated code
3. PRESERVE existing behaviour — never remove or break functionality that was working before
4. NO ASSUMPTIONS — if you do not know a variable name, file path, or API shape, read the source to find out
5. TypeScript MUST compile — after every file write, run: npx tsc --noEmit; fix ALL errors before finishing
6. VERIFY your output — re-read the lines you changed and confirm they are correct before finishing
7. REPORT clearly — list every file changed, what changed, and confirm TypeScript passes`,
  ].filter(Boolean).join('\n\n')
}

function getEnv() {
  const npmGlobal = IS_WIN
    ? path.join(process.env.APPDATA ?? 'C:\\Users\\Default\\AppData\\Roaming', 'npm')
    : path.join(process.env.HOME ?? '/home/user', '.npm-global', 'bin')
  const env = { ...process.env, PATH: [npmGlobal, process.env.PATH].filter(Boolean).join(IS_WIN ? ';' : ':') }
  delete env.ANTHROPIC_API_KEY
  return env
}

function spawnCC(extraArgs: string[], cwd: string) {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions', ...extraArgs]
  return spawn('claude', args, { cwd, env: getEnv(), shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
}

type SendFn = (ev: object) => void

async function planPipeline(task: string, cwd: string, context?: string, workspaceCtx?: string): Promise<{
  agents: string[]
  tasks: Record<string, string>
  summary: string
} | null> {
  return new Promise(resolve => {
    const proc = spawnCC(['--model', getAgentModel('aria')], cwd)
    proc.stdin?.write(ariaPlanPrompt(task, context, workspaceCtx), 'utf8')
    proc.stdin?.end()
    let buf = '', fullText = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8')
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        try {
          const ev = JSON.parse(line)
          if (ev.type === 'assistant') {
            for (const block of (ev.message?.content ?? [])) {
              if (block.type === 'text') fullText += block.text
            }
          }
        } catch { /* skip */ }
      }
    })
    proc.on('close', () => {
      const m = fullText.match(/NEXMIND_PIPELINE_START\s*([\s\S]*?)\s*NEXMIND_PIPELINE_END/)
      if (m) { try { return resolve(JSON.parse(m[1])) } catch { /* fall through */ } }
      resolve(null)
    })
    proc.on('error', () => resolve(null))
  })
}

async function runAgent(
  agentId: string,
  task: string,
  context: string,
  cwd: string,
  send: SendFn,
  workspaceCtx?: string,
): Promise<{ text: string; sessionId: string | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawnCC(['--model', getAgentModel(agentId)], cwd)
    proc.stdin?.write(agentPrompt(agentId, task, context, workspaceCtx), 'utf8')
    proc.stdin?.end()
    let buf = '', outputText = '', sessionId: string | null = null
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString('utf8')
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        try {
          const ev = JSON.parse(line)
          if (ev.type === 'assistant' && ev.message?.content) {
            for (const block of ev.message.content) {
              if (block.type === 'text' && block.text) {
                outputText += block.text
                send({ type: 'text', text: block.text, agentId })
              }
              if (block.type === 'tool_use') {
                send({ type: 'tool_call', toolName: block.name, toolId: block.id, input: block.input ?? {}, agentId })
              }
            }
          }
          if (ev.type === 'user' && ev.message?.content) {
            for (const block of ev.message.content) {
              if (block.type === 'tool_result') {
                const content = Array.isArray(block.content)
                  ? block.content.map((c: { text?: string }) => c.text ?? '').join('')
                  : String(block.content ?? '')
                send({ type: 'tool_result', toolId: block.tool_use_id, result: content.slice(0, 500), success: !block.is_error, agentId })
              }
            }
          }
          if (ev.type === 'result') {
            sessionId = ev.session_id ?? null
            if (ev.is_error && ev.result) send({ type: 'error', error: ev.result, agentId })
          }
        } catch { /* skip */ }
      }
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (text) send({ type: 'cc_log', text })
    })
    proc.on('close', () => resolve({ text: outputText, sessionId }))
    proc.on('error', reject)
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { message, pipeline, pipelineContext, workDir, direct, workspaceContext, docContext } = body as {
    message?: string; pipeline?: boolean; pipelineContext?: string
    workDir?: string; direct?: boolean; workspaceContext?: string; docContext?: string
  }
  const cwd = workDir ?? DEFAULT_WORK_DIR
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(ev: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }
      try {
        if (pipeline) {
          send({ type: 'status', text: 'ARIA is planning pipeline...' })
          // Merge doc context into workspace context so all agents see attached files
          const mergedCtx = [workspaceContext, docContext ? `\n\n## ATTACHED DOCUMENT\n${docContext}` : ''].filter(Boolean).join('\n') || undefined
          const plan = await planPipeline(message ?? '', cwd, pipelineContext ?? undefined, mergedCtx)
          if (!plan) {
            send({ type: 'agent_start', agentId: 'aria', role: 'ARIA' })
            await runAgent('aria', message ?? '', '', cwd, send, mergedCtx)
            send({ type: 'agent_done', agentId: 'aria' })
            return
          }
          const isAriaOnly = plan.agents.length === 1 && plan.agents[0] === 'aria'
          const roles = plan.roles ?? []
          if (isAriaOnly) {
            send({ type: 'agent_start', agentId: 'aria', role: roles[0] ?? 'ARIA' })
            await runAgent('aria', message ?? '', '', cwd, send, mergedCtx)
            send({ type: 'agent_done', agentId: 'aria' })
          } else {
            send({ type: 'pipeline_plan', agents: plan.agents, roles, summary: plan.summary })
            let context = pipelineContext ? `[Previous pipeline context]\n${pipelineContext}\n\n` : ''
            const agentWorkLog: string[] = []
            for (const agentId of plan.agents) {
              send({ type: 'agent_start', agentId, role: roles[plan.agents.indexOf(agentId)] ?? agentId })
              const result = await runAgent(agentId, plan.tasks[agentId] ?? message ?? '', context, cwd, send, mergedCtx)
              send({ type: 'agent_done', agentId })
              const agentOutput = result.text.trim()
              if (agentOutput) {
                context += `[${agentId.toUpperCase()} completed]\n${agentOutput}\n\n`
                agentWorkLog.push(`${agentId.toUpperCase()}: ${agentOutput.slice(0, 300)}`)
              }
            }
            if (!isAriaOnly && agentWorkLog.length > 0) {
              const summaryTask = `Task: ${message}\n\nAgent work:\n${agentWorkLog.join('\n\n')}`
              const summarySend = (ev: Record<string, unknown>) => send({ ...ev, agentId: 'aria_summary' })
              send({ type: 'agent_start', agentId: 'aria_summary', role: 'ARIA Summary' })
              const summaryResult = await runAgent('aria', summaryTask, '', cwd, summarySend, undefined)
              send({ type: 'agent_done', agentId: 'aria_summary' })
              send({ type: 'aria_summary_done', summary: summaryResult.text })
              // Persist session to ARIA memory
              writeAriaMemory(cwd, message ?? '', plan.agents, summaryResult.text)
            }
          }
        } else if (direct) {
          const proc = spawnCC([], cwd)
          proc.stdin?.write(message ?? '', 'utf8')
          proc.stdin?.end()
          let buf = '', sessionId: string | null = null, turns = 0, outputText = ''
          proc.stdout.on('data', (chunk: Buffer) => {
            buf += chunk.toString('utf8')
            const lines = buf.split('\n'); buf = lines.pop() ?? ''
            for (const line of lines) {
              try {
                const ev = JSON.parse(line)
                if (ev.type === 'assistant' && ev.message?.content) {
                  for (const block of ev.message.content) {
                    if (block.type === 'text' && block.text) { outputText += block.text; send({ type: 'text', text: block.text }) }
                    if (block.type === 'tool_use') send({ type: 'tool_call', toolName: block.name, toolId: block.id, input: block.input ?? {} })
                  }
                }
                if (ev.type === 'user' && ev.message?.content) {
                  for (const block of ev.message.content) {
                    if (block.type === 'tool_result') {
                      const content = Array.isArray(block.content)
                        ? block.content.map((c: { text?: string }) => c.text ?? '').join('')
                        : String(block.content ?? '')
                      send({ type: 'tool_result', toolId: block.tool_use_id, result: content.slice(0, 500), success: !block.is_error })
                    }
                  }
                }
                if (ev.type === 'result') { sessionId = ev.session_id ?? null; turns++; if (ev.is_error && ev.result) send({ type: 'error', error: ev.result }) }
              } catch { /* skip */ }
            }
          })
          proc.stderr.on('data', (chunk: Buffer) => { const text = chunk.toString('utf8').trim(); if (text) send({ type: 'cc_log', text }) })
          await new Promise<void>((res, rej) => {
            proc.on('close', () => { void sessionId; void turns; send({ type: 'text', text: outputText }); res() })
            proc.on('error', rej)
          })
        } else {
          send({ type: 'error', error: 'No valid mode specified' })
        }
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
