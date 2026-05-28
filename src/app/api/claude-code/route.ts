import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getAgentModel } from '@/lib/models'
import { buildSystemPrompt } from '@/lib/agentPrompts'

export const runtime = 'nodejs'

const DEFAULT_WORK_DIR = path.resolve(process.cwd())
const IS_WIN = process.platform === 'win32'

const AGENT_ROLES: Record<string, string> = {
  aria: `ARIA — Executive Secretary (DIRECT RESPONSE MODE)
CRITICAL: You are running in DIRECT RESPONSE MODE. The pipeline system has already handled routing externally.
- DO NOT use the Agent tool — subagents are spawned externally by the pipeline, not by you
- DO NOT use Bash, Read, Grep, or any file tools — just write your response as text
- Answer conversational questions, summaries, and status updates DIRECTLY in plain text
- For summary requests: be specific — mention actual file names, component names, and line ranges
- If reporting errors: include the exact error message, not a generic "there was an issue"
- Keep responses concise (4-6 lines max), in the SAME LANGUAGE as the user (Thai if Thai, English if English)
- DO NOT write or modify any code files
- DO NOT make up results — only report what the other agents actually did`,

  pixel: `PIXEL — CSS & Theme Specialist

STEP 1 — USE PRE-LOADED globals.css:
  The full globals.css is already injected in the PRE-LOADED FILES section above.
  Identify ALL existing CSS variable names from that content — do NOT call Read on globals.css.
  Never assume a variable name — always verify it exists in the pre-loaded content.

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

STEP 1 — ORIENT (use pre-loaded context):
  The Codebase Graph (GRAPH_REPORT.md) is already injected above — use it to find which files are relevant. Do NOT re-read it.
  Then READ only the specific target file(s) in FULL before writing a single line.
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

STEP 1 — ORIENT (use pre-loaded context):
  The Codebase Graph (GRAPH_REPORT.md) is already injected above — use it to locate relevant route files. Do NOT re-read it.
  Then READ only the specific target route file(s) in FULL before writing anything.
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

STEP 1 — ORIENT (use pre-loaded context):
  The Codebase Graph (GRAPH_REPORT.md) is already injected above — god nodes, communities, and edge counts are there. Do NOT re-read it.
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

STEP 1 — USE PRE-LOADED CONTEXT:
  The full globals.css is already injected above — review existing keyframes and transitions from it. Do NOT re-read globals.css.
  Read only the specific target component file(s) to understand current structure before adding animations.

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

STEP 1 — ORIENT (use pre-loaded context):
  The Codebase Graph (GRAPH_REPORT.md) is already injected above — use god nodes and communities to find relevant files. Do NOT re-read it.
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

// Pre-load key files server-side (zero tokens — Node.js fs, no Claude Code)
// Injected into every agent prompt so agents skip redundant Read tool calls.
function buildSharedContext(cwd: string): string {
  const parts: string[] = []
  try {
    const css = fs.readFileSync(path.join(cwd, 'src/app/globals.css'), 'utf8')
    parts.push(`## globals.css (PRE-LOADED — do NOT re-read, use directly):\n\`\`\`css\n${css}\n\`\`\``)
  } catch { /* not found */ }
  try {
    const graph = fs.readFileSync(path.join(cwd, 'graphify-out/GRAPH_REPORT.md'), 'utf8')
    parts.push(`## Codebase Graph (PRE-LOADED — do NOT re-read):\n${graph}`)
  } catch { /* not found */ }
  return parts.join('\n\n')
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
A pre-built AST knowledge graph is PRE-LOADED above — do NOT re-read graphify-out/GRAPH_REPORT.md (already in context).
After editing files run: graphify update .${loadKnowledgeIndex()}`

function ariaPlanPrompt(task: string, context?: string, workspaceCtx?: string): string {
  // NOTE: deliberately does NOT inject the DM persona here.
  // ariaPlanPrompt produces a structured JSON pipeline plan, so it needs
  // precise routing rules — not persona personality. The DM persona's
  // AGENTS list ("Content (SCOUT/INK/GRACE/VIBE)") conflicts with the
  // CC-specific scout role ("code research") and biased ARIA into
  // dispatching SCOUT for tasks that should go to PIXEL/NOVA.
  // Persona stays in agentPrompt() for actual execution (incl. ARIA summary).
  return `You are ARIA — Executive Secretary & Pipeline Orchestrator for NEXMIND Command Center.

