'use client'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { agents, depts, type Agent } from '@/data/agents'

type CharacterDesign = {
  archetype: string; artifact: string; motif: string
  silhouette: 'hood' | 'coat' | 'armor' | 'robe' | 'scout' | 'mask'
  hair: 'spike' | 'wave' | 'short' | 'crest' | 'veil' | 'none'
  weapon: 'staff' | 'blade' | 'tablet' | 'orb' | 'quill' | 'signal' | 'shield' | 'coin'
  accent: string
}

const characterDesigns: Record<string, CharacterDesign> = {
  aria:  { archetype:'Oracle Secretary',    artifact:'Prism command staff',    motif:'violet routing sigils',       silhouette:'robe',  hair:'veil',  weapon:'staff',  accent:'var(--dept-secretary)' },
  rex:   { archetype:'Runesmith Architect', artifact:'blueprint glaive',       motif:'circuit runes',               silhouette:'coat',  hair:'spike', weapon:'tablet', accent:'var(--dept-dev)' },
  nova:  { archetype:'Spark Weaver',        artifact:'interface gauntlets',    motif:'cyan UI threads',             silhouette:'hood',  hair:'crest', weapon:'orb',    accent:'var(--dept-dev)' },
  byte:  { archetype:'Iron Alchemist',      artifact:'server hammer',          motif:'green API seals',             silhouette:'armor', hair:'short', weapon:'staff',  accent:'var(--green)' },
  zeta:  { archetype:'Chaos Tester',        artifact:'fracture lens',          motif:'test-grid wards',             silhouette:'mask',  hair:'wave',  weapon:'shield', accent:'var(--dept-dev)' },
  forge: { archetype:'Iron Guardian',       artifact:'deployment anvil',       motif:'docker steel halos',          silhouette:'armor', hair:'none',  weapon:'shield', accent:'var(--dept-dev)' },
  luna:  { archetype:'Dream Architect',     artifact:'moon compass',           motif:'pink wireframe petals',       silhouette:'robe',  hair:'wave',  weapon:'orb',    accent:'var(--dept-design)' },
  pixel: { archetype:'Illusion Painter',    artifact:'chromatic brush',        motif:'neon ink ribbons',            silhouette:'hood',  hair:'crest', weapon:'quill',  accent:'var(--dept-design)' },
  reel:  { archetype:'Time Weaver',         artifact:'motion reel chakram',    motif:'frame-skip glyphs',           silhouette:'coat',  hair:'short', weapon:'signal', accent:'var(--dept-design)' },
  scout: { archetype:'World Observer',      artifact:'skyglass scope',         motif:'map-line constellations',     silhouette:'scout', hair:'spike', weapon:'signal', accent:'var(--dept-content)' },
  ink:   { archetype:'Lore Scribe',         artifact:'living quill',           motif:'gold manuscript sparks',      silhouette:'robe',  hair:'veil',  weapon:'quill',  accent:'var(--dept-content)' },
  grace: { archetype:'Truth Seeker',        artifact:'editor mirror',          motif:'white correction flames',     silhouette:'coat',  hair:'wave',  weapon:'tablet', accent:'var(--dept-content)' },
  vibe:  { archetype:'Voice Herald',        artifact:'social relay deck',      motif:'broadcast butterflies',       silhouette:'scout', hair:'crest', weapon:'signal', accent:'var(--dept-content)' },
  hawk:  { archetype:'Sky Prophet',         artifact:'gold-market spear',      motif:'emerald price feathers',      silhouette:'scout', hair:'spike', weapon:'staff',  accent:'var(--dept-trading)' },
  blade: { archetype:'Steel Executor',      artifact:'candlewick katana',      motif:'red entry marks',             silhouette:'armor', hair:'crest', weapon:'blade',  accent:'var(--red)' },
  sage:  { archetype:'Balance Keeper',      artifact:'risk scale shield',      motif:'purple balance circles',      silhouette:'robe',  hair:'short', weapon:'shield', accent:'var(--dept-trading)' },
  auto:  { archetype:'Eternal Machine',     artifact:'autonomous core',        motif:'teal cron rings',             silhouette:'mask',  hair:'none',  weapon:'orb',    accent:'var(--cyan)' },
  atlas: { archetype:'Map Mind',            artifact:'metric atlas',           motif:'blue dashboard grids',        silhouette:'coat',  hair:'short', weapon:'tablet', accent:'var(--dept-intelligence)' },
  memo:  { archetype:'Memory Keeper',       artifact:'archive lantern',        motif:'amethyst memory knots',       silhouette:'robe',  hair:'veil',  weapon:'orb',    accent:'var(--dept-intelligence)' },
  cipher:{ archetype:'Cipher Warden',       artifact:'black keychain',         motif:'green encrypted locks',       silhouette:'mask',  hair:'spike', weapon:'blade',  accent:'var(--green)' },
  coin:  { archetype:'Finance Lead',        artifact:'treasury abacus',        motif:'mint ledger coins',           silhouette:'coat',  hair:'wave',  weapon:'coin',   accent:'var(--dept-finance)' },
  deal:  { archetype:'Contract Duelist',    artifact:'handshake seal',         motif:'blue pact ribbons',           silhouette:'scout', hair:'short', weapon:'tablet', accent:'var(--dept-finance)' },
  boost: { archetype:'Growth Caller',       artifact:'ad flare launcher',      motif:'lime ROAS sparks',            silhouette:'hood',  hair:'crest', weapon:'signal', accent:'var(--dept-finance)' },
  lex:   { archetype:'Law Binder',          artifact:'compliance codex',       motif:'red oath chains',             silhouette:'robe',  hair:'short', weapon:'shield', accent:'var(--dept-systems)' },
  nexus: { archetype:'R&D Seer',            artifact:'prototype astrolabe',    motif:'violet innovation arcs',      silhouette:'coat',  hair:'spike', weapon:'orb',    accent:'var(--dept-systems)' },
  echo:  { archetype:'Voice Interface',     artifact:'sonic bell array',       motif:'cyan waveform rings',         silhouette:'hood',  hair:'wave',  weapon:'signal', accent:'var(--dept-systems)' },
}

