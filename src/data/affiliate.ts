/* ─────────────────────────────────────────
   Affiliate · Data Model + Mock Data
   Single source of truth for the Partner Hub.
   Pure module — no React, fully unit-testable.
───────────────────────────────────────── */

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type StatKey = 'clicks' | 'conversions' | 'earnings' | 'pending'

export interface Stat {
  key: StatKey
  label: string
  value: number
  prefix?: string
  suffix?: string
  delta: string
  positive: boolean
  gradient: string
  glow: string
  icon: string
}

export type CommissionStatus = 'positive' | 'pending' | 'negative'

export interface Commission {
  product: string
  tier: string
  rate: string
  sales: number
  earned: number
  status: CommissionStatus
}

export type ReferralStatus = 'active' | 'pending' | 'churned'

export interface Referral {
  user: string
  email: string
  joined: string
  status: ReferralStatus
  value: number
  source: string
}

export type PayoutStatus = 'paid' | 'pending' | 'processing'

export interface Payout {
  date: string
  method: string
  amount: number
  ref: string
  status: PayoutStatus
}

export type AssetType = 'banner' | 'social' | 'email' | 'video'

export interface Asset {
  name: string
  type: AssetType
  size: string
  downloads: number
  preview: string
}

export interface Faq {
  q: string
  a: string
}

/* ── Account constants ── */
export const REFERRAL_LINK = 'https://nexmind.ai/r/taec-9F2X'
export const CURRENT_EARNINGS = 284750
export const CURRENT_TIER: Tier = 'gold'
export const NEXT_TIER: Tier = 'platinum'

export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum']
export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 50000,
  gold: 200000,
  platinum: 500000,
}

/* ── Stats ── */
export const STATS: Stat[] = [
  { key:'clicks',      label:'Total Clicks',   value:18420, delta:'+12.4% wk',   positive:true,  gradient:'var(--stat-grad-clicks)',   glow:'var(--aff-glow-royal)',   icon:'🖱️' },
  { key:'conversions', label:'Conversions',    value:1248,  delta:'+8.1% wk',    positive:true,  gradient:'var(--stat-grad-conv)',     glow:'var(--aff-glow-emerald)', icon:'🎯' },
  { key:'earnings',    label:'Total Earnings', value:284750, prefix:'฿', delta:'+24.6% mo', positive:true, gradient:'var(--stat-grad-earnings)', glow:'var(--aff-glow-gold)', icon:'💰' },
  { key:'pending',     label:'Pending Payout', value:42180,  prefix:'฿', delta:'next 14d',  positive:true, gradient:'var(--stat-grad-pending)',  glow:'var(--aff-glow-gold)', icon:'⏳' },
]

/* ── Commissions ── */
export const COMMISSIONS: Commission[] = [
  { product:'NEXMIND Pro · Annual',        tier:'Gold',       rate:'35%',  sales:42,  earned:84000, status:'positive' },
  { product:'NEXMIND Pro · Monthly',       tier:'Standard',   rate:'25%',  sales:128, earned:64000, status:'positive' },
  { product:'Agent Marketplace · Add-on',  tier:'Premium',    rate:'40%',  sales:18,  earned:32400, status:'positive' },
  { product:'Custom Pipeline · Setup',     tier:'Enterprise', rate:'15%',  sales:6,   earned:54000, status:'pending'  },
  { product:'Training Bundle',             tier:'Standard',   rate:'20%',  sales:24,  earned:14400, status:'pending'  },
  { product:'Refund · Mission Pack',       tier:'Standard',   rate:'-25%', sales:2,   earned:-2800, status:'negative' },
]

/* ── Referrals ── */
export const REFERRALS: Referral[] = [
  { user:'Areeya M.',  email:'areeya@studio.co',   joined:'2 hr ago',  status:'active',  value:14800, source:'YouTube' },
  { user:'Kongpop S.', email:'kp@devforge.io',     joined:'5 hr ago',  status:'active',  value:8900,  source:'Twitter / X' },
  { user:'Mint W.',    email:'mint@hyperloop.app', joined:'1 day ago', status:'pending', value:0,     source:'Direct' },
  { user:'Tony R.',    email:'tony@goldlab.tech',  joined:'2 day ago', status:'active',  value:24400, source:'Newsletter' },
  { user:'Nina P.',    email:'nina@craft.studio',  joined:'3 day ago', status:'active',  value:6200,  source:'Blog Post' },
  { user:'Beam K.',    email:'beam@vault.app',     joined:'4 day ago', status:'churned', value:1900,  source:'YouTube' },
]

