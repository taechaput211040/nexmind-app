'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ─── TYPES & DATA ────────────────────────────────────────────────────────────

interface AgentData {
  name: string; role: string; dept: string
  hair: string; shirt: string; status: 'busy'|'idle'
}

const AGENTS: Record<string, AgentData> = {
  aria:   { name:'ARIA',   role:'CEO',              dept:'hq',       hair:'#c084fc', shirt:'#7c3aed', status:'busy'  },
  rex:    { name:'REX',    role:'Backend Dev',       dept:'tech',     hair:'#93c5fd', shirt:'#1d4ed8', status:'idle'  },
  nova:   { name:'NOVA',   role:'Frontend Dev',      dept:'tech',     hair:'#fcd34d', shirt:'#b45309', status:'idle'  },
  byte:   { name:'BYTE',   role:'AI/ML Engineer',    dept:'tech',     hair:'#6ee7b7', shirt:'#065f46', status:'idle'  },
  zeta:   { name:'ZETA',   role:'DevOps',            dept:'tech',     hair:'#c4b5fd', shirt:'#6d28d9', status:'idle'  },
  forge:  { name:'FORGE',  role:'Systems Dev',       dept:'tech',     hair:'#fb923c', shirt:'#9a3412', status:'idle'  },
  luna:   { name:'LUNA',   role:'Video Editor',      dept:'creative', hair:'#fda4af', shirt:'#be123c', status:'busy'  },
  pixel:  { name:'PIXEL',  role:'Graphic Designer',  dept:'creative', hair:'#f472b6', shirt:'#9d174d', status:'busy'  },
  reel:   { name:'REEL',   role:'Motion Designer',   dept:'creative', hair:'#a3e635', shirt:'#3f6212', status:'busy'  },
  scout:  { name:'SCOUT',  role:'Researcher',        dept:'creative', hair:'#67e8f9', shirt:'#0e7490', status:'idle'  },
  ink:    { name:'INK',    role:'Copywriter',        dept:'creative', hair:'#fde68a', shirt:'#92400e', status:'busy'  },
  grace:  { name:'GRACE',  role:'Social Media',      dept:'creative', hair:'#ddd6fe', shirt:'#5b21b6', status:'idle'  },
  vibe:   { name:'VIBE',   role:'Brand Strategy',    dept:'creative', hair:'#bbf7d0', shirt:'#065f46', status:'busy'  },
  hawk:   { name:'HAWK',   role:'Sales Lead',        dept:'ops',      hair:'#fed7aa', shirt:'#9a3412', status:'busy'  },
  blade:  { name:'BLADE',  role:'Negotiator',        dept:'ops',      hair:'#d9f99d', shirt:'#3f6212', status:'idle'  },
  sage:   { name:'SAGE',   role:'Strategist',        dept:'ops',      hair:'#a5f3fc', shirt:'#0e7490', status:'busy'  },
  auto:   { name:'AUTO',   role:'Automation Dev',    dept:'ops',      hair:'#bbf7d0', shirt:'#064e3b', status:'idle'  },
  coin:   { name:'COIN',   role:'Finance Tracker',   dept:'finance',  hair:'#fef08a', shirt:'#854d0e', status:'busy'  },
  deal:   { name:'DEAL',   role:'Deal Closer',       dept:'finance',  hair:'#86efac', shirt:'#14532d', status:'busy'  },
  boost:  { name:'BOOST',  role:'Growth Hacker',     dept:'finance',  hair:'#fda4af', shirt:'#881337', status:'idle'  },
  memo:   { name:'MEMO',   role:'Report Writer',     dept:'finance',  hair:'#bae6fd', shirt:'#0c4a6e', status:'idle'  },
  atlas:  { name:'ATLAS',  role:'Market Analyst',    dept:'finance',  hair:'#fed7aa', shirt:'#78350f', status:'busy'  },
  cipher: { name:'CIPHER', role:'Security Analyst',  dept:'finance',  hair:'#e9d5ff', shirt:'#4c1d95', status:'idle'  },
}

interface DeptInfo { name:string; color:string; accent:string; desc:string }
const DEPTS: Record<string, DeptInfo> = {
  hq:       { name:'NEXMIND HQ',      color:'#4c1d95', accent:'#9333ea', desc:'Command Center' },
  tech:     { name:'TECH HUB',        color:'#1e3a8a', accent:'#3b82f6', desc:'Engineering Lab' },
  creative: { name:'CREATIVE STUDIO', color:'#881337', accent:'#e11d48', desc:'Creative Studio' },
  ops:      { name:'OPS CENTER',      color:'#14532d', accent:'#16a34a', desc:'Operations Base' },
  finance:  { name:'FINANCE WING',    color:'#78350f', accent:'#d97706', desc:'Financial Core'  },
}

const TASKS = [
  { id:'T001', title:'Build Auth System',    dept:'tech',     status:'done',    prog:100, agent:'rex'    },
  { id:'T002', title:'Design Landing Page',  dept:'creative', status:'active',  prog:72,  agent:'pixel'  },
  { id:'T003', title:'Train ML Model',       dept:'tech',     status:'active',  prog:58,  agent:'byte'   },
  { id:'T004', title:'Q2 Financial Report',  dept:'finance',  status:'active',  prog:41,  agent:'coin'   },
  { id:'T005', title:'Brand Identity Pack',  dept:'creative', status:'pending', prog:15,  agent:'vibe'   },
  { id:'T006', title:'Deploy k8s Cluster',   dept:'ops',      status:'active',  prog:88,  agent:'sage'   },
  { id:'T007', title:'Video Campaign',       dept:'creative', status:'pending', prog:5,   agent:'luna'   },
  { id:'T008', title:'Sales Pipeline Q3',    dept:'finance',  status:'active',  prog:63,  agent:'deal'   },
  { id:'T009', title:'API Rate Limiter',     dept:'tech',     status:'done',    prog:100, agent:'forge'  },
  { id:'T010', title:'Social Media Kit',     dept:'creative', status:'active',  prog:34,  agent:'grace'  },
]

const BUBBLES: Record<string, string[]> = {
  aria:   ['Orchestrating agents...','Sprint velocity +22%','Global sync active'],
  rex:    ['Pushing to prod...','API green OK','DB migration done'],
  nova:   ['CSS pixel-perfect!','Component refactored','UI shipped'],
  byte:   ['Model accuracy: 98%','Training epoch 47','Loss converging'],
  zeta:   ['K8s 24 pods healthy','CI pipeline green','Deploy complete'],
  forge:  ['Hot path -40%','Memory optimized!','Benchmarks pass'],
  luna:   ['Color grade done','Export 4K...','Timeline locked'],
  pixel:  ['Brand kit done!','Figma shared','Assets ready'],
  reel:   ['Motion test done','3D rig complete','Render: 84%'],
  scout:  ['Research compiled','Trends report out','Data verified'],
  ink:    ['SEO copy done','Blog post ready','CTA live'],
  grace:  ['Post scheduled','Engagement +12%','Reel hits 10K!'],
  vibe:   ['Brand deck ready','PR pitch sent','Collab confirmed'],
  hawk:   ['Deal closing!','Quota at 94%','Pipeline full'],
  blade:  ['Contract reviewed','Terms locked in','Negotiation done'],
  sage:   ['Q3 roadmap done','OKRs aligned','Strategy shipped'],
  auto:   ['Scraper deployed','RPA task done','Automation live'],
  coin:   ['Revenue +18% MoM','P&L balanced','Report filed'],
  deal:   ['LOI signed!','Pipeline: $240K','Contract sent'],
  boost:  ['CR up to 4.2%','Growth loop live','ARPU +22%'],
  memo:   ['Board report done','KPI summary sent','Brief ready'],
  atlas:  ['TAM analysis done','Market model built','Data validated'],
  cipher: ['0 vulnerabilities','Pentest clean','Audit passed'],
}

const CONSOLE_LOG = [
  '[SYSTEM] NexMind OS v4.2.0 -- all systems nominal',
  '[ARIA] Orchestrating 3 parallel tasks across 5 depts',
  '[BYTE] Neural net accuracy reached 98.2% on eval set',
  '[FORGE] Memory allocator patched -- hot path 40% faster',
  '[ZETA] Kubernetes autoscaler: 24 pods healthy',
  '[COIN] Revenue milestone: $2.4M MRR achieved',
  '[PIXEL] Asset pipeline: 847 files processed & CDN-synced',
  '[SAGE] Ops efficiency score: 94.7% (up from 88.2%)',
  '[HAWK] 3 enterprise prospects moved to closing stage',
  '[CIPHER] Full security audit: 0 vulnerabilities found',
  '[REX] API P95 latency: 12ms (target < 50ms OK)',
  '[NOVA] Lighthouse score: 98 performance, 100 a11y',
]