const fallbackDesign: CharacterDesign = {
  archetype:'Arcane Operator', artifact:'guild focus', motif:'adaptive command glyphs',
  silhouette:'coat', hair:'short', weapon:'orb', accent:'var(--purple)',
}

const characterImages: Record<string, string> = {
  aria:'/agents/aria.png', rex:'/agents/rex.png', nova:'/agents/nova.png',
  byte:'/agents/byte.png', zeta:'/agents/zeta.png', forge:'/agents/forge.png',
  luna:'/agents/luna.png', pixel:'/agents/pixel.png', reel:'/agents/reel.png',
  scout:'/agents/scout.png', ink:'/agents/ink.png', grace:'/agents/grace.png',
  vibe:'/agents/vibe.png', hawk:'/agents/hawk.png', blade:'/agents/blade.png',
  sage:'/agents/sage.png', auto:'/agents/auto.png',
  atlas:'/agents/atlas.png', memo:'/agents/memo.png', cipher:'/agents/cipher.png',
  coin:'/agents/coin.png',
  deal:'/agents/deal.png', boost:'/agents/boost.png', lex:'/agents/lex.png',
  nexus:'/agents/nexus.png', echo:'/agents/echo.png',
}

function CharacterPortrait({ agent, design }: { agent: Agent; design: CharacterDesign }) {
  const imageSrc = characterImages[agent.id]
  const isHood = design.silhouette === 'hood' || design.silhouette === 'robe'
  const isArmor = design.silhouette === 'armor' || design.silhouette === 'mask'
  const eyeColor = design.weapon === 'blade' ? 'var(--red)' : design.weapon === 'coin' ? 'var(--gold)' : design.accent

  if (imageSrc) {
    return (
      <div style={{ height:318, borderRadius:10, position:'relative', overflow:'hidden', background:'linear-gradient(180deg,rgba(255,255,255,.96),rgba(232,235,245,.92))', border:`1px solid color-mix(in srgb,${design.accent} 45%,transparent)`, boxShadow:`0 0 28px color-mix(in srgb,${design.accent} 18%,transparent),inset 0 -70px 70px rgba(7,7,26,.18)` }}>
        <Image src={imageSrc} alt={`${agent.name} character portrait`} fill sizes="(max-width:768px) 100vw,(max-width:1280px) 33vw,25vw" priority={agent.id==='aria'} style={{ objectFit:'cover', objectPosition:'center top' }} />
        <div aria-hidden style={{ position:'absolute', inset:0, background:`linear-gradient(180deg,transparent 56%,rgba(7,7,26,.78) 100%),radial-gradient(circle at 18% 12%,color-mix(in srgb,${design.accent} 16%,transparent),transparent 34%)`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:12, bottom:12, right:12, display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:10 }}>
          <div>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:'.24em', color:'rgba(255,255,255,.68)', textTransform:'uppercase' }}>{agent.dept}</p>
            <p style={{ marginTop:2, fontFamily:"'Space Mono',monospace", fontSize:26, fontWeight:700, lineHeight:1, color:'#fff', textShadow:'0 2px 16px rgba(0,0,0,.45)' }}>{agent.name}</p>
          </div>
          <span style={{ borderRadius:99, padding:'5px 8px', fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, color:design.accent, background:'rgba(7,7,26,.72)', border:`1px solid color-mix(in srgb,${design.accent} 44%,transparent)`, backdropFilter:'blur(10px)' }}>{agent.tier}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height:220, borderRadius:8, position:'relative', overflow:'hidden', background:`linear-gradient(155deg,color-mix(in srgb,${design.accent} 18%,transparent),rgba(4,5,14,.92) 48%,rgba(0,0,0,.96))`, border:`1px solid color-mix(in srgb,${design.accent} 42%,transparent)`, boxShadow:`inset 0 0 30px color-mix(in srgb,${design.accent} 10%,transparent)` }}>
      <div aria-hidden style={{ position:'absolute', inset:12, borderRadius:'50%', border:`1px dashed color-mix(in srgb,${design.accent} 36%,transparent)`, opacity:.62 }} />
      <div aria-hidden style={{ position:'absolute', left:'50%', top:18, width:136, height:136, transform:'translateX(-50%)', borderRadius:'50%', background:`radial-gradient(circle,color-mix(in srgb,${design.accent} 24%,transparent),transparent 68%)`, filter:'blur(8px)' }} />
      <svg viewBox="0 0 220 260" role="img" aria-label={`${agent.name} character`} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        <defs>
          <linearGradient id={`cloak-${agent.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={design.accent} stopOpacity=".62" />
            <stop offset="42%" stopColor="#161827" stopOpacity=".96" />
            <stop offset="100%" stopColor="#05060d" />
          </linearGradient>
          <linearGradient id={`trim-${agent.id}`} x1="0" x2="1">
            <stop offset="0%" stopColor={agent.color} />
            <stop offset="100%" stopColor={design.accent} />
          </linearGradient>
        </defs>
        <path d="M78 114 L48 244 L174 244 L143 114 Q110 132 78 114Z" fill={`url(#cloak-${agent.id})`} stroke={design.accent} strokeOpacity=".35" strokeWidth="2" />
        {isHood  && <path d="M63 111 Q109 34 158 111 L146 144 Q111 122 75 144Z" fill="#10131f" stroke={design.accent} strokeOpacity=".45" strokeWidth="2" />}
        {isArmor && <path d="M70 124 L96 106 L124 106 L151 124 L139 171 L111 181 L82 171Z" fill="#1b2130" stroke={design.accent} strokeOpacity=".55" strokeWidth="2" />}
        <path d="M86 74 Q109 51 134 74 L128 113 Q110 126 91 113Z" fill="#8b91a8" opacity=".92" />
        <path d="M86 74 Q108 43 136 73 Q119 65 101 74 Q92 79 86 74Z" fill="#202638" />
        {design.hair==='spike' && <path d="M82 73 L96 42 L105 67 L121 35 L124 68 L147 48 L135 80Z" fill="#d9e6ff" opacity=".86" />}
        {design.hair==='crest' && <path d="M91 67 Q114 22 139 66 Q123 54 109 69Z" fill={design.accent} opacity=".72" />}
        {design.hair==='wave'  && <path d="M78 78 Q97 34 119 61 Q133 38 148 82 Q120 69 93 83Z" fill="#d7c7a4" opacity=".78" />}
        {design.hair==='veil'  && <path d="M75 86 Q109 36 150 86 L139 130 Q111 112 85 130Z" fill={design.accent} opacity=".28" />}
        <path d="M98 94 L107 91 M120 91 L129 94" stroke={eyeColor} strokeWidth="4" strokeLinecap="round" />
        <path d="M105 112 Q112 116 121 112" stroke="#05060d" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M82 151 L58 196" stroke={`url(#trim-${agent.id})`} strokeWidth="6" strokeLinecap="round" opacity=".78" />
        <path d="M139 151 L163 196" stroke={`url(#trim-${agent.id})`} strokeWidth="6" strokeLinecap="round" opacity=".78" />
        <path d="M91 148 L129 148 L136 202 L84 202Z" fill="#0d101a" stroke={design.accent} strokeOpacity=".32" />
        <path d="M92 159 L130 159" stroke={design.accent} strokeOpacity=".42" strokeWidth="2" />
        <path d="M100 176 L122 176" stroke={agent.color} strokeOpacity=".54" strokeWidth="2" />
        {design.weapon==='staff'  && <path d="M168 53 L160 214 M157 64 L174 61 L168 47Z" stroke={design.accent} strokeWidth="5" strokeLinecap="round" fill="none" />}
        {design.weapon==='blade'  && <path d="M159 73 L177 206 M153 73 L165 52 L172 73Z" stroke="var(--red)" strokeWidth="5" strokeLinecap="round" fill="none" />}
        {design.weapon==='tablet' && <rect x="148" y="127" width="42" height="52" rx="5" fill="#111827" stroke={design.accent} strokeOpacity=".65" />}
        {design.weapon==='orb'    && <circle cx="166" cy="123" r="18" fill={design.accent} opacity=".32" stroke={design.accent} strokeWidth="2" />}
        {design.weapon==='quill'  && <path d="M160 74 Q185 98 160 170 M157 94 Q176 100 165 116" stroke={design.accent} strokeWidth="4" fill="none" strokeLinecap="round" />}
        {design.weapon==='signal' && <path d="M160 118 Q180 103 190 82 M165 128 Q188 123 203 105 M151 136 L187 166" stroke={design.accent} strokeWidth="4" fill="none" strokeLinecap="round" />}
        {design.weapon==='shield' && <path d="M160 116 L191 128 L184 171 L160 188 L137 171 L130 128Z" fill="#111827" stroke={design.accent} strokeWidth="3" opacity=".9" />}
        {design.weapon==='coin'   && <circle cx="166" cy="124" r="20" fill="var(--gold)" opacity=".36" stroke="var(--gold)" strokeWidth="3" />}
        <path d="M35 226 Q111 246 187 226" stroke={design.accent} strokeOpacity=".52" strokeWidth="3" fill="none" />
      </svg>
      <div style={{ position:'absolute', left:14, bottom:12, fontFamily:"'Space Mono',monospace", fontSize:46, fontWeight:700, color:'rgba(255,255,255,.04)' }}>{agent.name.slice(0,2)}</div>
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const design = characterDesigns[agent.id] ?? fallbackDesign
  const statusLabel = { online:'Online', busy:'Busy', idle:'Idle', offline:'Offline' }[agent.status]
  return (
    <article style={{ borderRadius:10, overflow:'hidden', position:'relative', background:'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.032))', border:`1px solid color-mix(in srgb,${design.accent} 28%,transparent)`, boxShadow:'0 14px 34px rgba(0,0,0,.34)' }}>
      <div aria-hidden style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,color-mix(in srgb,${design.accent} 10%,transparent),transparent 38%)`, opacity:.7, pointerEvents:'none' }} />
      <div style={{ position:'relative', padding:12 }}>
        <CharacterPortrait agent={agent} design={design} />
      </div>
      <div style={{ position:'relative', padding:'0 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, lineHeight:1, color:design.accent }}>{agent.name}</p>
            <p style={{ marginTop:4, fontSize:12, fontWeight:600, color:'var(--text)' }}>{design.archetype}</p>
            <p style={{ marginTop:2, fontSize:10, letterSpacing:'.22em', textTransform:'uppercase', color:'var(--dim)' }}>{agent.title}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:agent.status==='online'?'var(--green)':agent.status==='busy'?'var(--gold)':'var(--dim)', display:'block', boxShadow:agent.status==='online'?'0 0 8px var(--green)':'none' }} />
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--muted)' }}>{statusLabel}</span>
          </div>
        </div>
        <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:6 }}>
          <span style={{ borderRadius:99, padding:'3px 10px', fontFamily:"'Space Mono',monospace", fontSize:10, background:`color-mix(in srgb,${agent.deptColor} 16%,transparent)`, color:agent.deptColor, border:`1px solid color-mix(in srgb,${agent.deptColor} 34%,transparent)` }}>{agent.dept}</span>
        </div>
        <div style={{ marginTop:14, display:'grid', gap:6, fontSize:12, color:'var(--muted)' }}>
          <p><span style={{ fontFamily:"'Space Mono',monospace", color:design.accent }}>Artifact </span>{design.artifact}</p>
          <p><span style={{ fontFamily:"'Space Mono',monospace", color:design.accent }}>Motif </span>{design.motif}</p>
        </div>
        <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:5 }}>
          {agent.skills.slice(0,4).map(skill => (
            <span key={skill} style={{ borderRadius:6, padding:'3px 8px', fontFamily:"'Space Mono',monospace", fontSize:10, background:'rgba(255,255,255,.055)', color:'var(--muted)', border:'1px solid rgba(255,255,255,.07)' }}>{skill}</span>
          ))}
        </div>
        <div style={{ marginTop:14, display:'flex', gap:8, borderTop:'1px solid var(--cmd-divider)', paddingTop:12 }}>
          <Link href="/guild-room" style={{ flex:1, borderRadius:8, padding:'8px 0', textAlign:'center', fontSize:12, fontWeight:700, textDecoration:'none', background:`color-mix(in srgb,${design.accent} 18%,transparent)`, color:design.accent, border:`1px solid color-mix(in srgb,${design.accent} 36%,transparent)` }}>DM</Link>
          <Link href="/guild-room" style={{ flex:1, borderRadius:8, padding:'8px 0', textAlign:'center', fontSize:12, fontWeight:700, textDecoration:'none', background:'rgba(255,255,255,.04)', color:'var(--muted)', border:'1px solid rgba(255,255,255,.08)' }}>Quest</Link>
        </div>
      </div>
    </article>
  )
}

export default function Roster() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const deptList = ['All', ...depts.map(d => d.name)]
  const filtered = useMemo(() => agents.filter(agent => {
    const haystack = `${agent.name} ${agent.title} ${agent.dept} ${agent.skills.join(' ')} ${characterDesigns[agent.id]?.archetype ?? ''}`.toLowerCase()
    return (filter === 'All' || agent.dept === filter) && (!search || haystack.includes(search.toLowerCase()))
  }), [filter, search])

  return (
    <div style={{ minHeight:'100vh', padding:'28px clamp(18px,3vw,40px) 44px', background:'radial-gradient(circle at 12% 0%,rgba(34,212,238,.10),transparent 34%),radial-gradient(circle at 86% 8%,rgba(224,64,251,.08),transparent 30%),var(--nebula-bg)' }}>
      <header style={{ marginBottom:24 }}>
        <p style={{ fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:'.34em', color:'var(--magic-cyan)', marginBottom:8 }}>THE GUILD / CHARACTER ROSTER</p>
        <h1 style={{ fontSize:'clamp(26px,3vw,36px)', fontWeight:800, color:'var(--cmd-text)', margin:0 }}>Agent Roster</h1>
        <p style={{ marginTop:8, fontSize:13, color:'var(--cmd-text-soft)' }}>{agents.length} agents &middot; {agents.filter(a=>a.status==='online').length} online &middot; {depts.length} guilds</p>
      </header>
      <div style={{ marginBottom:20, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:10, background:'var(--magic-glass)', border:'1px solid var(--magic-glass-border)', backdropFilter:'blur(var(--magic-glass-blur))', flex:1, minWidth:200 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--cmd-label)' }}>SEARCH</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="agent, role, skill..." style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:13, color:'var(--cmd-text)' }} />
        </div>
        <Link href="/guild-room" style={{ padding:'10px 20px', borderRadius:10, fontSize:12, fontWeight:700, textDecoration:'none', background:'var(--magic-grad-cta)', color:'#07071a', boxShadow:'var(--magic-glow-aurora)', whiteSpace:'nowrap' }}>Open War Council</Link>
      </div>
      <nav style={{ marginBottom:20, display:'flex', flexWrap:'wrap', gap:8 }}>
        {deptList.map(deptName => {
          const dept = depts.find(d=>d.name===deptName)
          const active = filter === deptName
          const color = dept?.color ?? 'var(--magic-purple)'
          return (
            <button key={deptName} onClick={()=>setFilter(deptName)} style={{ borderRadius:8, padding:'6px 14px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:"'Space Mono',monospace", background:active?`color-mix(in srgb,${color} 18%,transparent)`:'var(--magic-glass)', border:active?`1px solid color-mix(in srgb,${color} 46%,transparent)`:'1px solid var(--magic-glass-border)', color:active?color:'var(--cmd-text-soft)', backdropFilter:'blur(var(--magic-glass-blur))' }}>
              {deptName}
            </button>
          )
        })}
      </nav>
      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
        {filtered.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px', color:'var(--cmd-label)' }}>
            <p style={{ fontSize:13, fontFamily:"'Space Mono',monospace" }}>No agents found in this department</p>
          </div>
        )}
      </section>
    </div>
  )
}
