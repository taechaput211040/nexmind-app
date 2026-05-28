/**
 * NEXMIND — Agent System Prompt Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Prompts live as .md files under `src/lib/prompts/` so they can be edited
 * without touching TypeScript. This file is the registry that loads + composes
 * them at module init (server-side only — never imported by client components).
 *
 *   src/lib/prompts/
 *   ├── global-rules.md             ← appended to every prompt
 *   ├── modes/
 *   │   ├── dm-template.md          ← DM-mode wrapper with {ownsText}/{referLines}
 *   │   ├── allhands.md             ← appended in all-hands mode
 *   │   └── aria-mode.md            ← appended in aria orchestrator mode
 *   └── agents/<id>.md              ← per-agent base prompt (26 files)
 *
 * Public API:
 *   buildSystemPrompt(agentId, mode, projectContext?) → string
 *
 * Behavior is IDENTICAL to the previous hard-coded version (same output
 * byte-for-byte). Files are read once at module init and cached.
 */
import fs from 'fs'
import path from 'path'
import { agents } from '@/data/agents'
import domainMapJson from './prompts/domain-map.json'

// ── File loader ──────────────────────────────────────────────────────────────
const PROMPTS_DIR = path.join(process.cwd(), 'src', 'lib', 'prompts')

function loadPrompt(relPath: string): string {
  // .trimEnd() strips the trailing newline that every .md file has on disk,
  // so we can reason about whitespace exactly the way the old template
  // literals did.
  return fs.readFileSync(path.join(PROMPTS_DIR, relPath), 'utf-8').trimEnd()
}

// ── Loaded at module init (server-side only) ─────────────────────────────────
// Wrapping with leading/trailing newlines reproduces the original
// `const GLOBAL_RULES = \`\n...\n\`` shape.
const GLOBAL_RULES   = `\n${loadPrompt('global-rules.md')}\n`
const DM_TEMPLATE    = loadPrompt('modes/dm-template.md')
const MODE_ALLHANDS  = `\n\n${loadPrompt('modes/allhands.md')}`
const MODE_ARIA      = `\n\n${loadPrompt('modes/aria-mode.md')}`

// Roster of agents that have a hand-written prompt. Keep in sync with
// src/lib/prompts/agents/*.md — anything not listed here falls back to
// getGenericPrompt() (which builds a prompt from src/data/agents.ts).
const AGENT_IDS = [
  'aria','nova','byte','rex','zeta','forge',
  'luna','pixel','reel',
  'scout','ink','grace','vibe',
  'hawk','blade','sage','auto',
  'atlas','memo','cipher',
  'coin','deal','boost',
  'lex','nexus','echo',
] as const

const AGENT_PROMPTS: Record<string, string> = Object.fromEntries(
  AGENT_IDS.map(id => [id, loadPrompt(`agents/${id}.md`)]),
)

// ── DOMAIN_MAP (loaded from JSON for non-dev editing) ───────────────────────
// Drives buildDMInstruction(). Data lives in src/lib/prompts/domain-map.json so
// PMs / writers can adjust who-refers-to-whom without touching TypeScript.
type DomainEntry = { owns: string[]; refer: Record<string, string[]> }
const DOMAIN_MAP: Record<string, DomainEntry> = domainMapJson as Record<string, DomainEntry>

// ── DM-mode wrapper (fills DM template with per-agent domain text) ───────────
function buildDMInstruction(agentId: string): string {
  const map = DOMAIN_MAP[agentId]
  if (!map) return ''
  const ownsText = map.owns.join(', ')
  const referLines = Object.entries(map.refer)
    .map(([team, topics]) => `  - ${team}: ${topics.join(', ')}`)
    .join('\n')
  const filled = DM_TEMPLATE
    .replace('{ownsText}', ownsText)
    .replace('{referLines}', referLines)
  return `\n${filled}\n`
}

// ── Fallback for agents without a hand-written prompt ────────────────────────
function getGenericPrompt(agentId: string): string {
  const agent = agents.find(a => a.id === agentId)
  if (!agent) return 'You are an AI assistant at NEXMIND AI CO.'
  return `You are ${agent.name}, ${agent.title} at NEXMIND AI CO. owned by TAEC.
ROLE: ${agent.description}
SKILLS: ${agent.skills.join(', ')}
ตอบสั้น กระชับ ตรงประเด็น ภาษาไทย/อังกฤษตามที่ TAEC ใช้`
}

// ── Public API ───────────────────────────────────────────────────────────────
export function buildSystemPrompt(
  agentId: string,
  mode: string,
  projectContext?: string,
): string {
  const agentPrompt = AGENT_PROMPTS[agentId] ?? getGenericPrompt(agentId)
  const dmInstruction = mode === 'dm' ? buildDMInstruction(agentId) : ''
  const modeContext = mode === 'allhands'
    ? MODE_ALLHANDS
    : mode === 'aria'
    ? MODE_ARIA
    : ''
  const contextSection = projectContext
    ? `\n\nPROJECT CONTEXT:\n\`\`\`\n${projectContext}\n\`\`\``
    : ''
  return `${agentPrompt}${dmInstruction}${modeContext}${contextSection}\n${GLOBAL_RULES}`
}