const CHAT_INIT = [
  { from:'ARIA',  col:'#c084fc', msg:'Sprint velocity up 22% -- excellent work team.' },
  { from:'COIN',  col:'#fef08a', msg:'Revenue milestone hit! $2.4M MRR' },
  { from:'PIXEL', col:'#f472b6', msg:'New brand kit shipped, check Figma.' },
  { from:'REX',   col:'#93c5fd', msg:'API P95 finally under 50ms' },
  { from:'SAGE',  col:'#a5f3fc', msg:'Q3 roadmap locked and distributed.' },
  { from:'BYTE',  col:'#6ee7b7', msg:'Model eval accuracy: 98.2%!' },
  { from:'HAWK',  col:'#fed7aa', msg:'3 deals in final stage this week' },
]

const MUSIC: { title:string; col:string }[] = [
  { title:'CYBER DAWN',       col:'#8b5cf6' },
  { title:'NEON PROTOCOL',    col:'#06b6d4' },
  { title:'BINARY SUNSET',    col:'#f59e0b' },
  { title:'QUANTUM PULSE',    col:'#10b981' },
  { title:'DIGITAL RAIN',     col:'#3b82f6' },
  { title:'NEURAL DRIFT',     col:'#ec4899' },
]

// ─── COLOUR UTILITIES ─────────────────────────────────────────────────────────

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  return `rgba(${n >> 16},${(n >> 8) & 0xff},${n & 0xff},${a})`
}

function prng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// ─── 2.5D ISOMETRIC ENGINE ────────────────────────────────────────────────────

type P2 = [number, number]
type IsoFn = (ix: number, iy: number, iz?: number) => P2

function mkISO(ox: number, oy: number, TS: number): IsoFn {
  return (ix: number, iy: number, iz = 0): P2 => [
    Math.round(ox + (ix - iy) * TS),
    Math.round(oy + (ix + iy) * TS * 0.5 - iz * TS),
  ]
}

function poly(
  ctx: CanvasRenderingContext2D,
  pts: P2[], fill: string,
  stroke = 'rgba(0,0,0,0.2)', lw = 0.7
): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  ctx.fillStyle = fill; ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke() }
}

// Draw 3-face isometric box: rightC=face at y=iy, leftC=face at x=ix, topC=top
function isoBox(
  ctx: CanvasRenderingContext2D, p: IsoFn,
  ix: number, iy: number, iz: number,
  w: number, d: number, h: number,
  topC: string, leftC: string, rightC: string,
  sk = 'rgba(0,0,0,0.18)'
): void {
  poly(ctx, [p(ix,iy,iz), p(ix+w,iy,iz), p(ix+w,iy,iz+h), p(ix,iy,iz+h)],           rightC, sk)
  poly(ctx, [p(ix,iy,iz), p(ix,iy+d,iz), p(ix,iy+d,iz+h), p(ix,iy,iz+h)],           leftC,  sk)
  poly(ctx, [p(ix,iy,iz+h), p(ix+w,iy,iz+h), p(ix+w,iy+d,iz+h), p(ix,iy+d,iz+h)], topC,   sk)
}

// ─── WORLD MAP ────────────────────────────────────────────────────────────────

// The world is composited from a static base layer (platforms, paths, terrain)
// plus separate floating building sprites, so each building bobs + glows on its own.
const _imgCache: Record<string, HTMLImageElement> = {}
const _imgReady: Record<string, boolean> = {}
function loadImg(src: string): HTMLImageElement {
  let img = _imgCache[src]
  if (!img) {
    img = new Image()
    img.onload = () => { _imgReady[src] = true }
    img.src = src
    _imgCache[src] = img
  }
  return img
}

const WORLD_BASE_SRC = '/assets/map/world-base.png'

interface House {
  id:string; nx:number; ny:number; scale:number; anchor:number
  label:string; acc:string; src:string; bobAmp:number; bobSpeed:number; phase:number
}

// nx/ny = normalized building-base position on a platform pad. scale = sprite width
// as a fraction of canvas width. anchor = fraction of sprite height kept above ny.
const HOUSES: House[] = [
  { id:'tech',     nx:0.172, ny:0.235, scale:0.235, anchor:0.82, label:'TECH HUB',        acc:'#38bdf8', src:'/assets/map/house-tech.png',     bobAmp:9, bobSpeed:0.030, phase:0.0 },
  { id:'creative', nx:0.830, ny:0.235, scale:0.235, anchor:0.82, label:'CREATIVE STUDIO', acc:'#ec4899', src:'/assets/map/house-creative.png', bobAmp:9, bobSpeed:0.033, phase:1.4 },
  { id:'hq',       nx:0.500, ny:0.455, scale:0.350, anchor:0.90, label:'NEXMIND HQ',      acc:'#a855f7', src:'/assets/map/house-hq.png',       bobAmp:7, bobSpeed:0.024, phase:0.7 },
  { id:'ops',      nx:0.168, ny:0.735, scale:0.265, anchor:0.84, label:'OPS CENTER',      acc:'#22c55e', src:'/assets/map/house-ops.png',      bobAmp:9, bobSpeed:0.031, phase:2.2 },
  { id:'finance',  nx:0.834, ny:0.735, scale:0.265, anchor:0.84, label:'FINANCE WING',    acc:'#f59e0b', src:'/assets/map/house-finance.png',  bobAmp:9, bobSpeed:0.028, phase:2.9 },
]

// Axis-aligned hit box for a house (cursor → building), independent of bob.
function houseHitBox(h: House, W: number, H: number): { x0:number; x1:number; y0:number; y1:number } {
  const padX = h.nx * W, padY = h.ny * H
  const sw = h.scale * W
  const hw = sw * 0.34
  return { x0: padX - hw, x1: padX + hw, y0: padY - sw * h.anchor + sw * 0.10, y1: padY + sw * 0.12 }
}

function drawWorldMap(canvas: HTMLCanvasElement, t: number, hovered: string | null): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width, H = canvas.height

  ctx.fillStyle = '#070414'; ctx.fillRect(0, 0, W, H)

  const base = loadImg(WORLD_BASE_SRC)
  if (!_imgReady[WORLD_BASE_SRC]) {
    ctx.save()
    ctx.fillStyle = 'rgba(147,51,234,0.6)'; ctx.font = '22px monospace'; ctx.textAlign = 'center'
    ctx.fillText('LOADING MAP...', W / 2, H / 2)
    ctx.restore()
    return
  }

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(base, 0, 0, W, H)

  // Floating buildings — draw back-to-front so nearer ones overlap correctly
  ctx.textAlign = 'center'
  const sorted = [...HOUSES].sort((a, b) => a.ny - b.ny)
  for (const h of sorted) {
    const padX = h.nx * W, padY = h.ny * H
    const isHover = hovered === h.id
    const wave = Math.sin(t * h.bobSpeed + h.phase)   // -1..1
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + h.phase)
    const bob = wave * h.bobAmp - (isHover ? 12 : 0)
    const lift = (wave + 1) * 0.5                      // 0..1, higher = lifted
    const gr = h.scale * W * 0.46

    // Glowing rune-pad halo beneath the building
    ctx.save()
    const halo = ctx.createRadialGradient(padX, padY, gr * 0.1, padX, padY, gr)
    halo.addColorStop(0, rgba(h.acc, (isHover ? 0.5 : 0.28) + pulse * 0.12))
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.beginPath(); ctx.ellipse(padX, padY, gr, gr * 0.48, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // Contact shadow that shrinks as the building lifts (sells the float)
    ctx.save()
    ctx.globalAlpha = 0.30 - lift * 0.12
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.ellipse(padX, padY + 6, gr * (0.58 - lift * 0.08), gr * 0.19, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // Building sprite
    const img = loadImg(h.src)
    let buildingTop = padY
    if (_imgReady[h.src]) {
      const dw = h.scale * W, dh = dw
      const dx = padX - dw / 2, dy = padY - dh * h.anchor - bob
      buildingTop = dy
      ctx.save()
      if (isHover) { ctx.shadowColor = h.acc; ctx.shadowBlur = 35 }
      ctx.drawImage(img, dx, dy, dw, dh)
      ctx.restore()
    }

    // Floating label above the building (clamped on-screen)
    const labelY = Math.max(22, buildingTop - 4)
    ctx.save()
    if (isHover) {
      ctx.font = 'bold 20px monospace'
      const tw = ctx.measureText(h.label).width
      ctx.fillStyle = 'rgba(3,7,18,0.9)'; ctx.strokeStyle = rgba(h.acc, 0.8); ctx.lineWidth = 2
      ctx.beginPath(); ctx.rect(padX - tw / 2 - 12, labelY - 23, tw + 24, 32); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.shadowColor = h.acc; ctx.shadowBlur = 16
      ctx.fillText(h.label, padX, labelY)
    } else {
      ctx.font = 'bold 14px monospace'
      ctx.fillStyle = rgba(h.acc, 0.45 + pulse * 0.35)
      ctx.shadowColor = h.acc; ctx.shadowBlur = 8 + pulse * 6
      ctx.fillText(h.label, padX, labelY)
    }
    ctx.restore()
  }
}

