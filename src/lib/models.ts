// ── NEXMIND Agent Model Registry ──────────────────────────────────────────────
// Single source of truth for which Claude model each agent uses.
// Change a model here → takes effect everywhere (DM + CC pipeline).

export const MODELS = {
  opus:   'claude-opus-4-6',             // Most powerful  — deep reasoning, complex code
  sonnet: 'claude-sonnet-4-6',           // Balanced       — most tasks, creative work
  haiku:  'claude-haiku-4-5-20251001',   // Fast & cheap   — simple tasks, short output
} as const

export type ModelTier = keyof typeof MODELS
export type ModelId   = (typeof MODELS)[ModelTier]

// ── Per-agent model assignment ─────────────────────────────────────────────────
// Rationale:
//   Opus   → agents that need deep reasoning, architecture decisions, complex code gen
//   Sonnet → agents that do creative work, analysis, orchestration, most DM conversations
//   Haiku  → agents with short, structured output (social posts, quick ops, algo signals)

const AGENT_MODELS: Record<string, ModelTier> = {
  // ── Secretary ──────────────────────────────────────────────────────────────
  aria:   'sonnet',   // Orchestrator — fast routing + good reasoning

  // ── Dev Forge ──────────────────────────────────────────────────────────────
  rex:    'opus',     // Tech Architect — system design, deep architecture
  byte:   'opus',     // Backend Dev   — complex API, DB schema, security code
  nova:   'sonnet',   // Frontend Dev  — design-to-code, component work
  zeta:   'sonnet',   // QA            — test writing, coverage analysis
  forge:  'sonnet',   // DevOps        — infra config, CI/CD pipelines

  // ── Design ─────────────────────────────────────────────────────────────────
  luna:   'sonnet',   // UX/UI         — wireframes, user flows, creative briefs
  pixel:  'sonnet',   // Visual Design — CSS precision, design system
  reel:   'haiku',    // Video         — short structured briefs

  // ── Content ────────────────────────────────────────────────────────────────
  scout:  'sonnet',   // Research      — web synthesis, trend analysis
  ink:    'sonnet',   // Writer        — long-form content, SEO articles
  grace:  'sonnet',   // Editor        — language quality, proofreading
  vibe:   'haiku',    // Social Media  — short posts, captions

  // ── Trading ────────────────────────────────────────────────────────────────
  hawk:   'opus',     // Market Intel  — signal analysis, market reading
  blade:  'opus',     // Trade Exec    — execution decisions, position sizing
  sage:   'opus',     // Risk Manager  — heavy risk modeling, drawdown analysis
  auto:   'haiku',    // Algo Bot      — fast pattern execution, no prose needed

  // ── Intelligence ───────────────────────────────────────────────────────────
  atlas:  'opus',     // Data Analyst  — complex data, multi-variable analysis
  memo:   'sonnet',   // Memory Keeper — knowledge synthesis, structured recall
  cipher: 'opus',     // Competitive   — deep OSINT, threat modeling

  // ── Finance ────────────────────────────────────────────────────────────────
  coin:   'opus',     // Finance Lead  — P&L modeling, financial forecasting
  deal:   'opus',      // Sales         — quick pitches, objection handling
  boost:  'opus',      // Ads Manager   — ad copy, campaign briefs

  // ── Systems ────────────────────────────────────────────────────────────────
  lex:    'sonnet',   // Legal         — contract review, compliance checks
  nexus:  'opus',     // R&D Lead      — research + prototype implementation
  echo:   'haiku',    // Voice         — short, structured voice responses
}

/** Return the Claude model string for a given agent ID. Defaults to sonnet. */
export function getAgentModel(agentId: string): ModelId {
  const tier = AGENT_MODELS[agentId] ?? 'sonnet'
  return MODELS[tier]
}

/** Return the tier label (OPUS / SONNET / HAIKU) for display. */
export function getAgentModelTier(agentId: string): string {
  return (AGENT_MODELS[agentId] ?? 'sonnet').toUpperCase()
}

/** Colour for model tier badge. */
export const MODEL_TIER_COLOR: Record<string, string> = {
  OPUS:   '#f59e0b',   // amber  — premium
  SONNET: '#6c63ff',   // purple — standard
  HAIKU:  '#22d3ee',   // cyan   — fast
}
