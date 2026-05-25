import { getAgentModel, getAgentModelTier, MODEL_TIER_COLOR } from '@/lib/models'
export { getAgentModel, getAgentModelTier, MODEL_TIER_COLOR }

export type AgentStatus = 'online' | 'busy' | 'idle' | 'offline'
export type AgentTier   = 'LEGENDARY' | 'EPIC' | 'RARE'
export type AgentModel  = 'opus' | 'sonnet' | 'haiku'

export interface Agent {
  id: string
  name: string
  title: string
  dept: string
  deptColor: string
  emoji: string
  color: string
  status: AgentStatus
  tier: AgentTier
  description: string
  skills: string[]
  model: AgentModel
}

export interface Quest {
  id: string
  title: string
  description: string
  proposedBy: string
  dept: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'DONE' | 'REJECTED'
  createdAt: string
}

export interface LogEntry {
  id: string
  agentId: string
  action: string
  detail: string
  status: 'success' | 'in_progress' | 'failed'
  timestamp: string
}

export const agents: Agent[] = [
  /* ── Secretary ── */
  {
    id:'aria', name:'ARIA', title:'Grand Secretary', dept:'Secretary', deptColor:'var(--dept-secretary)',
    emoji:'🔮', color:'#6c63ff', status:'online', tier:'LEGENDARY',
    description:'รับคำสั่ง วิเคราะห์ งาน และ dispatch ไปยัง agent ที่เกี่ยวข้อง orchestrator หลักของ NEXMIND',
    skills:['Routing','Orchestration','Summarization','Memory'],
    model: 'sonnet',
  },
  /* ── Dev Forge ── */
  {
    id:'rex', name:'REX', title:'Tech Architect', dept:'Dev Forge', deptColor:'var(--dept-dev)',
    emoji:'🔬', color:'#00d4ff', status:'online', tier:'EPIC',
    description:'System design, code review, architecture decisions, tech stack selection',
    skills:['Architecture','Code Review','System Design','Tech Lead'],
    model: 'opus',
  },
  {
    id:'nova', name:'NOVA', title:'Frontend Dev', dept:'Dev Forge', deptColor:'var(--dept-dev)',
    emoji:'💻', color:'#38bdf8', status:'busy', tier:'EPIC',
    description:'React, Next.js, TypeScript, Tailwind — UI components และ performance optimization',
    skills:['React','Next.js','TypeScript','Tailwind','UI'],
    model: 'sonnet',
  },
  {
    id:'byte', name:'BYTE', title:'Backend Dev', dept:'Dev Forge', deptColor:'var(--dept-dev)',
    emoji:'🔧', color:'#34d399', status:'online', tier:'EPIC',
    description:'API design, database, server logic, Hono, Node, Python, Go',
    skills:['API','Node.js','PostgreSQL','Python','Go'],
    model: 'opus',
  },
  {
    id:'zeta', name:'ZETA', title:'QA Engineer', dept:'Dev Forge', deptColor:'var(--dept-dev)',
    emoji:'🧪', color:'#67e8f9', status:'idle', tier:'RARE',
    description:'Testing, CI/CD, quality assurance — Vitest, Playwright, k6',
    skills:['Vitest','Playwright','k6','CI/CD'],
    model: 'sonnet',
  },
  {
    id:'forge', name:'FORGE', title:'DevOps', dept:'Dev Forge', deptColor:'var(--dept-dev)',
    emoji:'⚙️', color:'#0ea5e9', status:'idle', tier:'RARE',
    description:'Docker, deploy, infrastructure — Vercel, Railway, Nginx, GitHub Actions',
    skills:['Docker','CI/CD','Vercel','Nginx','GitHub Actions'],
    model: 'sonnet',
  },
  /* ── Design ── */
  {
    id:'luna', name:'LUNA', title:'UX/UI Designer', dept:'Design', deptColor:'var(--dept-design)',
    emoji:'🌸', color:'#a78bfa', status:'online', tier:'EPIC',
    description:'User experience, wireframes, design systems, interaction design',
    skills:['UX Research','Wireframe','Design System','Figma'],
    model: 'sonnet',
  },
  {
    id:'pixel', name:'PIXEL', title:'Visual Designer', dept:'Design', deptColor:'var(--dept-design)',
    emoji:'🎨', color:'#c084fc', status:'busy', tier:'EPIC',
    description:'Graphics, branding, visual assets, illustrations',
    skills:['Branding','Illustration','Typography','Figma'],
    model: 'sonnet',
  },
  {
    id:'reel', name:'REEL', title:'Video Producer', dept:'Design', deptColor:'var(--dept-design)',
    emoji:'🎬', color:'#818cf8', status:'idle', tier:'RARE',
    description:'Video editing, motion graphics, reels, shorts',
    skills:['Video Edit','Motion','Reels','After Effects'],
    model: 'haiku',
  },
  /* ── Content ── */
  {
    id:'scout', name:'SCOUT', title:'Research Lead', dept:'Content', deptColor:'var(--dept-content)',
    emoji:'📊', color:'#22d3ee', status:'online', tier:'EPIC',
    description:'Trend research, SEO analysis, market scanning, keyword strategy',
    skills:['SEO','Trend Analysis','Research','Keywords'],
    model: 'sonnet',
  },
  {
    id:'ink', name:'INK', title:'Content Writer', dept:'Content', deptColor:'var(--dept-content)',
    emoji:'✍️', color:'#4ade80', status:'online', tier:'RARE',
    description:'Articles, blog posts, copywriting, long-form content',
    skills:['Copywriting','SEO Writing','Blog','Articles'],
    model: 'sonnet',
  },
  {
    id:'grace', name:'GRACE', title:'Editor', dept:'Content', deptColor:'var(--dept-content)',
    emoji:'✨', color:'#7dd3fc', status:'idle', tier:'RARE',
    description:'Proofreading, quality editing, tone consistency, brand voice',
    skills:['Editing','Proofreading','Brand Voice','Quality'],
    model: 'sonnet',
  },
  {
    id:'vibe', name:'VIBE', title:'Social Media', dept:'Content', deptColor:'var(--dept-content)',
    emoji:'📱', color:'#67e8f9', status:'busy', tier:'RARE',
    description:'Social posts, engagement strategy, scheduling, platform optimization',
    skills:['Instagram','TikTok','Twitter','Scheduling'],
    model: 'haiku',
  },
  /* ── Trading ── */
  {
    id:'hawk', name:'HAWK', title:'Market Intel', dept:'Trading', deptColor:'var(--dept-trading)',
    emoji:'🦅', color:'#22d3ee', status:'online', tier:'EPIC',
    description:'Gold/Forex signals, market scanning, candlestick pattern recognition',
    skills:['Technical Analysis','Gold','Forex','Signals'],
    model: 'opus',
  },
  {
    id:'blade', name:'BLADE', title:'Trade Executor', dept:'Trading', deptColor:'var(--dept-trading)',
    emoji:'⚔️', color:'#f43f5e', status:'idle', tier:'RARE',
    description:'Trade execution, position sizing, entry/exit strategy',
    skills:['Execution','Position Sizing','Risk','Kelly Criterion'],
    model: 'opus',
  },
  {
    id:'sage', name:'SAGE', title:'Risk Manager', dept:'Trading', deptColor:'var(--dept-trading)',
    emoji:'🧙', color:'#818cf8', status:'online', tier:'EPIC',
    description:'Risk analysis, drawdown management, portfolio balance',
    skills:['Risk Management','Drawdown','Portfolio','Analysis'],
    model: 'opus',
  },
  {
    id:'auto', name:'AUTO', title:'Algo Bot', dept:'Trading', deptColor:'var(--dept-trading)',
    emoji:'🤖', color:'#06b6d4', status:'idle', tier:'RARE',
    description:'Automated trading, backtesting, Python bot development',
    skills:['Python','Backtest','Automation','Algo Trading'],
    model: 'haiku',
  },
  /* ── Intelligence ── */
  {
    id:'atlas', name:'ATLAS', title:'Data Analyst', dept:'Intelligence', deptColor:'var(--dept-intelligence)',
    emoji:'🗺️', color:'#60a5fa', status:'online', tier:'EPIC',
    description:'Data analysis, reporting, dashboards, insight generation',
    skills:['Data Analysis','Reporting','SQL','Visualization'],
    model: 'opus',
  },
  {
    id:'memo', name:'MEMO', title:'Memory Keeper', dept:'Intelligence', deptColor:'var(--dept-intelligence)',
    emoji:'🧠', color:'#a78bfa', status:'online', tier:'EPIC',
    description:'Knowledge base, decisions log, lessons learned, TAEC preferences',
    skills:['Knowledge Base','Memory','Decisions','Context'],
    model: 'sonnet',
  },
  {
    id:'cipher', name:'CIPHER', title:'Competitive Intel', dept:'Intelligence', deptColor:'var(--dept-intelligence)',
    emoji:'🔐', color:'#34d399', status:'idle', tier:'RARE',
    description:'Competitor analysis, security, encryption, intelligence gathering',
    skills:['Competitive Intel','Security','Research','Analysis'],
    model: 'opus',
  },
  /* ── Finance ── */
  {
    id:'coin', name:'COIN', title:'Finance Lead', dept:'Finance', deptColor:'var(--dept-finance)',
    emoji:'💰', color:'#5eead4', status:'online', tier:'EPIC',
    description:'P&L tracking, revenue reporting, budgeting, financial planning',
    skills:['P&L','Revenue','Budgeting','Finance'],
    model: 'opus',
  },
  {
    id:'deal', name:'DEAL', title:'Sales', dept:'Finance', deptColor:'var(--dept-finance)',
    emoji:'🤝', color:'#38bdf8', status:'idle', tier:'RARE',
    description:'Sales strategy, partnerships, deal closing, client relations',
    skills:['Sales','Partnerships','Negotiation','CRM'],
    model: 'opus',
  },
  {
    id:'boost', name:'BOOST', title:'Ads Manager', dept:'Finance', deptColor:'var(--dept-finance)',
    emoji:'📈', color:'#86efac', status:'idle', tier:'RARE',
    description:'Ad campaigns, ROI optimization, Meta/Google Ads management',
    skills:['Meta Ads','Google Ads','ROI','Campaigns'],
    model: 'opus',
  },
  /* ── Systems ── */
  {
    id:'lex', name:'LEX', title:'Legal Advisor', dept:'Systems', deptColor:'var(--dept-systems)',
    emoji:'⚖️', color:'#93c5fd', status:'idle', tier:'RARE',
    description:'Legal compliance, contracts, terms of service, IP protection',
    skills:['Legal','Contracts','Compliance','IP'],
    model: 'sonnet',
  },
  {
    id:'nexus', name:'NEXUS', title:'R&D Lead', dept:'Systems', deptColor:'var(--dept-systems)',
    emoji:'🔗', color:'#c084fc', status:'online', tier:'RARE',
    description:'Research, new tech exploration, innovation, trend scouting',
    skills:['R&D','Innovation','Tech Scouting','Research'],
    model: 'opus',
  },
  {
    id:'echo', name:'ECHO', title:'Voice Interface', dept:'Systems', deptColor:'var(--dept-systems)',
    emoji:'🔊', color:'#67e8f9', status:'idle', tier:'RARE',
    description:'Voice commands, audio processing, notification systems',
    skills:['Voice','Audio','Notifications','TTS'],
    model: 'haiku',
  },
]