// ─── OFFICE INTERIOR ──────────────────────────────────────────────────────────

const OGX = 14, OGY = 10, OTS = 27

// Departments whose interior is a pre-rendered AI pixel-art room image. Others
// still use the procedural room below until their art is produced.
const OFFICE_SRC: Record<string,string> = {
  tech: '/assets/map/office-tech-empty.png',
}

interface WalkSpot { nx:number; ny:number; range:number; scale:number }
interface Station {
  agentId:string
  nx:number; ny:number; scale:number   // workstation (work/desk unit) floor anchor
  walk:WalkSpot                         // where the agent paces when idle/away
  flip?:boolean
}

// Object-based office: an empty room background + one workstation per agent placed
// on the open floor. busy → draw the integrated person+desk unit (work-{id});
// idle → draw the empty desk (desk-{id}) plus the agent walking nearby with a
// 2-frame stand/walk leg cycle. Drawn back-to-front by ny.
const OFFICE_STATIONS: Record<string, Station[]> = {
  // tech guild — 5-desk layout: back row (rex, nova) on the mid floor, front row
  // (byte, zeta, forge) spread across the open foreground floor, drawn nearer so
  // they overlap correctly. Front desks sit slightly larger to sell the depth.
  tech: [
    { agentId:'rex',   nx:0.300, ny:0.500, scale:0.250, walk:{ nx:0.300, ny:0.620, range:0.08, scale:0.235 } },
    { agentId:'nova',  nx:0.600, ny:0.500, scale:0.250, walk:{ nx:0.620, ny:0.640, range:0.08, scale:0.235 } },
    { agentId:'byte',  nx:0.230, ny:0.735, scale:0.270, walk:{ nx:0.280, ny:0.815, range:0.060, scale:0.280 } },
    { agentId:'zeta',  nx:0.500, ny:0.775, scale:0.275, walk:{ nx:0.500, ny:0.870, range:0.09, scale:0.285 } },
    { agentId:'forge', nx:0.770, ny:0.735, scale:0.270, walk:{ nx:0.760, ny:0.840, range:0.07, scale:0.280 }, flip:true },
  ],
}

// Decorative floor props — static sprites that fill empty floor. Placed in the
// foreground (high ny) so they sit in front of the agents and read as nearer.
interface OfficeProp { nx:number; ny:number; scale:number; src:string; flip?:boolean }
const PROP_ANCHOR = 0.92   // fraction of a prop sprite kept above its floor point
const OFFICE_PROPS: Record<string, OfficeProp[]> = {
  // tech: [] — crate prop removed per feedback; system kept for future props.
}

function drawOfficeProps(
  ctx: CanvasRenderingContext2D, dept: string,
  cover: { x:number; y:number; w:number; h:number },
): void {
  const props = OFFICE_PROPS[dept]; if (!props) return
  ctx.imageSmoothingEnabled = false
  for (const pr of props) {
    const img = loadImg(pr.src); if (!_imgReady[pr.src]) continue
    const pw = pr.scale * cover.w
    const ph = pw * (img.naturalHeight / img.naturalWidth || 1)
    const px = cover.x + pr.nx * cover.w, py = cover.y + pr.ny * cover.h
    ctx.save()
    if (pr.flip) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0) }
    ctx.drawImage(img, px - pw / 2, py - ph * PROP_ANCHOR, pw, ph)
    ctx.restore()
  }
}

const UNIT_ANCHOR = 0.72   // fraction of a workstation sprite kept above its floor anchor
const CHAR_ANCHOR = 0.92   // fraction of a walking-character sprite above its feet

function drawOfficeStations(
  ctx: CanvasRenderingContext2D, dept: string, t: number,
  cover: { x:number; y:number; w:number; h:number },
  bubbles: Record<string,{msg:string;alpha:number}>,
): void {
  const stations = OFFICE_STATIONS[dept]
  if (!stations) return
  ctx.imageSmoothingEnabled = false
  const ordered = [...stations].sort((a, b) => a.ny - b.ny)

  for (const st of ordered) {
    const ag = AGENTS[st.agentId]; if (!ag) continue
    const working = ag.status === 'busy'
    const ux = cover.x + st.nx * cover.w
    const uy = cover.y + st.ny * cover.h
    const uw = st.scale * cover.w

    // Workstation: integrated person+desk when working, empty desk when away
    const unitSrc = `/assets/map/${working ? 'work' : 'desk'}-${st.agentId}.png`
    const unit = loadImg(unitSrc)
    if (_imgReady[unitSrc]) {
      const uh = uw * (unit.naturalHeight / unit.naturalWidth || 1)
      ctx.save()
      if (st.flip) { ctx.translate(ux, 0); ctx.scale(-1, 1); ctx.translate(-ux, 0) }
      ctx.drawImage(unit, ux - uw / 2, uy - uh * UNIT_ANCHOR, uw, uh)
      ctx.restore()
    }

    // Label anchor follows the workstation, or the walker when the agent is away
    let labelX = ux, labelTop = uy - uw * UNIT_ANCHOR

    if (!working) {
      const phase = st.nx * 11 + st.ny * 7
      const angle = t * 0.0032 + phase                         // slow, lifelike stroll
      const sway = Math.sin(angle)
      const vel = Math.cos(angle)                              // signed walk velocity
      const wx = cover.x + (st.walk.nx + sway * st.walk.range) * cover.w
      const dir = vel >= 0 ? 1 : -1
      const moving = Math.abs(vel) >= 0.18

      // Assemble whatever walk frames exist into a cycle (walk → walk2 → walk3 →
      // walk4). Works with just 2 and gets livelier as more frames land.
      const cycle: string[] = []
      for (const f of ['walk', 'walk2', 'walk3', 'walk4']) {
        const s = `/assets/map/char-${st.agentId}-${f}.png`
        loadImg(s)
        if (_imgReady[s]) cycle.push(f)
      }
      // Turning points ease into the idle pose; mid-stroll steps through the
      // cycle. A small vertical bob (a bounce per step when walking, gentle
      // breathing when paused) keeps the body alive instead of sliding flat.
      const frameName = moving && cycle.length
        ? cycle[Math.floor(t * 0.045 + phase) % cycle.length]
        : 'stand'
      const bob = moving
        ? -Math.abs(Math.sin(t * 0.09 + phase)) * 3
        : Math.sin(t * 0.03 + phase) * 1.6
      const wy = cover.y + st.walk.ny * cover.h + bob

      // fall back to frames that exist (later frames may not be generated yet)
      let wimg: HTMLImageElement | null = null
      for (const f of [frameName, 'walk', 'stand']) {
        const s = `/assets/map/char-${st.agentId}-${f}.png`
        const im = loadImg(s)
        if (_imgReady[s]) { wimg = im; break }
      }
      const ww = st.walk.scale * cover.w
      if (wimg) {
        ctx.save()
        ctx.translate(wx, wy); ctx.scale(dir, 1)
        ctx.drawImage(wimg, -ww / 2, -ww * CHAR_ANCHOR, ww, ww)
        ctx.restore()
      }
      labelX = wx; labelTop = wy - ww * CHAR_ANCHOR
    }

    // Name + status dot + speech bubble above the active subject
    const labelY = Math.max(20, labelTop - 8)
    ctx.save()
    ctx.textAlign = 'center'
    ctx.beginPath(); ctx.arc(labelX, labelY - 13, 4, 0, Math.PI * 2)
    ctx.fillStyle = working ? '#22c55e' : '#64748b'
    if (working) { ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 6 }
    ctx.fill(); ctx.shadowBlur = 0
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = rgba(ag.hair, 0.95); ctx.shadowColor = ag.hair; ctx.shadowBlur = 5
    ctx.fillText(ag.name, labelX, labelY)
    ctx.restore()

    const bub = bubbles[st.agentId]
    if (bub && bub.alpha > 0.02) {
      ctx.save(); ctx.globalAlpha = bub.alpha; ctx.textAlign = 'center'
      ctx.font = '11px monospace'
      const bw = Math.min(bub.msg.length * 7 + 18, 260), by = labelY - 24
      ctx.fillStyle = 'rgba(5,8,18,0.92)'; ctx.strokeStyle = rgba(ag.hair, 0.6); ctx.lineWidth = 1
      ctx.beginPath(); ctx.rect(labelX - bw / 2, by - 16, bw, 21); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#e2e8f0'; ctx.fillText(bub.msg, labelX, by - 1)
      ctx.restore()
    }
  }
}

