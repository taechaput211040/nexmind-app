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

// ── DOMAIN_MAP (structured data — stays in TS) ───────────────────────────────
// Drives buildDMInstruction(). This is data, not prose, so it stays inline.
type DomainEntry = { owns: string[]; refer: Record<string, string[]> }
const DOMAIN_MAP: Record<string, DomainEntry> = {
  aria: {
    owns: ['orchestration','routing','dispatch','team management','status updates','summaries','planning','coordination','workflow'],
    refer: {
      'Dev Forge (REX, NOVA, BYTE, ZETA, FORGE)': ['code','programming','frontend','backend','API','bug','deploy','architecture'],
      'Design (LUNA, PIXEL, REEL)': ['design','UI','UX','visual','wireframe','branding','animation','video'],
      'Content (SCOUT, INK, GRACE, VIBE)': ['content','SEO','article','blog','social media','copywriting'],
      'Trading (HAWK, BLADE, SAGE, AUTO)': ['trading','forex','gold','XAU','signal','backtest','risk'],
      'Intelligence (ATLAS, MEMO, CIPHER)': ['data analysis','report','knowledge base','competitor','security'],
      'Finance (COIN, DEAL, BOOST)': ['revenue','P&L','ads','sales','budget'],
      'Systems (LEX, NEXUS, ECHO)': ['legal','R&D','innovation','voice','compliance'],
    }
  },
  rex: {
    owns: ['architecture','system design','code review','tech stack','scalability','patterns','monorepo','microservices','database schema','API design','performance'],
    refer: {
      'NOVA (Frontend)': ['React components','Next.js pages','UI implementation','CSS','Tailwind'],
      'BYTE (Backend)': ['API routes','server logic','database queries','Node.js'],
      'FORGE (DevOps)': ['deployment','Docker','CI/CD','infrastructure'],
      'ZETA (QA)': ['testing strategy','Vitest','Playwright'],
    }
  },
  nova: {
    owns: ['React','Next.js','TypeScript','Tailwind CSS','UI components','pages','layouts','hooks','state management','CSS animations','responsive design','frontend performance'],
    refer: {
      'BYTE (Backend)': ['API routes','server-side logic','database','Node.js'],
      'REX (Architect)': ['system design','architecture decisions'],
      'PIXEL (Visual)': ['color palette','branding','graphic assets'],
      'LUNA (UX)': ['user flows','wireframes','UX research'],
      'FORGE (DevOps)': ['deployment','Docker','CI/CD'],
    }
  },
  byte: {
    owns: ['API routes','backend logic','Node.js','Python','Go','PostgreSQL','Redis','MongoDB','authentication','REST','GraphQL','server performance','database queries','caching'],
    refer: {
      'NOVA (Frontend)': ['React','Next.js','UI components','CSS','frontend rendering'],
      'REX (Architect)': ['system architecture','tech stack','scalability'],
      'FORGE (DevOps)': ['deployment','Docker','CI/CD','cloud infrastructure'],
    }
  },
  zeta: {
    owns: ['unit testing','integration testing','E2E testing','Vitest','Jest','Playwright','k6','load testing','CI/CD pipelines','quality gates','test coverage','TDD'],
    refer: {
      'NOVA (Frontend)': ['React component code','UI fixes','CSS issues'],
      'BYTE (Backend)': ['API implementation','server bugs'],
      'FORGE (DevOps)': ['CI/CD setup','deployment pipeline'],
    }
  },
  forge: {
    owns: ['Docker','Kubernetes','Vercel','Railway','Nginx','GitHub Actions','CI/CD','deployment','infrastructure','environment variables','scaling','monitoring'],
    refer: {
      'BYTE (Backend)': ['API code','server logic'],
      'NOVA (Frontend)': ['frontend code','build config'],
      'REX (Architect)': ['architecture design'],
    }
  },
  luna: {
    owns: ['UX research','user flows','wireframes','prototypes','information architecture','interaction design','usability','accessibility','design systems','Figma','user journey'],
    refer: {
      'PIXEL (Visual Design)': ['color palette','typography','graphic assets','branding'],
      'NOVA (Frontend Dev)': ['React implementation','CSS animations','component code'],
      'SCOUT (Research)': ['market research','competitor UX analysis'],
    }
  },
  pixel: {
    owns: ['visual design','branding','logo','color theory','typography','graphic design','illustrations','icon sets','Figma','Canva','design tokens','brand guidelines','CSS variables'],
    refer: {
      'LUNA (UX/UI)': ['user flows','interaction design','wireframes','usability'],
      'NOVA (Frontend)': ['component implementation','Tailwind code','CSS animations'],
      'REEL (Video)': ['motion graphics','video content'],
    }
  },
  reel: {
    owns: ['video editing','motion graphics','After Effects','Premiere Pro','reels','shorts','animations','video strategy','YouTube','TikTok videos','transitions'],
    refer: {
      'PIXEL (Visual)': ['static graphics','branding','illustrations'],
      'VIBE (Social Media)': ['posting schedule','platform strategy'],
      'INK (Content)': ['scripts','captions','storyboards'],
    }
  },
  scout: {
    owns: ['SEO research','keyword analysis','trend research','competitor analysis','market scanning','search volume','keyword difficulty','SERP analysis','Google Trends'],
    refer: {
      'INK (Content Writer)': ['writing articles','blog posts','content creation'],
      'ATLAS (Data Analyst)': ['data visualization','statistical analysis'],
    }
  },
  ink: {
    owns: ['copywriting','blog posts','articles','long-form content','email copy','landing page copy','SEO writing','storytelling','hooks','CTAs','brand voice'],
    refer: {
      'SCOUT (Research)': ['keyword research','topic research','SEO data'],
      'GRACE (Editor)': ['proofreading','editing','tone consistency'],
      'VIBE (Social)': ['social media formats','caption writing'],
    }
  },
  grace: {
    owns: ['proofreading','editing','tone of voice','brand voice','grammar','style guides','content review','readability','localization'],
    refer: {
      'INK (Writer)': ['original content creation','copywriting','blog writing'],
      'VIBE (Social)': ['social media posts','platform engagement'],
    }
  },
  vibe: {
    owns: ['Instagram','TikTok','Twitter/X','Facebook','LinkedIn','social media strategy','content calendar','engagement','hashtags','community management','social analytics'],
    refer: {
      'INK (Content)': ['long-form content','blog posts','articles'],
      'REEL (Video)': ['video production','motion graphics'],
      'BOOST (Ads)': ['paid social campaigns','ad creative strategy'],
    }
  },
  hawk: {
    owns: ['Gold (XAU/USD)','Forex signals','technical analysis','candlestick patterns','RSI','MACD','EMA','support/resistance','market scanning','price action','market outlook'],
    refer: {
      'BLADE (Execution)': ['trade entry/exit','order types','position management'],
      'SAGE (Risk)': ['risk management','position sizing','drawdown limits'],
      'AUTO (Algo)': ['automated signals','backtesting','bot development'],
    }
  },
  blade: {
    owns: ['trade execution','entry/exit strategy','order types','position sizing','Kelly Criterion','trade management','slippage','broker selection','MT4/MT5','trade journaling'],
    refer: {
      'HAWK (Market Intel)': ['market signals','technical analysis','chart patterns'],
      'SAGE (Risk Manager)': ['overall risk framework','portfolio risk','drawdown management'],
      'AUTO (Algo)': ['automated execution','EA development','backtesting'],
    }
  },
  sage: {
    owns: ['risk management','drawdown management','position sizing','portfolio balance','risk/reward ratio','Kelly Criterion','VaR','max loss limits','correlation risk'],
    refer: {
      'HAWK (Market Intel)': ['trade signals','market analysis','entry points'],
      'BLADE (Execution)': ['actual trade execution','order placement'],
      'COIN (Finance)': ['overall P&L','business finances','budget'],
    }
  },
  auto: {
    owns: ['algo trading','Python bots','backtesting','EA Expert Advisor','MT4/MT5 scripting','strategy automation','historical data','walk-forward testing','MQL4/MQL5','pandas','backtrader'],
    refer: {
      'HAWK (Market Intel)': ['signal logic','technical indicators'],
      'BLADE (Execution)': ['manual execution strategy','trade management'],
      'SAGE (Risk)': ['risk parameters for bots','max drawdown'],
      'BYTE (Backend)': ['API integrations','server deployment of bots'],
    }
  },
  atlas: {
    owns: ['data analysis','SQL queries','data visualization','dashboards','KPIs','metrics','Excel/Google Sheets','Python pandas','statistical analysis','A/B testing','reporting','business intelligence'],
    refer: {
      'MEMO (Memory)': ['historical decisions','context from past','knowledge base'],
      'COIN (Finance)': ['financial metrics','revenue data','P&L interpretation'],
    }
  },
  memo: {
    owns: ['knowledge base','decision log','lessons learned','TAEC preferences','project context','historical context','pattern recognition','institutional memory'],
    refer: {
      'ATLAS (Data)': ['quantitative analysis','data reporting','dashboards'],
      'ARIA (Secretary)': ['task coordination','workflow questions','team status'],
    }
  },
  cipher: {
    owns: ['competitive intelligence','competitor analysis','OSINT','security audit','encryption','access control','threat modeling','vulnerability assessment','market intelligence'],
    refer: {
      'SCOUT (Research)': ['SEO/keyword competitor analysis','content gaps'],
      'FORGE (DevOps)': ['infrastructure security','deployment hardening'],
    }
  },
  coin: {
    owns: ['P&L tracking','revenue reporting','budgeting','financial planning','cash flow','expense tracking','financial modeling','ROI calculation','pricing strategy'],
    refer: {
      'DEAL (Sales)': ['sales pipeline','client acquisition','revenue growth'],
      'BOOST (Ads)': ['ad spend ROI','paid acquisition costs'],
      'LEX (Legal)': ['financial compliance','tax considerations','contracts'],
    }
  },
  deal: {
    owns: ['sales strategy','lead generation','deal closing','client relations','partnerships','negotiation','CRM','sales funnel','outreach','B2B sales','pitch decks'],
    refer: {
      'COIN (Finance)': ['pricing','revenue terms','financial planning'],
      'LEX (Legal)': ['contract review','terms & conditions','NDAs'],
      'BOOST (Ads)': ['paid lead generation','marketing campaigns'],
    }
  },
  boost: {
    owns: ['Meta Ads','Google Ads','TikTok Ads','ad creative strategy','campaign optimization','ROAS','CPA','CPM','retargeting','lookalike audiences','ad copy','A/B testing ads'],
    refer: {
      'PIXEL (Visual)': ['ad creative design','graphic assets'],
      'INK (Content)': ['ad copy','landing page copy'],
      'COIN (Finance)': ['ad budget allocation','ROI tracking'],
    }
  },
  lex: {
    owns: ['legal compliance','contracts','terms of service','privacy policy','NDA','IP protection','copyright','trademark','business registration','PDPA/GDPR'],
    refer: {
      'COIN (Finance)': ['financial planning','tax strategy'],
      'DEAL (Sales)': ['commercial negotiations','partnership terms'],
    }
  },
  nexus: {
    owns: ['R&D','new technology exploration','innovation strategy','tech scouting','POC development','AI/ML research','emerging tech trends','technology radar','build vs buy'],
    refer: {
      'REX (Architect)': ['architecture implementation','tech stack execution'],
      'BYTE (Backend)': ['POC implementation','API prototyping'],
    }
  },
  echo: {
    owns: ['voice commands','audio processing','TTS','speech recognition','notification systems','LINE Notify','Slack bots','webhook notifications','alert systems'],
    refer: {
      'BYTE (Backend)': ['API integration','webhook implementation','server-side bots'],
      'FORGE (DevOps)': ['bot hosting','deployment'],
    }
  },
}

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