export const depts = [
  { name:'Secretary',   color:'var(--dept-secretary)',   icon:'🔮' },
  { name:'Dev Forge',   color:'var(--dept-dev)',         icon:'💻' },
  { name:'Design',      color:'var(--dept-design)',      icon:'🌸' },
  { name:'Content',     color:'var(--dept-content)',     icon:'📖' },
  { name:'Trading',     color:'var(--dept-trading)',     icon:'⚔️' },
  { name:'Intelligence',color:'var(--dept-intelligence)',icon:'🧠' },
  { name:'Finance',     color:'var(--dept-finance)',     icon:'💰' },
  { name:'Systems',     color:'var(--dept-systems)',     icon:'⚗️' },
]

export const quests: Quest[] = [
  { id:'q1', title:'Implement Claude API streaming', description:'เพิ่ม streaming response ให้ chat UI ใน guild room เพื่อให้รู้สึก real-time มากขึ้น', proposedBy:'rex', dept:'Dev Forge', priority:'HIGH', status:'PENDING', createdAt:'2026-05-22 09:30' },
  { id:'q2', title:'Social post automation pipeline', description:'สร้าง workflow ที่ VIBE generate post → GRACE review → auto post ตาม schedule ที่กำหนด', proposedBy:'vibe', dept:'Content', priority:'HIGH', status:'PENDING', createdAt:'2026-05-22 09:00' },
  { id:'q3', title:'Agent avatar pixel art set', description:'ออกแบบ pixel art avatar สำหรับทุก agent เพื่อใช้ใน Roster และ Guild Room scene', proposedBy:'pixel', dept:'Design', priority:'MEDIUM', status:'APPROVED', createdAt:'2026-05-21 14:00' },
  { id:'q4', title:'Gold signal daily digest', description:'ให้ HAWK ส่ง morning brief สรุป Gold/XAU outlook ทุกวัน 08:00 ไปยัง dashboard', proposedBy:'hawk', dept:'Trading', priority:'HIGH', status:'IN_PROGRESS', createdAt:'2026-05-21 11:00' },
  { id:'q5', title:'MEMO database schema', description:'ออกแบบ schema สำหรับ Scroll Vault — decisions, lessons, preferences, project context', proposedBy:'memo', dept:'Intelligence', priority:'MEDIUM', status:'PENDING', createdAt:'2026-05-22 08:00' },
  { id:'q6', title:'Affiliate landing page v2', description:'redesign affiliate page ใหม่ ใช้ Ghibli theme ให้ conversion rate ดีขึ้น', proposedBy:'luna', dept:'Design', priority:'MEDIUM', status:'PENDING', createdAt:'2026-05-20 16:00' },
  { id:'q7', title:'P&L tracker dashboard widget', description:'เพิ่ม revenue widget ใน dashboard ที่ pull ข้อมูลจาก Google Sheet อัตโนมัติ', proposedBy:'coin', dept:'Finance', priority:'MEDIUM', status:'PENDING', createdAt:'2026-05-19 10:00' },
  { id:'q8', title:'n8n + LINE Notify integration', description:'เชื่อม n8n workflow กับ LINE Notify เพื่อให้ agent notify TAEC เมื่องานเสร็จ', proposedBy:'nexus', dept:'Systems', priority:'HIGH', status:'PENDING', createdAt:'2026-05-22 10:00' },
  { id:'q9', title:'SEO keyword cluster for Collagen', description:'research keyword cluster สำหรับ Collagen affiliate → 50+ keywords พร้อม intent', proposedBy:'scout', dept:'Content', priority:'LOW', status:'DONE', createdAt:'2026-05-18 09:00' },
  { id:'q10', title:'Backtest XAU EA strategy', description:'backtest strategy ใหม่บน XAU M15 ย้อนหลัง 2 ปี แล้ว report win rate + max drawdown', proposedBy:'auto', dept:'Trading', priority:'LOW', status:'PENDING', createdAt:'2026-05-20 13:00' },
]