interface DeskInfo { ix:number; iy:number; agentId:string }

const DEPT_DESKS: Record<string, DeskInfo[]> = {
  hq:       [{ix:5,iy:4,agentId:'aria'}],
  tech:     [{ix:1,iy:1,agentId:'rex'},{ix:4,iy:1,agentId:'nova'},{ix:7,iy:1,agentId:'byte'},{ix:10,iy:1,agentId:'zeta'},{ix:2,iy:5,agentId:'forge'}],
  creative: [{ix:1,iy:1,agentId:'luna'},{ix:4,iy:1,agentId:'pixel'},{ix:7,iy:1,agentId:'reel'},{ix:10,iy:1,agentId:'scout'},{ix:1,iy:5,agentId:'ink'},{ix:4,iy:5,agentId:'grace'},{ix:7,iy:5,agentId:'vibe'}],
  ops:      [{ix:1,iy:1,agentId:'hawk'},{ix:4,iy:1,agentId:'blade'},{ix:7,iy:1,agentId:'sage'},{ix:2,iy:5,agentId:'auto'}],
  finance:  [{ix:1,iy:1,agentId:'coin'},{ix:4,iy:1,agentId:'deal'},{ix:7,iy:1,agentId:'boost'},{ix:10,iy:1,agentId:'memo'},{ix:2,iy:5,agentId:'atlas'},{ix:5,iy:5,agentId:'cipher'}],
}

function drawAgent(ctx: CanvasRenderingContext2D, cx: number, cy: number, PS: number, hairC: string, shirtC: string, t: number): void {
  const skin='#f5c6a0', eye='#0f1720', pants='#1e293b'
  const rows: number[][] = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,2,2,2,2,1,0],
    [0,0,2,2,2,2,0,0],
    [0,0,2,3,2,3,0,0],
    [0,0,0,2,2,0,0,0],
    [0,0,4,4,4,4,0,0],
    [0,4,4,4,4,4,4,0],
    [4,4,4,4,4,4,4,4],
    [4,4,4,4,4,4,4,4],
    [4,4,0,0,0,0,4,4],
    [0,5,5,5,5,5,5,0],
  ]
  const pal=['rgba(0,0,0,0)',hairC,skin,eye,shirtC,pants]
  for (let ry=0; ry<rows.length; ry++)
    for (let rx=0; rx<rows[ry].length; rx++) {
      const ci=rows[ry][rx]; if (ci===0) continue
      ctx.fillStyle=pal[ci]; ctx.fillRect(cx+(rx-4)*PS,cy+ry*PS,PS,PS)
    }
  if (Math.floor(t*0.09)%2===0) { ctx.fillStyle='#00ff88'; ctx.fillRect(cx-PS,cy+10*PS,PS*2,PS) }
}

// Animated neon overlay for the image-based interiors. Positions are normalized
// to the cover-fit room rect; each light flickers on its own slow pulse with an
// occasional neon "stutter" so the dark room feels alive.
interface NeonLight { nx:number; ny:number; r:number; col:string; a:number; sp:number; ph:number; led?:boolean }
const NEON_FX: Record<string, NeonLight[]> = {
  tech: [
    { nx:0.085, ny:0.205, r:0.165, col:'#22d3ee', a:0.34, sp:0.060, ph:0.0 },           // left CPU rune sign
    { nx:0.900, ny:0.175, r:0.150, col:'#22d3ee', a:0.30, sp:0.052, ph:1.7 },           // right CPU sign
    { nx:0.790, ny:0.140, r:0.130, col:'#38bdf8', a:0.26, sp:0.085, ph:3.1 },           // right holo panel
    { nx:0.270, ny:0.215, r:0.230, col:'#8b5cf6', a:0.20, sp:0.030, ph:2.2 },           // window skyline glow
    { nx:0.860, ny:0.420, r:0.190, col:'#3b82f6', a:0.22, sp:0.100, ph:0.8, led:true }, // server racks (blinking)
    { nx:0.610, ny:0.120, r:0.075, col:'#f59e0b', a:0.24, sp:0.045, ph:1.1 },           // hanging lamp (warm)
    { nx:0.048, ny:0.440, r:0.105, col:'#06b6d4', a:0.18, sp:0.090, ph:2.7, led:true }, // left shelf screens
  ],
}

// 0..1 flicker envelope: a slow breathing pulse plus a rare brief dropout.
function neonFlicker(t: number, sp: number, ph: number): number {
  const slow = 0.62 + 0.38 * Math.sin(t * sp + ph)
  const stut = Math.sin(t * sp * 3.7 + ph * 2.3) > 0.93 ? 0.45 : 1
  return slow * stut
}

function drawRoomFX(ctx: CanvasRenderingContext2D, t: number, cover: { x:number; y:number; w:number; h:number }, dept: string): void {
  const lights = NEON_FX[dept]; if (!lights) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'   // additive — glows brighten the room
  for (const L of lights) {
    const cx = cover.x + L.nx * cover.w, cy = cover.y + L.ny * cover.h
    const rad = L.r * cover.w
    const f = neonFlicker(t, L.sp, L.ph)
    const g = ctx.createRadialGradient(cx, cy, rad * 0.06, cx, cy, rad)
    g.addColorStop(0, rgba(L.col, L.a * f))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.82, 0, 0, Math.PI * 2); ctx.fill()
    // blinking LED cluster for screen/server lights
    if (L.led) {
      for (let i = 0; i < 5; i++) {
        const on = Math.sin(t * 0.12 + i * 2.1 + L.ph) > 0
        if (!on) continue
        const lx = cx + (i - 2) * rad * 0.18, ly = cy + Math.sin(i * 1.7) * rad * 0.22
        ctx.fillStyle = rgba(L.col, 0.7 * f); ctx.fillRect(lx, ly, 3, 3)
      }
    }
  }
  ctx.restore()
}

// Foreground dust motes drifting up through the room light.
function drawRoomDust(ctx: CanvasRenderingContext2D, t: number, cover: { x:number; y:number; w:number; h:number }): void {
  const rng = prng(1337)
  ctx.save()
  for (let i = 0; i < 26; i++) {
    const bx = cover.x + rng() * cover.w
    const drift = Math.sin(t * 0.02 + i * 0.7) * cover.w * 0.012
    const span = cover.h * 0.85
    const raw = rng() * span - (t * 0.18 * (rng() + 0.3) + i * 30)
    const py = cover.y + cover.h * 0.1 + ((raw % span) + span) % span
    ctx.globalAlpha = 0.06 + 0.10 * Math.abs(Math.sin(t * 0.05 + i * 1.3))
    ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#22d3ee' : '#a5b4fc'
    ctx.fillRect(bx + drift, py, 1.5, 1.5)
  }
  ctx.restore()
}

