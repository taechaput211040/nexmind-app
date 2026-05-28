/**
 * Tests for agentPrompts.ts — system prompt registry
 *
 * Covers:
 *   - buildSystemPrompt() output shape across all 26 agents
 *   - Mode handling: dm / allhands / aria / chat
 *   - Project context injection
 *   - Global rules always present at end
 *   - DM template placeholder substitution
 *   - Fallback to getGenericPrompt() for unknown agents
 *   - .md files actually exist on disk
 *
 * No mocks needed — these are pure functions reading from files at module init.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { buildSystemPrompt } from './agentPrompts'

const AGENT_IDS = [
  'aria','nova','byte','rex','zeta','forge',
  'luna','pixel','reel',
  'scout','ink','grace','vibe',
  'hawk','blade','sage','auto',
  'atlas','memo','cipher',
  'coin','deal','boost',
  'lex','nexus','echo',
] as const

const PROMPTS_DIR = path.join(process.cwd(), 'src', 'lib', 'prompts')

// ── File presence ─────────────────────────────────────────────────────────────
describe('prompt files on disk', () => {
  it('global-rules.md exists', () => {
    expect(fs.existsSync(path.join(PROMPTS_DIR, 'global-rules.md'))).toBe(true)
  })

  it('domain-map.json exists and parses', () => {
    const p = path.join(PROMPTS_DIR, 'domain-map.json')
    expect(fs.existsSync(p)).toBe(true)
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    expect(Object.keys(data).length).toBe(26)
  })

  it('all 3 mode templates exist', () => {
    for (const m of ['dm-template.md', 'allhands.md', 'aria-mode.md']) {
      expect(fs.existsSync(path.join(PROMPTS_DIR, 'modes', m))).toBe(true)
    }
  })

  it.each(AGENT_IDS)('agent file %s.md exists', (id) => {
    expect(fs.existsSync(path.join(PROMPTS_DIR, 'agents', `${id}.md`))).toBe(true)
  })
})

// ── buildSystemPrompt shape ───────────────────────────────────────────────────
describe('buildSystemPrompt()', () => {
  describe('all 26 agents in dm mode', () => {
    it.each(AGENT_IDS)('%s returns a non-empty prompt with persona + DM + global rules', (id) => {
      const out = buildSystemPrompt(id, 'dm')
      expect(out.length).toBeGreaterThan(100)
      expect(out).toContain('You are')                         // persona header
      expect(out).toContain('## DM MODE')                      // DM wrapper present
      expect(out).toContain('GLOBAL RULES:')                   // global rules appended
      expect(out).toContain('TAEC is the boss')                // global rule 1
      expect(out.endsWith('\n')).toBe(true)                    // file-style trailing newline
    })
  })

  describe('mode handling', () => {
    it('dm mode includes DM template with domain text', () => {
      const out = buildSystemPrompt('nova', 'dm')
      expect(out).toContain('## DM MODE')
      expect(out).toContain('Your domain (ตอบได้เต็มที่):')
      expect(out).toContain('คนที่ควรถามแทน:')
      // NOVA's referrals should mention BYTE
      expect(out).toContain('BYTE (Backend)')
    })

    it('allhands mode adds the ALL HANDS context', () => {
      const out = buildSystemPrompt('aria', 'allhands')
      expect(out).toContain('ALL HANDS MODE:')
      expect(out).not.toContain('## DM MODE')
    })

    it('aria mode adds the ARIA orchestrator context', () => {
      const out = buildSystemPrompt('aria', 'aria')
      expect(out).toContain('ARIA MODE:')
      expect(out).not.toContain('## DM MODE')
    })

    it('unknown mode adds no extra context but still has global rules', () => {
      const out = buildSystemPrompt('nova', 'chat')
      expect(out).not.toContain('## DM MODE')
      expect(out).not.toContain('ALL HANDS MODE:')
      expect(out).not.toContain('ARIA MODE:')
      expect(out).toContain('GLOBAL RULES:')
    })
  })

  describe('project context injection', () => {
    it('omits PROJECT CONTEXT block when not provided', () => {
      const out = buildSystemPrompt('nova', 'dm')
      expect(out).not.toContain('PROJECT CONTEXT:')
    })

    it('includes PROJECT CONTEXT block when provided', () => {
      const ctx = 'package.json: { "name": "test" }'
      const out = buildSystemPrompt('nova', 'dm', ctx)
      expect(out).toContain('PROJECT CONTEXT:')
      expect(out).toContain(ctx)
      // Should be wrapped in ```
      expect(out).toContain('```')
    })

    it('empty string context is treated as no context', () => {
      const out = buildSystemPrompt('nova', 'dm', '')
      expect(out).not.toContain('PROJECT CONTEXT:')
    })
  })

  describe('output order', () => {
    it('persona comes first, global rules last', () => {
      const out = buildSystemPrompt('nova', 'dm')
      const personaIdx = out.indexOf('You are NOVA')
      const dmIdx = out.indexOf('## DM MODE')
      const globalIdx = out.indexOf('GLOBAL RULES:')
      expect(personaIdx).toBeGreaterThanOrEqual(0)
      expect(dmIdx).toBeGreaterThan(personaIdx)
      expect(globalIdx).toBeGreaterThan(dmIdx)
    })

    it('project context appears before global rules', () => {
      const out = buildSystemPrompt('nova', 'dm', 'some context')
      const ctxIdx = out.indexOf('PROJECT CONTEXT:')
      const globalIdx = out.indexOf('GLOBAL RULES:')
      expect(ctxIdx).toBeGreaterThan(0)
      expect(globalIdx).toBeGreaterThan(ctxIdx)
    })
  })

  describe('agent persona content', () => {
    it('NOVA prompt mentions Next.js 16 (not 15)', () => {
      const out = buildSystemPrompt('nova', 'dm')
      expect(out).toContain('Next.js 16')
      expect(out).not.toContain('Next.js 15,')
    })

    it('HAWK prompt mentions trading-specific FORMAT', () => {
      const out = buildSystemPrompt('hawk', 'dm')
      expect(out).toContain('XAU/USD')
      expect(out).toContain('BUY/SELL')
    })

    it('ARIA prompt mentions all departments', () => {
      const out = buildSystemPrompt('aria', 'dm')
      // ARIA's persona lists the seven departments
      expect(out).toContain('Dev Forge')
      expect(out).toContain('Design')
      expect(out).toContain('Trading')
    })
  })

  describe('fallback for unknown agent', () => {
    it('returns generic prompt for non-existent agent id', () => {
      const out = buildSystemPrompt('xxx_unknown', 'dm')
      // No hand-written prompt → getGenericPrompt fallback
      expect(out).toContain('AI assistant at NEXMIND AI CO.')
      // No DM instruction because DOMAIN_MAP lookup also fails
      expect(out).not.toContain('## DM MODE')
      // Global rules still appended
      expect(out).toContain('GLOBAL RULES:')
    })
  })

  describe('global rules content', () => {
    it('contains all 5 numbered rules', () => {
      const out = buildSystemPrompt('aria', 'dm')
      expect(out).toMatch(/1\. TAEC is the boss/)
      expect(out).toMatch(/2\. ตอบภาษาเดียวกับที่ TAEC ใช้/)
      expect(out).toMatch(/3\. กระชับ/)
      expect(out).toMatch(/4\. แจ้งปัญหาทันที/)
      expect(out).toMatch(/5\. No hallucination/)
    })
  })
})

// ── DOMAIN_MAP routing logic ──────────────────────────────────────────────────
describe('domain map (DM mode referrals)', () => {
  it('NOVA refers backend questions to BYTE', () => {
    const out = buildSystemPrompt('nova', 'dm')
    const referSection = out.split('คนที่ควรถามแทน:')[1] ?? ''
    expect(referSection).toContain('BYTE')
    expect(referSection).toContain('API routes')
  })

  it('BYTE refers UI questions to NOVA', () => {
    const out = buildSystemPrompt('byte', 'dm')
    const referSection = out.split('คนที่ควรถามแทน:')[1] ?? ''
    expect(referSection).toContain('NOVA')
  })

  it('HAWK refers risk questions to SAGE', () => {
    const out = buildSystemPrompt('hawk', 'dm')
    const referSection = out.split('คนที่ควรถามแทน:')[1] ?? ''
    expect(referSection).toContain('SAGE')
  })
})

// ── Determinism / caching ─────────────────────────────────────────────────────
describe('determinism', () => {
  it('same input produces same output (multiple calls)', () => {
    const a = buildSystemPrompt('nova', 'dm', 'ctx-a')
    const b = buildSystemPrompt('nova', 'dm', 'ctx-a')
    expect(a).toBe(b)
  })

  it('different contexts produce different outputs', () => {
    const a = buildSystemPrompt('nova', 'dm', 'ctx-a')
    const b = buildSystemPrompt('nova', 'dm', 'ctx-b')
    expect(a).not.toBe(b)
  })

  it('different agents produce different outputs', () => {
    const nova = buildSystemPrompt('nova', 'dm')
    const byte = buildSystemPrompt('byte', 'dm')
    expect(nova).not.toBe(byte)
  })
})

// ── Regression guards (routing bugs) ──────────────────────────────────────────
describe('claude-code routing config (regression guards)', () => {
  const routeFile = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/claude-code/route.ts'),
    'utf-8',
  )

  it('ariaPlanPrompt does NOT inject DM persona (avoids SCOUT mis-route)', () => {
    // Bug: 2026-05-25. ARIA dispatched SCOUT for "ปรับเเก้หน้า dashboard ใหม่"
    // because the DM persona's "AGENTS: ...Content (SCOUT/INK/GRACE/VIBE)" list
    // conflicted with CC's "scout: Code research" definition.
    // Fix: keep persona out of the planning prompt; planning needs precise
    // routing rules, not persona personality.
    const planFn = routeFile.match(/function ariaPlanPrompt[\s\S]*?\n\}/)?.[0] ?? ''
    expect(planFn.length).toBeGreaterThan(0)
    expect(planFn).not.toContain("buildSystemPrompt('aria', 'aria')")
  })

  it('routing rules explicitly send redesign/ปรับ tasks to pixel + nova', () => {
    expect(routeFile).toContain('"ปรับ"')
    expect(routeFile).toContain('pixel + nova')
  })

  it('routing rules guard SCOUT against being picked for redesign work', () => {
    expect(routeFile).toMatch(/scout ONLY when .* "audit"/)
    expect(routeFile).toContain('NOT for redesign/fix work')
  })

  it('agentPrompt (execution) STILL injects DM persona', () => {
    // ARIA summary + every agent execution should still get full persona.
    // Only ariaPlanPrompt (orchestration planning) skips it.
    const agentFn = routeFile.match(/function agentPrompt[\s\S]*?^\}/m)?.[0] ?? ''
    expect(agentFn.length).toBeGreaterThan(0)
    expect(agentFn).toContain("buildSystemPrompt(agentId, 'dm')")
  })
})
