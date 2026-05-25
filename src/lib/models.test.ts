import { describe, it, expect } from 'vitest'
import {
  MODELS,
  getAgentModel,
  getAgentModelTier,
  MODEL_TIER_COLOR,
} from './models'

// ── Known agent list (must stay in sync with models.ts) ───────────────────────
const KNOWN_AGENTS = [
  'aria',
  'rex', 'byte', 'nova', 'zeta', 'forge',
  'luna', 'pixel', 'reel',
  'scout', 'ink', 'grace', 'vibe',
  'hawk', 'blade', 'sage', 'auto',
  'atlas', 'memo', 'cipher',
  'coin', 'deal', 'boost',
  'lex', 'nexus', 'echo',
]

describe('MODELS constant', () => {
  it('contains the three tier keys', () => {
    expect(Object.keys(MODELS)).toEqual(['opus', 'sonnet', 'haiku'])
  })

  it('every model string follows the claude-*-* naming convention', () => {
    for (const [tier, modelId] of Object.entries(MODELS)) {
      expect(modelId, `${tier} model ID`).toMatch(/^claude-[a-z]+-[a-z0-9-]+$/)
    }
  })

  it('opus is the most capable tier identifier', () => {
    expect(MODELS.opus).toContain('opus')
  })
})

describe('getAgentModel', () => {
  it.each(KNOWN_AGENTS)('returns a valid model string for "%s"', agentId => {
    const model = getAgentModel(agentId)
    expect(Object.values(MODELS)).toContain(model)
  })

  it('falls back to sonnet for unknown agents', () => {
    expect(getAgentModel('unknown-agent-xyz')).toBe(MODELS.sonnet)
    expect(getAgentModel('')).toBe(MODELS.sonnet)
  })

  it('assigns opus to high-stakes agents (rex, byte, hawk, blade, sage, atlas, cipher, coin)', () => {
    const opusAgents = ['rex', 'byte', 'hawk', 'blade', 'sage', 'atlas', 'cipher', 'coin']
    for (const id of opusAgents) {
      expect(getAgentModel(id), id).toBe(MODELS.opus)
    }
  })

  it('assigns haiku to fast-output agents (reel, vibe, auto, echo)', () => {
    const haikuAgents = ['reel', 'vibe', 'auto', 'echo']
    for (const id of haikuAgents) {
      expect(getAgentModel(id), id).toBe(MODELS.haiku)
    }
  })
})

describe('getAgentModelTier', () => {
  it('returns an uppercased tier label', () => {
    for (const id of KNOWN_AGENTS) {
      const tier = getAgentModelTier(id)
      expect(['OPUS', 'SONNET', 'HAIKU']).toContain(tier)
    }
  })

  it('defaults to SONNET for unknown agents', () => {
    expect(getAgentModelTier('bogus')).toBe('SONNET')
  })
})

describe('MODEL_TIER_COLOR', () => {
  it('has a colour for every tier', () => {
    expect(MODEL_TIER_COLOR['OPUS']).toBeDefined()
    expect(MODEL_TIER_COLOR['SONNET']).toBeDefined()
    expect(MODEL_TIER_COLOR['HAIKU']).toBeDefined()
  })

  it('all colour values are valid hex codes', () => {
    for (const [tier, color] of Object.entries(MODEL_TIER_COLOR)) {
      expect(color, `color for ${tier}`).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    }
  })
})