function drawOffice(canvas: HTMLCanvasElement, t: number, dept: string, bubbles: Record<string,{msg:string;alpha:number}>): void {
  const ctx=canvas.getContext('2d'); if (!ctx) return
  const W=canvas.width, H=canvas.height

  // Image-based interior (cover-fit the room art). Character sprites are layered
  // on top in a later pass; for now just render the room.
  const imgSrc=OFFICE_SRC[dept]
  if (imgSrc) {
    ctx.fillStyle='#060a12'; ctx.fillRect(0,0,W,H)
    const room=loadImg(imgSrc)
    if (_imgReady[imgSrc]) {
      ctx.imageSmoothingEnabled=true
      const ir=room.width/room.height, cr=W/H
      const dw=ir>cr?H*ir:W, dh=ir>cr?H:W/ir
      const cx0=(W-dw)/2, cy0=(H-dh)/2
      ctx.drawImage(room,cx0,cy0,dw,dh)
      const coverRect={x:cx0,y:cy0,w:dw,h:dh}
      drawRoomFX(ctx,t,coverRect,dept)              // neon flicker behind the agents
      drawOfficeStations(ctx,dept,t,coverRect,bubbles)
      drawOfficeProps(ctx,dept,coverRect)           // foreground floor props
      drawRoomDust(ctx,t,coverRect)                 // dust motes in front
    } else {
      ctx.save(); ctx.fillStyle='rgba(56,189,248,0.6)'; ctx.font='22px monospace'; ctx.textAlign='center'
      ctx.fillText('LOADING OFFICE...',W/2,H/2); ctx.restore()
    }
    return
  }

  // Procedural fallback room — scales with canvas so it stays correct at any size
  const sc=H/600
  const ox=W*0.5, oy=85*sc
  const p=mkISO(ox,oy,OTS*sc)
  const dInfo=DEPTS[dept]??DEPTS['tech']
  const col=dInfo.color, acc=dInfo.accent
  const desks=DEPT_DESKS[dept]??DEPT_DESKS['tech']

  ctx.fillStyle='#060a12'; ctx.fillRect(0,0,W,H)
  const amg=ctx.createRadialGradient(W*0.5,H*0.55,60,W*0.5,H*0.55,W*0.65)
  amg.addColorStop(0,rgba(acc,0.055)); amg.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle=amg; ctx.fillRect(0,0,W,H)

  // Back-left wall (ix=0) with city windows
  for (let yi=OGY-1; yi>=0; yi--) {
    poly(ctx,[p(0,yi,0),p(0,yi+1,0),p(0,yi+1,4),p(0,yi,4)],shade(col,-62),'rgba(0,0,0,0.35)',0.5)
    if (yi>=1 && yi<OGY-1) {
      const wz0=0.6, wz1=3.1
      poly(ctx,[p(0,yi+0.08,wz0),p(0,yi+0.92,wz0),p(0,yi+0.92,wz1),p(0,yi+0.08,wz1)],
        `rgba(10,18,45,${(0.55+0.06*Math.sin(t*0.03+yi)).toFixed(2)})`,rgba(acc,0.22),1.2)
      const rngW=prng(yi*100)
      const [wx1]=p(0,yi+0.08,wz0), [wx2,wy2]=p(0,yi+0.92,wz0), [,wy3]=p(0,yi+0.5,wz1)
      const pW=Math.abs(wx2-wx1), pH=wy2-wy3, bx0=Math.min(wx1,wx2)
      for (let bi=0; bi<6; bi++) {
        const bh=(0.3+rngW()*0.6)*pH, bxs=bx0+(bi/6)*pW, bws=pW/6-1
        ctx.save(); ctx.fillStyle=rgba(shade(col,-20),0.5); ctx.fillRect(bxs,wy2-bh,bws,bh)
        for (let wli=0; wli<3; wli++)
          if (Math.sin(t*0.018+bi*3.7+wli*5.2+yi)>0.2) {
            ctx.fillStyle=rgba(acc,0.35); ctx.fillRect(bxs+wli*(bws/3)+1,wy2-bh*(0.4+wli*0.15),bws/3-1,3)
          }
        ctx.restore()
        const rngR=prng(yi*7+bi*100+1000)
        for (let ri=0; ri<3; ri++) {
          const rx2=bxs+rngR()*bws, ry2=wy3+((rngR()*pH+t*1.6)%pH)
          ctx.save(); ctx.globalAlpha=0.22; ctx.strokeStyle='#93c5fd'; ctx.lineWidth=0.6
          ctx.beginPath(); ctx.moveTo(rx2,ry2); ctx.lineTo(rx2-1.5,ry2+7); ctx.stroke(); ctx.restore()
        }
      }
    }
  }

  // Back-right wall (iy=OGY)
  for (let xi=0; xi<OGX; xi++)
    poly(ctx,[p(xi,OGY,0),p(xi+1,OGY,0),p(xi+1,OGY,4),p(xi,OGY,4)],shade(col,-70),'rgba(0,0,0,0.4)',0.5)

  // Floor -- painter's algorithm
  for (let s=0; s<=OGX+OGY; s++) {
    for (let xi=0; xi<=s; xi++) {
      const yi=s-xi
      if (xi<0||xi>=OGX||yi<0||yi>=OGY) continue
      const even=(xi+yi)%2===0
      const flC=even?'#0b1120':'#0e1625'
      isoBox(ctx,p,xi,yi,0,1,1,0.07,flC,shade(flC,-6),shade(flC,-10),'rgba(255,255,255,0.025)')
      if (!even) {
        const [gx,gy]=p(xi+0.5,yi+0.5,0.07)
        ctx.save(); ctx.globalAlpha=0.04; ctx.fillStyle=acc; ctx.fillRect(gx-1,gy-1,2,2); ctx.restore()
      }
    }
  }

  // Bookshelf
  isoBox(ctx,p,0.05,OGY-2.1,0.07,0.7,1.8,3.6,'#292524','#1c1917','#111110','rgba(0,0,0,0.3)')
  const bookC=['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#06b6d4','#f43f5e','#84cc16']
  for (let bk=0; bk<8; bk++) {
    const bc=bookC[bk%bookC.length]
    isoBox(ctx,p,0.08,OGY-2.05+bk*0.22+0.1,0.57,0.62,0.22,2.9,bc,shade(bc,-30),shade(bc,-50),'none')
  }

  // Corner plant
  isoBox(ctx,p,0.15,0.2,0.07,0.55,0.55,0.55,'#44403c','#2d2926','#1c1917','none')
  isoBox(ctx,p,0.0,0.05,0.6,0.82,0.82,0.55,'#15803d','#0d5c28','#083d19','none')
  isoBox(ctx,p,0.1,0.15,1.1,0.65,0.65,0.5,'#16a34a','#0f7c35','#094f21','none')
  isoBox(ctx,p,0.2,0.25,1.55,0.44,0.44,0.4,'#4ade80','#22c55e','#15b34a','none')

  // Water cooler
  isoBox(ctx,p,0.2,OGY-4.2,0.07,0.75,0.75,1.8,'#94a3b8','#64748b','#475569','rgba(0,0,0,0.2)')
  isoBox(ctx,p,0.28,OGY-3.92,1.84,0.58,0.58,0.72,'#bfdbfe','#93c5fd','#60a5fa','rgba(0,0,0,0.15)')
  poly(ctx,[p(0.2,OGY-4.2,0.8),p(0.38,OGY-4.2,0.8),p(0.38,OGY-4.2,1.0),p(0.2,OGY-4.2,1.0)],'#ef4444','none')
  poly(ctx,[p(0.42,OGY-4.2,0.8),p(0.6,OGY-4.2,0.8),p(0.6,OGY-4.2,1.0),p(0.42,OGY-4.2,1.0)],'#3b82f6','none')

  // Whiteboard
  isoBox(ctx,p,0.05,4.5,2.2,0.08,2.5,1.8,'#f0f4f8','#cbd5e1','#94a3b8','rgba(0,0,0,0.2)')
  const wbLines=['SPRINT 22','v4.2 SHIP','GOALS >>']
  for (let wbl=0; wbl<3; wbl++) {
    const [lwx,lwy]=p(0.05,4.65+wbl*0.7,3.55-wbl*0.45); ctx.save()
    ctx.font=`${5+wbl}px monospace`; ctx.fillStyle=wbl===0?'#1d4ed8':wbl===1?'#15803d':'#9333ea'
    ctx.textAlign='left'; ctx.fillText(wbLines[wbl],lwx+2,lwy); ctx.restore()
  }

  // Neon signs on back wall
  const neonTexts=['[ NEXMIND ]',`[ ${dInfo.name.slice(0,8)} ]`,'[ SHIP IT ]']
  for (let ni=0; ni<3; ni++) {
    const [nx,ny]=p(0,OGY*0.2+ni*2.2,3.5-ni*0.3)
    const nph=0.65+0.28*Math.sin(t*0.055+ni*1.7)
    const nCols=[acc,'#06b6d4','#f59e0b']
    ctx.save(); ctx.font=`bold ${9+ni}px monospace`; ctx.textAlign='left'
    ctx.fillStyle=rgba(nCols[ni],nph); ctx.shadowColor=nCols[ni]; ctx.shadowBlur=14*nph
    ctx.fillText(neonTexts[ni],nx,ny); ctx.restore()
  }

  // Desks + agents -- painter's algorithm
  const sortedDesks=[...desks].sort((a,b)=>(a.ix+a.iy)-(b.ix+b.iy))

  for (const desk of sortedDesks) {
    const {ix,iy,agentId}=desk
    const ag=AGENTS[agentId]; if (!ag) continue
    const PS=2

    // Desk
    isoBox(ctx,p,ix,iy,0.07,2.2,1.6,0.62,'#92400e','#6b2e08','#4a1f05','rgba(0,0,0,0.28)')
    const legPos: [number,number][] = [[0.1,0.1],[1.9,0.1],[0.1,1.3],[1.9,1.3]]
    for (const [lx,ly] of legPos) isoBox(ctx,p,ix+lx,iy+ly,0.07,0.18,0.18,0.55,'#3c3530','#2a2420','#1a1510','none')

    // Monitor stand + screen
    isoBox(ctx,p,ix+0.9,iy+0.2,0.69,0.18,0.18,0.15,'#1e293b','#111827','#0a0f18','none')
    isoBox(ctx,p,ix+0.22,iy+0.08,0.84,1.4,0.1,0.95,'#111827','#0a0f18','#050810','rgba(0,0,0,0.3)')
    {
      const [sx,sy]=p(ix+0.28,iy+0.08,0.88)
      const [sx2]=p(ix+1.62,iy+0.08,0.88)
      const sW=Math.abs(sx2-sx)
      ctx.save()
      const sg=ctx.createRadialGradient(sx+sW*0.5,sy+18,2,sx+sW*0.5,sy+18,30)
      sg.addColorStop(0,rgba(acc,0.18)); sg.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=sg; ctx.fillRect(sx,sy-4,sW+10,60)
      const lCols=[acc,'#4ade80','#60a5fa','#f59e0b','#e879f9','#34d399']
      for (let li=0; li<6; li++) {
        const lw=6+((li*9+Math.floor(t*0.06))%22)
        ctx.fillStyle=rgba(lCols[li%6],0.75); ctx.fillRect(sx+2,sy+li*6+2,lw,2)
      }
      if (Math.floor(t*0.1)%2===0) { ctx.fillStyle=acc; ctx.fillRect(sx+2,sy+2,2,10) }
      ctx.restore()
    }

    // Keyboard
    isoBox(ctx,p,ix+0.28,iy+0.65,0.69,1.0,0.52,0.07,'#1e293b','#111827','#0a0f18','rgba(0,0,0,0.2)')
    for (let ki=0; ki<5; ki++)
      poly(ctx,[p(ix+0.32+ki*0.18,iy+0.68,0.76),p(ix+0.46+ki*0.18,iy+0.68,0.76),p(ix+0.46+ki*0.18,iy+0.68,0.82),p(ix+0.32+ki*0.18,iy+0.68,0.82)],'#334155','none')

    // Coffee mug + steam
    isoBox(ctx,p,ix+1.88,iy+0.55,0.69,0.24,0.24,0.28,ag.shirt,shade(ag.shirt,-15),shade(ag.shirt,-35),'none')
    if (Math.floor(t*0.04)%3!==0) {
      const [mx,my]=p(ix+2.0,iy+0.62,1.0)
      ctx.save(); ctx.globalAlpha=0.3; ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.7
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.bezierCurveTo(mx-2,my-4,mx+2,my-8,mx,my-12); ctx.stroke(); ctx.restore()
    }

    // Chair
    isoBox(ctx,p,ix+0.3,iy+1.1,0.07,1.1,0.85,0.45,shade(col,18),col,shade(col,-22),'rgba(0,0,0,0.2)')
    isoBox(ctx,p,ix+0.3,iy+1.75,0.52,1.1,0.12,0.95,shade(col,12),col,shade(col,-28),'rgba(0,0,0,0.2)')
    isoBox(ctx,p,ix+0.28,iy+1.12,0.52,0.12,0.8,0.22,shade(col,8),shade(col,-12),shade(col,-30),'none')
    isoBox(ctx,p,ix+1.42,iy+1.12,0.52,0.12,0.8,0.22,shade(col,8),shade(col,-12),shade(col,-30),'none')

    // Agent sprite
    const [cx,cy]=p(ix+1.0,iy+0.92,0.52)
    drawAgent(ctx,cx,cy,PS,ag.hair,ag.shirt,t)

    // Status dot
    const [ddx,ddy]=p(ix+1.1,iy+0.45,1.68)
    ctx.beginPath(); ctx.arc(ddx,ddy,3.5,0,Math.PI*2)
    ctx.fillStyle=ag.status==='busy'?'#22c55e':'#475569'; ctx.fill()
    ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=0.5; ctx.stroke()

    // Name label
    const [anx,any]=p(ix+1.1,iy+0.4,1.95); ctx.save()
    ctx.font='bold 7px monospace'; ctx.textAlign='center'
    ctx.fillStyle=rgba(ag.hair,0.92); ctx.shadowColor=ag.hair; ctx.shadowBlur=5
    ctx.fillText(ag.name,anx,any); ctx.restore()

    // Speech bubble
    const bubble=bubbles[agentId]
    if (bubble && bubble.alpha>0.02) {
      const [bbx,bby]=p(ix+1.0,iy+0.2,2.3)
      const bw=Math.min(bubble.msg.length*4.4+12,120)
      ctx.save(); ctx.globalAlpha=bubble.alpha
      ctx.fillStyle='rgba(5,8,18,0.92)'; ctx.strokeStyle=rgba(acc,0.75); ctx.lineWidth=1
      ctx.beginPath(); ctx.rect(bbx-bw*0.5,bby-16,bw,14); ctx.fill(); ctx.stroke()
      ctx.font='5.5px monospace'; ctx.textAlign='center'; ctx.fillStyle='#e2e8f0'
      ctx.fillText(bubble.msg,bbx,bby-5); ctx.restore()
    }
  }

  // Floating particles
  const rngP=prng(888)
  for (let i=0; i<24; i++) {
    const px=((rngP()*W+Math.sin(t*0.03+i*0.4)*12)%W+W)%W
    const rawPy=(rngP()*H*0.7+H*0.15)-(t*0.18*(rngP()+0.1)+i*40)
    const py=((rawPy%(H*0.7))+H*0.7)%(H*0.7)+H*0.15
    ctx.save(); ctx.globalAlpha=0.08+0.08*Math.sin(t*0.06+i*1.1)
    ctx.fillStyle=i%3===0?acc:i%3===1?'#4ade80':'#60a5fa'
    ctx.fillRect(px,py,1,1); ctx.restore()
  }
}

