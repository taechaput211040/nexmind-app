'use client'
import Link from 'next/link'
import { useState } from 'react'

type NodeState = 'locked' | 'current' | 'cleared' | 'unlocked'

interface MapNode {
  id: string
  name: string
  icon: string
  href: string
  col: number
  row: number
  state: NodeState
}

const COLS = 12
const ROWS = 8

// Dungeon node graph — each node links to a NEXMIND page.
const NODES: MapNode[] = [
  { id: 'roster',       name: 'Roster Hall',       icon: '🛡️', href: '/roster',       col: 1,  row: 5, state: 'cleared'  },
  { id: 'quests',       name: 'Quest Board',       icon: '📜', href: '/quests',       col: 3,  row: 3, state: 'cleared'  },
  { id: 'guild-room',   name: 'Guild War Room',    icon: '🏰', href: '/guild-room',   col: 5,  row: 5, state: 'current'  },
  { id: 'scroll-vault', name: 'Scroll Vault',      icon: '🗝️', href: '/scroll-vault', col: 7,  row: 3, state: 'unlocked' },
  { id: 'observatory',  name: 'Observatory',       icon: '🔭', href: '/observatory',  col: 8,  row: 6, state: 'unlocked' },
  { id: 'settings',     name: 'Rune Settings',     icon: '⚙️', href: '/settings',     col: 2,  row: 1, state: 'locked'   },
  { id: 'affiliate',    name: 'Affiliate Crypt',   icon: '💠', href: '/affiliate',    col: 6,  row: 1, state: 'locked'   },
  { id: 'mission-log',  name: 'Mission Log',       icon: '📖', href: '/mission-log',  col: 10, row: 3, state: 'locked'   },
  { id: 'scheduler',    name: 'Time Spire',        icon: '⏳', href: '/scheduler',    col: 10, row: 6, state: 'locked'   },
  { id: 'analytics',    name: 'Analytics Sanctum', icon: '📊', href: '/analytics',    col: 11, row: 1, state: 'locked'   },
]

// Corridors connecting nodes.
const EDGES: [string, string][] = [
  ['roster', 'quests'],
  ['quests', 'guild-room'],
  ['quests', 'settings'],
  ['guild-room', 'scroll-vault'],
  ['guild-room', 'observatory'],
  ['scroll-vault', 'affiliate'],
  ['scroll-vault', 'mission-log'],
  ['observatory', 'scheduler'],
  ['mission-log', 'analytics'],
]

const STATE_COLOR: Record<NodeState, string> = {
  locked:   'var(--map-locked)',
  current:  'var(--map-current)',
  cleared:  'var(--map-cleared)',
  unlocked: 'var(--map-unlocked)',
}

const STATE_GLOW: Record<NodeState, string> = {
  locked:   'none',
  current:  'var(--magic-glow-purple)',
  cleared:  'var(--magic-glow-pink)',
  unlocked: 'var(--magic-glow-cyan)',
}

const STATE_LABEL: Record<NodeState, string> = {
  locked:   'LOCKED',
  current:  'YOU ARE HERE',
  cleared:  'CLEARED',
  unlocked: 'OPEN',
}

// Torch positions (col,row on the dungeon walls) for warm light accents.
const TORCHES: { col: number; row: number }[] = [
  { col: 0, row: 0 }, { col: 11, row: 0 }, { col: 0, row: 7 }, { col: 11, row: 7 },
  { col: 4, row: 0 }, { col: 6, row: 7 },
]

const cx = (col: number) => ((col + 0.5) / COLS) * 100
const cy = (row: number) => ((row + 0.5) / ROWS) * 100
const byId = (id: string) => NODES.find(n => n.id === id)!

