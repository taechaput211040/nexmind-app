import Link from 'next/link'

const intel = [
  {
    category:'🔥 Trending Today', color:'var(--pink)', agent:'SCOUT',
    items:[
      { title:'Collagen Supplement', detail:'Search volume +34% WoW · CPC ฿18 · High intent', tag:'Affiliate Opp' },
      { title:'AI Productivity Tools', detail:'TikTok trend rising · 2.4M views/day average', tag:'Content Opp' },
      { title:'Gold Breakout Setup', detail:'XAU/USD กำลัง test resistance 2,320 · volume สูง', tag:'Trade Watch' },
    ],
  },
  {
    category:'📈 Market Snapshot', color:'var(--gold)', agent:'HAWK',
    items:[
      { title:'XAU/USD', detail:'2,318.40 · +0.42% · RSI 58 · Trend: Bullish', tag:'BUY SETUP' },
      { title:'USD Index (DXY)', detail:'104.2 · -0.18% · Weakening → Gold positive', tag:'Watch' },
      { title:'S&P 500', detail:'5,312 · +0.28% · Risk-on sentiment', tag:'Neutral' },
    ],
  },
  {
    category:'📝 Content Opportunities', color:'var(--green)', agent:'INK',
    items:[
      { title:'"Collagen ดียังไง" article', detail:'Volume: 8,400/mo · KD: 28 · Easy to rank', tag:'Write Now' },
      { title:'AI tools comparison 2026', detail:'Volume: 12,000/mo · Monetizable via affiliate', tag:'Research' },
      { title:'XAU trading guide TH', detail:'ไม่มี strong competitor ภาษาไทย', tag:'Gap Found' },
    ],
  },
]

export default function Observatory() {
  return (
    <div className="min-h-screen p-8 page-enter">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest mb-1" style={{ color:'var(--cyan)' }}>🔭 THE WATCHTOWER</p>
          <h1 className="text-3xl font-bold">Observatory</h1>
          <p className="text-sm mt-1" style={{ color:'var(--muted)' }}>Intel room — SCOUT + HAWK + ATLAS scan ให้ทุกวัน</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-mono" style={{ color:'var(--dim)' }}>Updated: 09:00 today</p>
          <button className="btn-ghost">🔄 Refresh</button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {intel.map(section => (
          <div key={section.category} className="glass-card p-6" style={{ border:`1px solid ${section.color}22` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-sm">{section.category}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ background:`${section.color}18`, color:section.color }}>
                  by {section.agent}
                </span>
              </div>
              <Link href="/guild-room" className="text-xs" style={{ color:'var(--purple)' }}>
                สั่ง {section.agent} ลงลึก →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {section.items.map((item, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl transition-all"
                  style={{ background:'var(--hover)', border:'1px solid var(--rim)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-xs leading-snug flex-1">{item.title}</p>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded ml-2 flex-shrink-0"
                      style={{ background:`${section.color}18`, color:section.color, fontSize:9 }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color:'var(--muted)' }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs mt-6" style={{ color:'var(--dim)' }}>
        💡 ใน Phase 2 Observatory จะ pull ข้อมูล real-time จาก SCOUT, HAWK, ATLAS ทุก 6 ชั่วโมง
      </p>
    </div>
  )
}