// ─── REACT COMPONENT ──────────────────────────────────────────────────────────

interface Bubble { msg: string; alpha: number }
interface ChatMsg { from: string; col: string; msg: string }

export default function MapGame() {
  const worldRef  = useRef<HTMLCanvasElement>(null)
  const officeRef = useRef<HTMLCanvasElement>(null)
  const tRef      = useRef(0)
  const hoverRef  = useRef<string|null>(null)

  const [scene,       setScene]       = useState<string>('world')
  const [activeTab,   setActiveTab]   = useState<'projects'|'tasks'|'agents'>('tasks')
  const [activeAgent, setActiveAgent] = useState<string>('aria')
  const [activeTask,  setActiveTask]  = useState<string|null>(null)
  const [consoleIdx,  setConsoleIdx]  = useState(0)
  const [chatLog,     setChatLog]     = useState<ChatMsg[]>(CHAT_INIT)
  const [chatInput,   setChatInput]   = useState('')
  const [musicIdx,    setMusicIdx]    = useState(0)
  const [playing,     setPlaying]     = useState(true)
  const [bubbles,     setBubbles]     = useState<Record<string,Bubble>>({})

  useEffect(() => {
    const id=setInterval(()=>setConsoleIdx(i=>(i+1)%CONSOLE_LOG.length),2400)
    return ()=>clearInterval(id)
  },[])

  useEffect(() => {
    if (!playing) return
    const id=setInterval(()=>setMusicIdx(m=>(m+1)%MUSIC.length),14000)
    return ()=>clearInterval(id)
  },[playing])

  useEffect(() => {
    const ids=Object.keys(AGENTS)
    const id=setInterval(()=>{
      const pick=ids[Math.floor(Math.random()*ids.length)]
      const msgs=BUBBLES[pick]; if (!msgs) return
      const msg=msgs[Math.floor(Math.random()*msgs.length)]
      setBubbles(prev=>({...prev,[pick]:{msg,alpha:1}}))
      setTimeout(()=>setBubbles(prev=>{const n={...prev};if(n[pick])n[pick]={...n[pick],alpha:0};return n}),2800)
    },1700)
    return ()=>clearInterval(id)
  },[])

  useEffect(()=>{
    if (scene!=='world') return
    const canvas=worldRef.current; if (!canvas) return
    let raf=0
    const loop=()=>{tRef.current++;drawWorldMap(canvas,tRef.current,hoverRef.current);raf=requestAnimationFrame(loop)}
    raf=requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(raf)
  },[scene])

  useEffect(()=>{
    if (scene!=='world') return
    const canvas=worldRef.current; if (!canvas) return
    const W=canvas.width,H=canvas.height
    // Returns the front-most house whose hit box contains the cursor
    const hit=(e:MouseEvent):string|null=>{
      const rect=canvas.getBoundingClientRect()
      const mx=(e.clientX-rect.left)*(W/rect.width)
      const my=(e.clientY-rect.top)*(H/rect.height)
      // iterate front-to-back (larger ny = nearer) so the nearer building wins
      const order=[...HOUSES].sort((a,b)=>b.ny-a.ny)
      for (const h of order) {
        const b=houseHitBox(h,W,H)
        if (mx>=b.x0&&mx<=b.x1&&my>=b.y0&&my<=b.y1) return h.id
      }
      return null
    }
    const handleClick=(e:MouseEvent)=>{ const id=hit(e); if (id) setScene(id) }
    const handleMove=(e:MouseEvent)=>{
      const id=hit(e)
      hoverRef.current=id
      canvas.style.cursor=id?'pointer':'default'
    }
    const handleLeave=()=>{ hoverRef.current=null; canvas.style.cursor='default' }
    canvas.addEventListener('click',handleClick)
    canvas.addEventListener('mousemove',handleMove)
    canvas.addEventListener('mouseleave',handleLeave)
    return ()=>{
      canvas.removeEventListener('click',handleClick)
      canvas.removeEventListener('mousemove',handleMove)
      canvas.removeEventListener('mouseleave',handleLeave)
    }
  },[scene])

  useEffect(()=>{
    if (scene==='world') return
    const canvas=officeRef.current; if (!canvas) return
    let raf=0
    const loop=()=>{tRef.current++;drawOffice(canvas,tRef.current,scene,bubbles);raf=requestAnimationFrame(loop)}
    raf=requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(raf)
  },[scene,bubbles])

  const dInfo      =DEPTS[scene]??DEPTS['tech']
  const sceneAgents=scene==='world'?Object.entries(AGENTS):Object.entries(AGENTS).filter(([,a])=>a.dept===scene)
  const sceneTasks =scene==='world'?TASKS:TASKS.filter(t=>t.dept===scene)

  const sendChat=useCallback(()=>{
    if (!chatInput.trim()) return
    const msg=chatInput.trim(); setChatInput('')
    setChatLog(prev=>[...prev.slice(-14),{from:'YOU',col:'#94a3b8',msg}])
    const ag=AGENTS[activeAgent]; if (!ag) return
    setTimeout(()=>{
      const replies=BUBBLES[activeAgent]??['Roger that.']
      setChatLog(prev=>[...prev.slice(-14),{from:ag.name,col:ag.hair,msg:replies[Math.floor(Math.random()*replies.length)]}])
    },800)
  },[chatInput,activeAgent])

  const statRows=[
    {label:'UPTIME', val:'99.97%',                                      col:'#22c55e'},
    {label:'AGENTS', val:String(Object.keys(AGENTS).length),            col:'#3b82f6'},
    {label:'ACTIVE', val:String(TASKS.filter(t=>t.status==='active').length), col:'#f59e0b'},
    {label:'COMPUTE',val:'84.2%',  col:'#a855f7'},
    {label:'MEMORY', val:'61.3%',  col:'#06b6d4'},
    {label:'REVENUE',val:'$2.4M',  col:'#f59e0b'},
    {label:'PING',   val:'12ms',   col:'#10b981'},
    {label:'BUILD',  val:'v4.2.1', col:'#22c55e'},
  ]
  const ag=AGENTS[activeAgent]

  return (
    <div style={{width:'100%',height:'100vh',background:'#030712',display:'flex',flexDirection:'column',fontFamily:'"Courier New",monospace',color:'#e2e8f0',overflow:'hidden',userSelect:'none'}}>

      {/* TOP NAV */}
      <div style={{height:38,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 12px',background:'rgba(0,0,0,0.65)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14,fontWeight:'bold',color:'#9333ea',textShadow:'0 0 10px #9333ea'}}>&#9672; NEXMIND OS</span>
          <span style={{fontSize:9,color:'#374151'}}>v4.2.0</span>
          {scene!=='world'&&<button onClick={()=>setScene('world')} style={{marginLeft:6,fontSize:9,color:'#6b7280',fontFamily:'inherit',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',padding:'2px 8px',borderRadius:3,cursor:'pointer'}}>&#8592; WORLD MAP</button>}
          {scene!=='world'&&<span style={{fontSize:9,color:dInfo.accent,textShadow:`0 0 7px ${dInfo.accent}`,marginLeft:4}}>{dInfo.name}</span>}
        </div>
        <div style={{display:'flex',gap:10,fontSize:8,color:'#4b5563'}}>
          {statRows.slice(0,4).map(s=><span key={s.label}>{s.label}:<span style={{color:s.col,marginLeft:2}}>{s.val}</span></span>)}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e'}}/>
          <span style={{fontSize:9,color:'#22c55e'}}>ONLINE</span>
        </div>
      </div>

      {/* MAIN ROW */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* LEFT PANEL */}
        <div style={{width:195,flexShrink:0,display:'flex',flexDirection:'column',background:'rgba(0,0,0,0.45)',borderRight:'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {(['projects','tasks','agents'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,padding:'5px 0',fontSize:8,fontFamily:'inherit',textTransform:'uppercase',background:activeTab===tab?'rgba(147,51,234,0.15)':'none',color:activeTab===tab?'#a855f7':'#4b5563',border:'none',borderBottom:activeTab===tab?'2px solid #9333ea':'2px solid transparent',cursor:'pointer'}}>{tab}</button>
            ))}
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {activeTab==='projects'&&Object.entries(DEPTS).map(([id,di])=>{
              const dt=TASKS.filter(t=>t.dept===id), done=dt.filter(t=>t.status==='done').length
              return <div key={id} onClick={()=>setScene(id)} style={{padding:'7px 10px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)',background:scene===id?rgba(di.color,0.25):'transparent'}}>
                <div style={{fontSize:9,fontWeight:'bold',color:di.accent}}>{di.name}</div>
                <div style={{fontSize:7.5,color:'#4b5563',marginTop:1}}>{done}/{dt.length} tasks done</div>
                <div style={{marginTop:3,height:2,background:'rgba(255,255,255,0.07)',borderRadius:1}}>
                  <div style={{height:'100%',width:`${(done/Math.max(dt.length,1))*100}%`,background:di.accent,borderRadius:1}}/>
                </div>
              </div>
            })}
            {activeTab==='tasks'&&sceneTasks.map(tk=>(
              <div key={tk.id} onClick={()=>setActiveTask(tk.id)} style={{padding:'6px 10px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)',background:activeTask===tk.id?'rgba(255,255,255,0.06)':'transparent'}}>
                <div style={{fontSize:7.5,color:tk.status==='done'?'#22c55e':tk.status==='active'?'#f59e0b':'#4b5563',marginBottom:2}}>{tk.status==='done'?'V':tk.status==='active'?'O':'o'} {tk.id}</div>
                <div style={{fontSize:8.5,color:'#e2e8f0'}}>{tk.title}</div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
                  <span style={{fontSize:7,color:'#4b5563'}}>{tk.agent.toUpperCase()}</span>
                  <span style={{fontSize:7,color:tk.status==='done'?'#22c55e':'#f59e0b'}}>{tk.prog}%</span>
                </div>
                <div style={{marginTop:2,height:2,background:'rgba(255,255,255,0.07)',borderRadius:1}}>
                  <div style={{height:'100%',width:`${tk.prog}%`,background:tk.status==='done'?'#22c55e':'#9333ea',borderRadius:1}}/>
                </div>
              </div>
            ))}
            {activeTab==='agents'&&sceneAgents.map(([id,a])=>(
              <div key={id} onClick={()=>setActiveAgent(id)} style={{padding:'5px 10px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)',background:activeAgent===id?'rgba(255,255,255,0.06)':'transparent',display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:a.status==='busy'?'#22c55e':'#374151',boxShadow:a.status==='busy'?'0 0 5px #22c55e':undefined}}/>
                <div>
                  <div style={{fontSize:8.5,fontWeight:'bold',color:a.hair}}>{a.name}</div>
                  <div style={{fontSize:7,color:'#4b5563'}}>{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div style={{flex:1,position:'relative',overflow:'hidden',background:'#030712'}}>
          {scene==='world'?(
            <>
              <canvas ref={worldRef} width={1536} height={1024} style={{width:'100%',height:'100%',imageRendering:'pixelated',display:'block',cursor:'default',transform:'translateY(5%)'}}/>
              <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',fontSize:8.5,color:'rgba(255,255,255,0.28)',fontFamily:'inherit',background:'rgba(0,0,0,0.4)',padding:'2px 10px',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',pointerEvents:'none'}}>CLICK BUILDING TO ENTER</div>
            </>
          ):(
            <>
              <canvas ref={officeRef} width={1536} height={1024} style={{width:'100%',height:'100%',imageRendering:'pixelated',display:'block'}}/>
              <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',fontSize:9,color:dInfo.accent,fontFamily:'inherit',textShadow:`0 0 10px ${dInfo.accent}`,background:'rgba(0,0,0,0.5)',padding:'2px 12px',borderRadius:10,border:`1px solid ${rgba(dInfo.accent,0.3)}`,pointerEvents:'none'}}>{dInfo.name} &#8212; {dInfo.desc}</div>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:178,flexShrink:0,display:'flex',flexDirection:'column',background:'rgba(0,0,0,0.45)',borderLeft:'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
          <div style={{padding:'7px 10px',fontSize:8,color:'#4b5563',textTransform:'uppercase',letterSpacing:1,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>COMPANY STATUS</div>
          <div style={{flex:1,overflow:'hidden'}}>
            {statRows.map(s=>(
              <div key={s.label} style={{padding:'5px 10px',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:7.5,color:'#4b5563'}}>{s.label}</span>
                  <span style={{fontSize:9,color:s.col,fontWeight:'bold'}}>{s.val}</span>
                </div>
                {(s.label==='COMPUTE'||s.label==='MEMORY')&&(
                  <div style={{marginTop:2,height:2,background:'rgba(255,255,255,0.07)',borderRadius:1}}>
                    <div style={{height:'100%',width:s.val,background:s.col,borderRadius:1}}/>
                  </div>
                )}
              </div>
            ))}
          </div>
          {ag&&(
            <div style={{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              <div style={{fontSize:7.5,color:'#4b5563',marginBottom:4}}>SELECTED AGENT</div>
              <div style={{fontSize:11,fontWeight:'bold',color:ag.hair,textShadow:`0 0 7px ${ag.hair}`}}>{ag.name}</div>
              <div style={{fontSize:7.5,color:'#4b5563'}}>{ag.role}</div>
              <div style={{marginTop:3,fontSize:8,color:ag.status==='busy'?'#22c55e':'#475569'}}>&#9679; {ag.status.toUpperCase()}</div>
              {bubbles[activeAgent]?.alpha>0&&(
                <div style={{marginTop:5,fontSize:7,color:'#94a3b8',background:'rgba(255,255,255,0.04)',padding:'3px 6px',borderRadius:3,border:'1px solid rgba(255,255,255,0.07)',lineHeight:'1.4'}}>{bubbles[activeAgent].msg}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div style={{height:128,flexShrink:0,display:'flex',background:'rgba(0,0,0,0.65)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        {/* Log */}
        <div style={{flex:1,padding:'6px 10px',borderRight:'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
          <div style={{fontSize:7.5,color:'#4b5563',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>SYSTEM LOG</div>
          {CONSOLE_LOG.slice(Math.max(0,consoleIdx-4),consoleIdx+1).map((msg,i,arr)=>(
            <div key={i} style={{fontSize:8,fontFamily:'inherit',color:'#22c55e',opacity:0.38+(i/arr.length)*0.62,marginBottom:1.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{msg}</div>
          ))}
        </div>
        {/* Chat */}
        <div style={{width:282,display:'flex',flexDirection:'column',padding:'6px 8px',borderRight:'1px solid rgba(255,255,255,0.05)'}}>
          <div style={{fontSize:7.5,color:'#4b5563',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>TEAM CHAT</div>
          <div style={{flex:1,overflowY:'auto',marginBottom:4}}>
            {chatLog.slice(-5).map((m,i)=>(
              <div key={i} style={{fontSize:8,marginBottom:2,display:'flex',gap:4,lineHeight:'1.3'}}>
                <span style={{color:m.col,fontWeight:'bold',flexShrink:0}}>{m.from}:</span>
                <span style={{color:'#94a3b8'}}>{m.msg}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:4}}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChat()}} placeholder="Message agents..." style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:3,padding:'3px 6px',fontSize:8,color:'#e2e8f0',fontFamily:'inherit',outline:'none'}}/>
            <button onClick={sendChat} style={{padding:'3px 8px',background:'rgba(147,51,234,0.25)',border:'1px solid rgba(147,51,234,0.45)',borderRadius:3,color:'#a855f7',fontSize:8,cursor:'pointer',fontFamily:'inherit'}}>SEND</button>
          </div>
        </div>
        {/* Music */}
        <div style={{width:182,padding:'6px 10px',flexShrink:0}}>
          <div style={{fontSize:7.5,color:'#4b5563',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>&#9836; NOW PLAYING</div>
          <div style={{fontSize:9,fontWeight:'bold',color:MUSIC[musicIdx].col,textShadow:`0 0 8px ${MUSIC[musicIdx].col}`,marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{MUSIC[musicIdx].title}</div>
          <div style={{display:'flex',gap:4,marginBottom:6}}>
            <button onClick={()=>setMusicIdx(m=>(m-1+MUSIC.length)%MUSIC.length)} style={{flex:1,padding:'3px 0',fontFamily:'inherit',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:2,color:'#6b7280',fontSize:10,cursor:'pointer'}}>&#9664;</button>
            <button onClick={()=>setPlaying(v=>!v)} style={{flex:1,padding:'3px 0',fontFamily:'inherit',background:playing?'rgba(147,51,234,0.22)':'rgba(255,255,255,0.04)',border:playing?'1px solid rgba(147,51,234,0.45)':'1px solid rgba(255,255,255,0.09)',borderRadius:2,color:playing?'#a855f7':'#6b7280',fontSize:10,cursor:'pointer'}}>{playing?'&#9632;':'&#9654;'}</button>
            <button onClick={()=>setMusicIdx(m=>(m+1)%MUSIC.length)} style={{flex:1,padding:'3px 0',fontFamily:'inherit',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:2,color:'#6b7280',fontSize:10,cursor:'pointer'}}>&#9654;</button>
          </div>
          {MUSIC.map((tr,i)=>(
            <div key={i} onClick={()=>setMusicIdx(i)} style={{fontSize:7,cursor:'pointer',marginBottom:2,color:i===musicIdx?tr.col:'#2d3748',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i===musicIdx?'> ':' '}{tr.title}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