export default function GuildMap() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="min-h-screen p-8 page-enter">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest mb-1" style={{ color: 'var(--map-torch)' }}>THE DUNGEON REALM</p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--cmd-text)' }}>Dungeon Map</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--cmd-text-soft)' }}>เดินสำรวจ dungeon — แต่ละห้องเชื่อมไปยังพื้นที่ของ NEXMIND</p>
      </div>

      {/* Map area */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 600,
          background: 'var(--magic-glass)',
          border: '1px solid var(--magic-glass-border)',
          boxShadow: 'var(--magic-glow-soft)',
          backdropFilter: 'blur(var(--magic-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
          borderRadius: 'var(--cmd-card-radius)',
        }}
      >
        {/* Stone tile floor */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'var(--map-wall)',
            backgroundImage:
              'linear-gradient(90deg, var(--map-stone) 2px, transparent 2px), ' +
              'linear-gradient(var(--map-stone) 2px, transparent 2px)',
            backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            imageRendering: 'var(--map-render)' as React.CSSProperties['imageRendering'],
            opacity: 0.9,
          }}
        />
        {/* Dirt floor wash */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background:
              'radial-gradient(ellipse 45% 40% at 35% 60%, var(--map-floor) 0%, transparent 70%)',
            opacity: 0.55,
          }}
        />

        {/* Corridors */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {EDGES.map(([a, b], i) => {
            const na = byId(a)
            const nb = byId(b)
            const locked = na.state === 'locked' || nb.state === 'locked'
            return (
              <g key={i}>
                <line
                  x1={`${cx(na.col)}%`} y1={`${cy(na.row)}%`}
                  x2={`${cx(nb.col)}%`} y2={`${cy(nb.row)}%`}
                  stroke="var(--map-floor)" strokeWidth={locked ? 8 : 14} strokeLinecap="round"
                  opacity={locked ? 0.35 : 0.8}
                />
                <line
                  x1={`${cx(na.col)}%`} y1={`${cy(na.row)}%`}
                  x2={`${cx(nb.col)}%`} y2={`${cy(nb.row)}%`}
                  stroke={locked ? 'var(--map-locked)' : 'var(--map-path)'}
                  strokeWidth="2"
                  strokeDasharray={locked ? '4,6' : undefined}
                  opacity={locked ? 0.5 : 0.9}
                />
              </g>
            )
          })}
        </svg>

        {/* Fog-of-war over locked regions */}
        {NODES.filter(n => n.state === 'locked').map(n => (
          <div
            key={`fog-${n.id}`}
            style={{
              position: 'absolute',
              left: `${cx(n.col)}%`, top: `${cy(n.row)}%`,
              width: 220, height: 220,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, var(--map-fog) 30%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Torches */}
        {TORCHES.map((t, i) => (
          <div
            key={`torch-${i}`}
            style={{
              position: 'absolute',
              left: `${cx(t.col)}%`, top: `${cy(t.row)}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: 18,
              filter: 'drop-shadow(var(--map-glow))',
              pointerEvents: 'none',
            }}
          >
            🔥
          </div>
        ))}

        {/* Nodes */}
        {NODES.map(node => {
          const color = STATE_COLOR[node.state]
          const isLocked = node.state === 'locked'
          const isHovered = hovered === node.id

          const room = (
            <div
              className="flex flex-col items-center"
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {node.state === 'current' && (
                <div
                  style={{
                    fontSize: 16,
                    marginBottom: 2,
                    filter: 'drop-shadow(var(--magic-glow-purple))',
                    animation: 'glow-pulse 1.6s ease-in-out infinite',
                  }}
                >
                  🧙
                </div>
              )}

              <div
                style={{
                  width: 52, height: 52,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                  background: 'linear-gradient(135deg, var(--map-stone) 0%, var(--map-wall) 100%)',
                  border: `2px solid ${color}`,
                  borderRadius: 6,
                  boxShadow: `var(--map-node-edge), ${isHovered && !isLocked ? STATE_GLOW[node.state] : 'none'}`,
                  imageRendering: 'var(--map-render)' as React.CSSProperties['imageRendering'],
                  opacity: isLocked ? 0.55 : 1,
                  transform: isHovered && !isLocked ? 'translateY(-2px)' : 'none',
                  transition: 'transform 160ms, box-shadow 160ms',
                  position: 'relative',
                }}
              >
                {isLocked ? '🔒' : node.icon}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 7,
                  fontFamily: 'monospace',
                  letterSpacing: 1,
                  color,
                  fontWeight: 700,
                  textShadow: isLocked ? 'none' : `0 0 6px ${color}`,
                }}
              >
                {STATE_LABEL[node.state]}
              </div>

              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                    padding: '4px 10px',
                    background: 'var(--magic-glass)',
                    border: `1px solid ${color}`,
                    borderRadius: 8,
                    boxShadow: 'var(--magic-glow-soft)',
                    backdropFilter: 'blur(var(--magic-glass-blur))',
                    WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
                    zIndex: 20,
                  }}
                >
                  <p className="font-mono font-bold" style={{ fontSize: 10, color: 'var(--cmd-text)' }}>{node.name}</p>
                  <p style={{ fontSize: 8, color: 'var(--cmd-text-soft)' }}>
                    {isLocked ? 'ยังเข้าไม่ได้' : node.href}
                  </p>
                </div>
              )}
            </div>
          )

          const wrapperStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${cx(node.col)}%`,
            top: `${cy(node.row)}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: isHovered ? 15 : 10,
          }

          return isLocked ? (
            <div key={node.id} style={{ ...wrapperStyle, cursor: 'not-allowed' }}>{room}</div>
          ) : (
            <Link key={node.id} href={node.href} style={{ ...wrapperStyle, cursor: 'pointer' }}>
              {room}
            </Link>
          )
        })}

        {/* Hint */}
        <div
          style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'var(--magic-glass)',
            border: '1px solid var(--magic-glass-border)',
            boxShadow: 'var(--magic-glow-soft)',
            backdropFilter: 'blur(var(--magic-glass-blur))',
            WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
            borderRadius: 8, padding: '6px 12px',
          }}
        >
          <p className="font-mono" style={{ fontSize: 9, color: 'var(--cmd-text-soft)' }}>🧙 = ตำแหน่งคุณ · คลิกห้องที่เปิดเพื่อเดินทาง</p>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-5 mt-6 p-4"
        style={{
          background: 'var(--magic-glass)',
          border: '1px solid var(--magic-glass-border)',
          boxShadow: 'var(--magic-glow-soft)',
          backdropFilter: 'blur(var(--magic-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
          borderRadius: 'var(--cmd-card-radius)',
        }}
      >
        {(Object.keys(STATE_COLOR) as NodeState[]).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span
              style={{
                width: 14, height: 14, borderRadius: 4,
                border: `2px solid ${STATE_COLOR[s]}`,
                boxShadow: STATE_GLOW[s] === 'none' ? 'none' : STATE_GLOW[s],
                display: 'inline-block',
              }}
            />
            <span className="text-xs font-mono" style={{ color: STATE_COLOR[s] }}>{STATE_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