CRITICAL: You are in ROUTING-ONLY mode. Do NOT call any tools. Do NOT use Read, Bash, Grep, or any file tool. Analyze the task text and output the JSON plan IMMEDIATELY.

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
- "ปรับ", "เเก้", "ออกแบบใหม่", "redesign", "rebuild" + page/component -> pixel + nova (PIXEL handles tokens/theme, NOVA implements)
- API/backend only -> byte ONLY
- Multi-file architecture -> rex first, then byte/nova
- Animations only -> luna ONLY
- scout ONLY when task explicitly asks to "audit", "investigate", "find", "research" — NOT for redesign/fix work

Respond with ONLY the JSON block — no explanation:

NEXMIND_PIPELINE_START
{"agents":["agent1"],"tasks":{"agent1":"specific actionable instructions"},"summary":"one-line description"}
NEXMIND_PIPELINE_END

Task: ${task}`
}

function ariaSummaryPrompt(task: string, agentWork: string): string {
  return `You are ARIA — Executive Secretary of NEXMIND Command Center.

A pipeline just completed for this task: "${task}"

Agent receipts (report ONLY what is listed here — never invent or assume):
${agentWork}

RULES:
- Base your summary ONLY on the AGENT_RECEIPT_START blocks above
- If files_changed is empty for an agent → they made no changes (report honestly)
- If ts_pass: NO → list as ISSUE
- Match TAEC language (Thai if Thai, English if English)