export const logEntries: LogEntry[] = [
  { id:'l1',  agentId:'nova',   action:'Refactored affiliate page', detail:'ลด re-render 60% · /pages/affiliate.tsx', status:'success',     timestamp:'2026-05-22 11:42' },
  { id:'l2',  agentId:'byte',   action:'Optimized API query',       detail:'response time -340ms · /api/products',  status:'success',     timestamp:'2026-05-22 11:38' },
  { id:'l3',  agentId:'zeta',   action:'Running test suite',        detail:'Vitest · 42 tests passing...',          status:'in_progress', timestamp:'2026-05-22 11:35' },
  { id:'l4',  agentId:'scout',  action:'Trend research complete',   detail:'Collagen keywords: 52 found',           status:'success',     timestamp:'2026-05-22 10:55' },
  { id:'l5',  agentId:'hawk',   action:'Gold signal generated',     detail:'XAU/USD bullish · RSI 58 · EMA cross',  status:'success',     timestamp:'2026-05-22 10:00' },
  { id:'l6',  agentId:'aria',   action:'Session initialized',       detail:'Checked MEMO · 2 pending decisions',    status:'success',     timestamp:'2026-05-22 09:00' },
  { id:'l7',  agentId:'luna',   action:'Wireframe v2 submitted',    detail:'Affiliate landing page · 8 screens',    status:'success',     timestamp:'2026-05-21 17:30' },
  { id:'l8',  agentId:'ink',    action:'Article drafted',           detail:'"Top Collagen 2026" · 1,240 words',     status:'success',     timestamp:'2026-05-21 15:00' },
  { id:'l9',  agentId:'pixel',  action:'Brand assets updated',      detail:'Logo variants + icon set · 24 files',   status:'success',     timestamp:'2026-05-21 14:20' },
  { id:'l10', agentId:'memo',   action:'Knowledge base updated',    detail:'3 new decisions · 1 lesson learned',    status:'success',     timestamp:'2026-05-21 13:00' },
  { id:'l11', agentId:'byte',   action:'API rate limit hit',        detail:'Claude API · retry scheduled in 60s',   status:'failed',      timestamp:'2026-05-21 11:55' },
  { id:'l12', agentId:'atlas',  action:'Weekly report generated',   detail:'Revenue +12% · 7 KPIs tracked',         status:'success',     timestamp:'2026-05-21 09:00' },
]
