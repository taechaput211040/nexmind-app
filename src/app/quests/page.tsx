'use client'
import { useState, useEffect, useCallback } from 'react'
import { agents, type Quest } from '@/data/agents'

const deptFilters = ['All','Dev Forge','Design','Content','Trading','Intelligence','Finance','Systems']

const statusConfig = {
  PENDING:     { label:'Pending',     color:'var(--gold)',   bg:'rgba(255,215,0,.1)'   },
  APPROVED:    { label:'Approved',    color:'var(--green)',  bg:'rgba(0,255,136,.1)'   },
  IN_PROGRESS: { label:'In Progress', color:'var(--cyan)',   bg:'rgba(0,212,255,.1)'   },
  DONE:        { label:'Done',        color:'var(--dim)',    bg:'rgba(68,68,90,.1)'    },
  REJECTED:    { label:'Rejected',    color:'var(--red)',    bg:'rgba(255,68,102,.1)'  },
}

function QuestCard({ quest, onApprove, onReject }: {
  quest: Quest
  onApprove: (id: string) => void
  onReject:  (id: string) => void
}) {
  const agent = agents.find(a => a.id === quest.proposedBy)
  const sc    = statusConfig[quest.status]

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3"
      style={{ border:`1px solid ${quest.priority === 'HIGH' ? 'rgba(255,68,102,.2)' : quest.priority === 'MEDIUM' ? 'rgba(255,215,0,.15)' : 'rgba(0,255,136,.12)'}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`priority-${quest.priority.toLowerCase()} text-xs font-mono px-2 py-0.5 rounded-full`}>
              {quest.priority}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background:sc.bg, color:sc.color }}>
              {sc.label}
            </span>
          </div>
          <h3 className="font-semibold text-sm leading-snug">{quest.title}</h3>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>{quest.description}</p>

      <div className="flex items-center justify-between pt-2" style={{ borderTop:'1px solid var(--rim)' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width:22, height:22, borderRadius:'50%',
            background:`${agent?.color ?? '#888'}22`,
            border:`1px solid ${agent?.color ?? '#888'}44`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
          }}>
            {agent?.emoji}
          </div>
          <div>
            <p className="font-mono font-bold" style={{ fontSize:10, color:agent?.color ?? 'var(--muted)' }}>{agent?.name}</p>
            <p style={{ fontSize:9, color:'var(--dim)' }}>{quest.createdAt}</p>
          </div>
        </div>

        {quest.status === 'PENDING' && (
          <div className="flex gap-2">
            <button className="btn-approve" onClick={() => onApprove(quest.id)}>✅ Approve</button>
            <button className="btn-reject"  onClick={() => onReject(quest.id)}>❌ Reject</button>
          </div>
        )}
        {quest.status !== 'PENDING' && (
          <span className="text-xs" style={{ color:sc.color }}>{sc.label}</span>
        )}
      </div>
    </div>
  )
}

export default function Quests() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/quests')
      const data = await res.json()
      setQuests(data)
    } catch (e) {
      console.error('Failed to fetch quests', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuests() }, [fetchQuests])

  const handleApprove = async (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status:'APPROVED' as const } : q))
    await fetch('/api/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'APPROVED' }),
    })
  }

  const handleReject = async (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, status:'REJECTED' as const } : q))
    await fetch('/api/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'REJECTED' }),
    })
  }

  const filtered = quests.filter(q => {
    const deptMatch   = filter === 'All' || q.dept === filter
    const statusMatch = statusFilter === 'All' || q.status === statusFilter
    return deptMatch && statusMatch
  })

  const pendingCount = quests.filter(q => q.status === 'PENDING').length

  return (
    <div className="min-h-screen p-8 page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs tracking-widest mb-1" style={{ color:'var(--gold)' }}>📋 MISSION BOARD</p>
          <h1 className="text-3xl font-bold">Quest Board</h1>
          <p className="text-sm mt-1" style={{ color:'var(--muted)' }}>
            {quests.length} quests ·{' '}
            <span style={{ color:'var(--gold)' }}>{pendingCount} รอ approve</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {pendingCount > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background:'rgba(255,215,0,.1)', border:'1px solid rgba(255,215,0,.35)' }}
            >
              <span className="text-xl">📋</span>
              <div>
                <p className="font-bold text-sm" style={{ color:'var(--gold)' }}>{pendingCount} Pending</p>
                <p className="text-xs" style={{ color:'var(--muted)' }}>รอการ approve จาก TAEC</p>
              </div>
            </div>
          )}
          <button
            onClick={fetchQuests}
            style={{
              padding:'8px 14px', borderRadius:10, border:'1px solid var(--rim)',
              background:'var(--card)', color:'var(--muted)', cursor:'pointer',
              fontSize:12, fontFamily:"'Space Mono',monospace",
            }}
          >🔄 Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {deptFilters.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filter === d ? 'rgba(108,99,255,.22)' : 'var(--card)',
              border:     filter === d ? '1px solid rgba(108,99,255,.5)' : '1px solid var(--rim)',
              color:      filter === d ? 'var(--purple)' : 'var(--muted)',
            }}
          >{d}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['All','PENDING','APPROVED','IN_PROGRESS','DONE','REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1 rounded-full text-xs transition-all font-mono"
            style={{
              background: statusFilter === s ? 'rgba(255,255,255,.06)' : 'transparent',
              border: '1px solid var(--rim)',
              color: statusFilter === s ? 'var(--text)' : 'var(--dim)',
            }}
          >{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>
          <p style={{ fontSize:32, marginBottom:12 }}>⚡</p>
          <p style={{ fontFamily:"'Space Mono',monospace", fontSize:12 }}>Loading quests...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(q => (
              <QuestCard key={q.id} quest={q} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color:'var(--dim)' }}>
              <p className="text-4xl mb-3">📋</p>
              <p>ไม่มี quest ที่ตรงกับ filter</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