/* ── Payouts ── */
export const PAYOUTS: Payout[] = [
  { date:'2026-05-15', method:'Bank Transfer · SCB', amount:48200, ref:'PO-2026-0042', status:'paid' },
  { date:'2026-04-15', method:'Bank Transfer · SCB', amount:52800, ref:'PO-2026-0038', status:'paid' },
  { date:'2026-03-15', method:'PayPal',              amount:36400, ref:'PO-2026-0031', status:'paid' },
  { date:'2026-02-15', method:'Bank Transfer · SCB', amount:41200, ref:'PO-2026-0024', status:'paid' },
  { date:'2026-06-01', method:'Bank Transfer · SCB', amount:42180, ref:'PO-2026-0049', status:'processing' },
]

/* ── Marketing assets ── */
export const ASSETS: Asset[] = [
  { name:'Hero Banner · 1920×1080', type:'banner', size:'2.4 MB', downloads:248, preview:'🖼️' },
  { name:'Square Social · 1080²',   type:'social', size:'1.1 MB', downloads:412, preview:'📱' },
  { name:'Email Header · Premium',  type:'email',  size:'380 KB', downloads:186, preview:'✉️' },
  { name:'Story · 1080×1920',       type:'social', size:'1.6 MB', downloads:324, preview:'📲' },
  { name:'Demo Reel · 30s',         type:'video',  size:'18 MB',  downloads:96,  preview:'🎬' },
  { name:'Side Banner · 300×600',   type:'banner', size:'620 KB', downloads:142, preview:'🪧' },
]

export const ASSET_FILTERS: ('all' | AssetType)[] = ['all', 'banner', 'social', 'email', 'video']

/* ── FAQ ── */
export const FAQS: Faq[] = [
  { q:'จะได้รับ commission เมื่อไหร่?', a:'Commission จะถูก lock 14 วันหลังการสั่งซื้อ (refund window) แล้วโอนเข้าบัญชีในรอบถัดไป — ทุกวันที่ 15 ของเดือน' },
  { q:'ขั้นต่ำในการถอนเงินคือเท่าไหร่?', a:'ขั้นต่ำ ฿2,000 ต่อการถอนหนึ่งครั้ง สำหรับ Platinum tier ลดเหลือ ฿500' },
  { q:'Cookie ของ referral link อยู่ได้กี่วัน?', a:'90 วัน first-touch attribution — แม้ user จะกลับมาซื้อทีหลัง คุณก็ยังได้ commission' },
  { q:'เพิ่ม tier ได้อย่างไร?', a:'Tier คำนวณจาก total earnings ใน 12 เดือนล่าสุด · Silver ฿50k · Gold ฿200k · Platinum ฿500k+' },
  { q:'รองรับ payment method ไหนบ้าง?', a:'Bank Transfer (Thai banks), PayPal, Wise · ขึ้นกับ tier — Gold ขึ้นไปได้ instant payout' },
  { q:'มี marketing assets ให้ใช้ฟรีไหม?', a:'มี · ทั้ง banner, social, email template, video reels — download ได้จาก Marketing Assets section' },
]

/* ── Derived: tier progression ──
   Pure helper, unit-testable independent of React. */
export interface TierProgress {
  pct: number   // 0..100 progress toward next tier
  gap: number   // ฿ remaining to reach next tier
  cur: number   // current tier threshold
  next: number  // next tier threshold
}

export function getTierProgress(
  earnings: number = CURRENT_EARNINGS,
  fromTier: Tier = CURRENT_TIER,
  toTier: Tier = NEXT_TIER,
): TierProgress {
  const cur = TIER_THRESHOLDS[fromTier]
  const next = TIER_THRESHOLDS[toTier]
  const pct = Math.min(100, Math.max(0, ((earnings - cur) / (next - cur)) * 100))
  const gap = next - earnings
  return { pct, gap, cur, next }
}
