'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { agents } from '@/data/agents'

const nav = [
  { icon:'⚡', label:'Command Bridge', sub:'Dashboard',   href:'/'            },
  { icon:'🗺️', label:'The Realm',      sub:'Guild Map',   href:'/map'         },
  { icon:'⚔️', label:'War Council',    sub:'Chat Room',   href:'/guild-room'  },
  { icon:'👥', label:'The Guild',      sub:'Roster',      href:'/roster'      },
  { icon:'📋', label:'Mission Board',  sub:'Quest Board', href:'/quests'      },
  { icon:'⏰', label:'Chrono Tower',   sub:'Scheduler',   href:'/scheduler'   },
  { icon:'📜', label:'Scroll Vault',   sub:'Memory',      href:'/scroll-vault'},
  { icon:'🔭', label:'Watchtower',     sub:'Observatory', href:'/observatory' },
  { icon:'📊', label:'Intel Deck',     sub:'Analytics',   href:'/analytics'   },
  { icon:'📡', label:'Chronicle',      sub:'Mission Log', href:'/mission-log' },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const onlineCount = agents.filter(a => a.status === 'online').length
  const busyCount   = agents.filter(a => a.status === 'busy').length
  const totalCount  = agents.length

  const [ccRunning, setCCRunning] = useState(false)
  useEffect(() => {
    const handler = (e: Event) => setCCRunning((e as CustomEvent).detail.running)
    window.addEventListener('nexmind-cc-status', handler)
    return () => window.removeEventListener('nexmind-cc-status', handler)
  }, [])

  return (
    <aside
      style={{
        width: 230,
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #12121e 0%, #0e0e1a 100%)',
        borderRight: '1px solid rgba(108,99,255,.18)',
        boxShadow: '4px 0 24px rgba(0,0,0,.4)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'linear-gradient(135deg,#6c63ff,#22d3ee)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, boxShadow:'0 0 16px rgba(108,99,255,.5)',
            flexShrink:0,
          }}>⚡</div>
          <div>
            <p style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, fontSize:13, letterSpacing:2, lineHeight:1, color:'#e0e0f0' }}>NEXMIND</p>
            <p style={{ fontFamily:"'Space Mono',monospace", fontSize:8.5, color:'rgba(108,99,255,.8)', letterSpacing:2, marginTop:2 }}>AI CO. v0.1</p>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          marginTop:10, padding:'6px 10px', borderRadius:8,
          background:'rgba(0,255,136,.07)', border:'1px solid rgba(0,255,136,.18)',
          display:'flex', alignItems:'center', gap:6,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', display:'inline-block', boxShadow:'0 0 6px #00ff88' }} />
          <span style={{ fontSize:10, color:'#00ff88', fontFamily:"'Space Mono',monospace" }}>
            {onlineCount} online · {busyCount} busy · {totalCount} total
          </span>
        </div>

        {/* CC Running badge */}
        {ccRunning && (
          <button
            onClick={() => router.push('/guild-room')}
            style={{
              marginTop:8, width:'100%', padding:'7px 10px', borderRadius:8,
              cursor:'pointer', textAlign:'left',
              background:'linear-gradient(135deg,rgba(0,212,255,.15),rgba(0,255,136,.1))',
              border:'1px solid rgba(0,212,255,.35)',
              display:'flex', alignItems:'center', gap:8,
            }}
          >
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4ff', flexShrink:0, boxShadow:'0 0 8px #00d4ff' }} />
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#00d4ff', fontFamily:"'Space Mono',monospace", lineHeight:1.2 }}>CC กำลังทำงาน</p>
              <p style={{ fontSize:8.5, color:'rgba(0,212,255,.6)', fontFamily:"'Space Mono',monospace", marginTop:2 }}>แตะเพื่อดู progress</p>
            </div>
            <span style={{ fontSize:10, color:'rgba(0,212,255,.5)' }}>→</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        {nav.map(item => {
          const active = path === item.href || (item.href !== '/' && path.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'8px 10px', borderRadius:10, textDecoration:'none',
                background: active ? 'linear-gradient(135deg,rgba(108,99,255,.22),rgba(139,91,246,.12))' : 'transparent',
                border: active ? '1px solid rgba(108,99,255,.4)' : '1px solid transparent',
                boxShadow: active ? '0 0 16px rgba(108,99,255,.15)' : 'none',
                transition: 'all .18s ease',
                position:'relative',
              }}
            >
              {active && (
                <div style={{
                  position:'absolute', left:0, top:6, bottom:6,
                  width:3, borderRadius:2,
                  background:'linear-gradient(180deg,#6c63ff,#22d3ee)',
                  boxShadow:'0 0 8px rgba(108,99,255,.8)',
                }} />
              )}

              <span style={{ fontSize:16, lineHeight:1, marginLeft: active ? 4 : 0 }}>{item.icon}</span>

              <div style={{ flex:1, minWidth:0 }}>
                <p style={{
                  fontSize:12, fontWeight:600, lineHeight:1.2,
                  color: active ? '#e0e0f0' : '#6e6e8a',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>{item.label}</p>
                <p style={{ fontSize:9.5, color: active ? 'rgba(108,99,255,.8)' : '#3a3a56', fontFamily:"'Space Mono',monospace", marginTop:1 }}>{item.sub}</p>
              </div>

              {active && (
                <div style={{
                  width:6, height:6, borderRadius:'50%',
                  background:'#6c63ff', flexShrink:0,
                  boxShadow:'0 0 8px #6c63ff',
                  animation:'glow-pulse 2s ease-in-out infinite',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding:'10px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ fontSize:9, color:'#2a2a3e', fontFamily:"'Space Mono',monospace", textAlign:'center', letterSpacing:1, padding:'4px 0' }}>
          NEXMIND v0.1 · TAEC
        </div>
      </div>
    </aside>
  )
}
