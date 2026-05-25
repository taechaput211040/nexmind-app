import Link from 'next/link'
import { agents } from '@/data/agents'

export default function Settings() {
  return (
    <div className="min-h-screen p-8 page-enter">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest mb-1" style={{ color:'var(--orange)' }}>⚙️ THE FORGE</p>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm mt-1" style={{ color:'var(--muted)' }}>Config system, agents, API keys</p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-4xl">

        {/* API Keys */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">🔑 API Configuration</h2>
          <div className="flex flex-col gap-3">
            {['Claude API Key','n8n Webhook URL','LINE Notify Token'].map(key => (
              <div key={key}>
                <label className="text-xs font-mono mb-1 block" style={{ color:'var(--muted)' }}>{key}</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background:'var(--hover)', border:'1px solid var(--rim)', color:'var(--text)' }}
                />
              </div>
            ))}
            <button className="btn-primary mt-2">💾 Save Config</button>
          </div>
        </div>

        {/* System */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">⚡ System Info</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { label:'Version', value:'0.1.0 · Phase 1 MVP' },
              { label:'Total Agents', value:`${agents.length} agents registered` },
              { label:'Online Now', value:`${agents.filter(a=>a.status==='online').length} agents` },
              { label:'Model', value:'claude-sonnet-4-6' },
              { label:'Owner', value:'TAEC · NEXMIND AI CO.' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom:'1px solid var(--rim)' }}>
                <span className="text-xs font-mono" style={{ color:'var(--muted)' }}>{row.label}</span>
                <span className="text-xs font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Prompts quick access */}
        <div className="glass-card p-6 col-span-2">
          <h2 className="font-semibold mb-4 flex items-center gap-2">🤖 Agent System Prompts</h2>
          <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>แก้ system prompt ของแต่ละ agent — บันทึกไว้ใน NEXMIND_System_Prompts.md</p>
          <div className="grid grid-cols-4 gap-2">
            {agents.slice(0, 12).map(a => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer"
                style={{ background:'var(--hover)', border:`1px solid ${a.color}22` }}
              >
                <span>{a.emoji}</span>
                <div>
                  <p className="font-mono text-xs font-bold" style={{ color:a.color }}>{a.name}</p>
                  <p style={{ fontSize:9, color:'var(--dim)' }}>{a.dept}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color:'var(--dim)' }}>
            แก้ไข full spec ได้ที่ <Link href="#" className="underline" style={{ color:'var(--purple)' }}>AGENT-COMPANY/NEXMIND_System_Prompts.md</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