Format EXACTLY (skip ISSUE if none):
OK: [real files changed — from receipts only]
ISSUE: [TS errors or agents that changed nothing unexpectedly]
NEXT: [one concrete next step]`
}

function agentPrompt(agentId: string, task: string, context: string, workspaceCtx?: string, sharedCtx?: string): string {
  // Inject the agent's full DM persona (personality, domain expertise, referral
  // protocol, global rules) so a NOVA spawned via Claude Code behaves the same
  // as NOVA in DM chat — same voice, same language switching, same priorities.
  // The code-execution STEPS (AGENT_ROLES) and EXECUTION RULES below stay
  // because they govern HOW to edit code, which the DM persona doesn't cover.
  const persona = buildSystemPrompt(agentId, 'dm')
  const role = AGENT_ROLES[agentId] ?? `${agentId.toUpperCase()} — Specialist`
  return [
    persona,
    `## CODE-EXECUTION STEPS (specific to this agent):\n${role}`,
    sharedCtx ? `## PRE-LOADED FILES (globals.css + GRAPH_REPORT.md — use directly, skip re-reading):\n${sharedCtx}` : '',
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
7. RECEIPT (mandatory last output) — end your response with EXACTLY this block, no exceptions:
   AGENT_RECEIPT_START
   files_changed: [list each file path you actually wrote/edited, one per line — empty if none]
   summary: [one line: what you did, specific file names + what changed]
   ts_pass: [YES / NO / SKIPPED]
   AGENT_RECEIPT_END
   If you changed nothing, still output the block with files_changed empty and summary explaining why.`,
  ].filter(Boolean).join('\n\n')
}

function getEnv() {
  const npmGlobal = IS_WIN
    ? path.join(process.env.APPDATA ?? 'C:\\Users\\Default\\AppData\\Roaming', 'npm')
    : path.join(process.env.HOME ?? '/home/user', '.npm-global', 'bin')
  const env = { ...process.env, PATH: [npmGlobal, process.env.PATH].filter(Boolean).join(IS_WIN ? ';' : ':') }
  delete (env as Record<string, string | undefined>).ANTHROPIC_API_KEY
  return env
}

function spawnCC(extraArgs: string[], cwd: string) {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--dangerously-skip-permissions', ...extraArgs]
  return spawn('claude', args, { cwd, env: getEnv(), shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
}

type SendFn = (ev: Record<string, unknown>) => void

async function planPipeline(task: string, cwd: string, context?: string, workspaceCtx?: string): Promise<{
  agents: string[]
  tasks: Record<string, string>
  summary: string
  roles?: string[]
} | null> {
  // Hard timeout: ARIA planning should be fast (just generates JSON). If CC
  // hangs (rate limit, auth refresh, network), kill after 90s and fall back.
  const PLAN_TIMEOUT_MS = 90_000
  return new Promise(resolve => {
    const proc = spawnCC(['--model', getAgentModel('aria')], cwd)
    let resolved = false
    const finish = (value: Awaited<ReturnType<typeof planPipeline>>) => {
      if (resolved) return
      resolved = true
      try { proc.kill('SIGTERM') } catch { /* already dead */ }
      resolve(value)
    }
    const timer = setTimeout(() => {
      console.error('[planPipeline] timed out after', PLAN_TIMEOUT_MS, 'ms — killing CC subprocess')
      finish(null)
    }, PLAN_TIMEOUT_MS)
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
      clearTimeout(timer)
      const m = fullText.match(/NEXMIND_PIPELINE_START\s*([\s\S]*?)\s*NEXMIND_PIPELINE_END/)
      if (m) { try { return finish(JSON.parse(m[1])) } catch { /* fall through */ } }
      finish(null)
    })
    proc.on('error', (err) => {
      clearTimeout(timer)
      console.error('[planPipeline] CC subprocess error:', err)
      finish(null)
    })
  })
}

async function runAgent(
  agentId: string,
  task: string,
  context: string,
  cwd: string,
  send: SendFn,
  workspaceCtx?: string,
  sharedCtx?: string,
): Promise<{ text: string; sessionId: string | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawnCC(['--model', getAgentModel(agentId)], cwd)
    proc.stdin?.write(agentPrompt(agentId, task, context, workspaceCtx, sharedCtx), 'utf8')
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
          const sharedCtx = buildSharedContext(cwd)
          const plan = await planPipeline(message ?? '', cwd, pipelineContext ?? undefined, mergedCtx)
          if (!plan) {
            // planPipeline failed — fall back to ARIA alone, but still show pipeline track
            send({ type: 'pipeline_plan', agents: ['aria'], roles: ['🔮 วิเคราะห์และตอบ'], summary: 'ARIA ตอบโดยตรง' })
            send({ type: 'agent_start', agentId: 'aria', role: '🔮 วิเคราะห์และตอบ' })
            await runAgent('aria', message ?? '', '', cwd, send, mergedCtx)
            send({ type: 'agent_done', agentId: 'aria' })
            return
          }
          const isAriaOnly = plan.agents.length === 1 && plan.agents[0] === 'aria'
          const roles = plan.roles ?? []
          if (isAriaOnly) {
            // ARIA-only route — still fire pipeline_plan so PipelineTrack renders
            send({ type: 'pipeline_plan', agents: ['aria'], roles: [roles[0] ?? '🔮 วิเคราะห์และตอบ'], summary: plan.summary })
            send({ type: 'agent_start', agentId: 'aria', role: roles[0] ?? '🔮 วิเคราะห์และตอบ' })
            await runAgent('aria', message ?? '', '', cwd, send, mergedCtx)
            send({ type: 'agent_done', agentId: 'aria' })
          } else {
            send({ type: 'pipeline_plan', agents: plan.agents, roles, summary: plan.summary })
            let context = pipelineContext ? `[Previous pipeline context]\n${pipelineContext}\n\n` : ''
            const agentWorkLog: string[] = []
            for (const agentId of plan.agents) {
              send({ type: 'agent_start', agentId, role: roles[plan.agents.indexOf(agentId)] ?? agentId })
              const result = await runAgent(agentId, plan.tasks[agentId] ?? message ?? '', context, cwd, send, mergedCtx, sharedCtx)
              send({ type: 'agent_done', agentId })
              const agentOutput = result.text.trim()
              if (agentOutput) {
                context += `[${agentId.toUpperCase()} completed]\n${agentOutput}\n\n`
                // Extract AGENT_RECEIPT block if present, else fall back to first 400 chars
                const receiptMatch = agentOutput.match(/AGENT_RECEIPT_START([\s\S]*?)AGENT_RECEIPT_END/)
                const receipt = receiptMatch
                  ? `${agentId.toUpperCase()} AGENT_RECEIPT_START${receiptMatch[1]}AGENT_RECEIPT_END`
                  : `${agentId.toUpperCase()}: ${agentOutput.slice(0, 400)} [no receipt]`
                agentWorkLog.push(receipt)
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
