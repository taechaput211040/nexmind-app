'use client'
import { useState } from 'react'
import { logEntries, agents } from '@/data/agents'

export default function MissionLog() {
  const [filter, setFilter] = useState('All')

  const filtered = logEntries.filter(l => filter === 'All' || l.agentId === filter)

  const statusIcon  = { success:'✅', in_progress:'🔄', failed:'❌' }
  const statusColor = { success:'var(--green)', in_progress:'var(--gold)', failed:'var(--red)' }
  const statusLabel = { success:'Success', in_progress:'In Progress', failed:'Failed' }

  return (
    <div className="min-h-screen p-8 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs tracking-widest mb-1" style={{ color:'var(--cyan)' }}>📡 ACTIVITY CHRONICLE</p>
          <h1 className="text-3xl font-bold">Mission Log</h1>
          <p className="text-sm mt-1" style={{ color:'var(--muted)' }}>Audit trail ของทุก agent activity</p>
        </div>
      </div>

      {/* Agent filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setFilter('All')}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: filter === 'All' ? 'rgba(108,99,255,.22)' : 'var(--card)',
            border:     filter === 'All' ? '1px solid rgba(108,99,255,.5)' : '1px solid var(--rim)',
            color:      filter === 'All' ? 'var(--purple)' : 'var(--muted)',
          }}
        >
          ⚡ All Agents
        </button>
        {agents.filter(a => logEntries.some(l => l.agentId === a.id)).map(a => (
          <button
            key={a.id}
            onClick={() => setFilter(a.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filter === a.id ? `${a.color}22` : 'var(--card)',
              border:     filter === a.id ? `1px solid ${a.color}55` : '1px solid var(--rim)',
              color:      filter === a.id ? a.color : 'var(--muted)',
            }}
          >
            {a.emoji} {a.name}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          style={{
            position:'absolute', left:19, top:0, bottom:0, width:1,
            background:'linear-gradient(180deg, var(--purple), var(--pink), transparent)',
            opacity:.3,
          }}
        />

        <div className="flex flex-col gap-6">
          {filtered.map((log, i) => {
            const agent = agents.find(a => a.id === log.agentId)
            const sc    = log.status as keyof typeof statusColor
            return (
              <div key={log.id} className="flex gap-5 items-start anim-fade-up" style={{ animationDelay:`${i * 50}ms` }}>
                {/* Avatar on line */}
                <div
                  style={{
                    width:40, height:40, borderRadius:'50%', flexShrink:0,
                    background:`${agent?.color ?? '#888'}22`,
                    border:`2px solid ${agent?.color ?? '#888'}55`,
                    boxShadow:`0 0 12px ${agent?.color ?? '#888'}22`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                    position:'relative', zIndex:1,
                  }}
                >
                  {agent?.emoji}
                </div>

                {/* Content */}
                <div
                  className="flex-1 glass-card p-4"
                  style={{ border:`1px solid ${agent?.color ?? '#888'}18` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs" style={{ color:agent?.color ?? 'var(--muted)' }}>
                          {agent?.name}
                        </span>
                        <span className="text-xs" style={{ color:'var(--dim)' }}>·</span>
                        <span className="text-xs" style={{ color:'var(--dim)' }}>{agent?.title}</span>
                      </div>
                      <p className="font-semibold text-sm">{log.action}</p>
                      <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>{log.detail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                        style={{ background:`${statusColor[sc]}18`, color:statusColor[sc] }}
                      >
                        <span>{statusIcon[sc]}</span>
                        <span className="font-mono">{statusLabel[sc]}</span>
                      </div>
                      <span className="font-mono text-xs" style={{ color:'var(--dim)' }}>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color:'var(--dim)' }}>
          <p className="text-4xl mb-3">📡</p>
          <p>ไม่มี log ที่ตรงกับ filter</p>
        </div>
      )}
    </div>
  )
}
