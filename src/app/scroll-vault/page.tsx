'use client'
import { useEffect, useState, useCallback } from 'react'

type Entry = { date: string; preview: string }
type Category = { id: string; name: string; entries: Entry[] }

const ICONS: Record<string, string> = {
  'ai-tools': '🤖',
  'ai-agents': '⚡',
  'dev-ecosystem': '💻',
  'market-trends': '📈',
}

const COLORS: Record<string, string> = {
  'ai-tools': 'var(--purple)',
  'ai-agents': 'var(--cyan)',
  'dev-ecosystem': 'var(--green)',
  'market-trends': 'var(--gold)',
}

export default function ScrollVault() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<{ cat: string; date: string } | null>(null)
  const [entryContent, setEntryContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchLog, setResearchLog] = useState<string[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const r = await fetch('/api/research')
      const data = await r.json()
      setCategories(data.categories ?? [])
      const allDates = (data.categories ?? [])
        .flatMap((c: Category) => c.entries.map((e: Entry) => e.date))
        .sort().reverse()
      if (allDates[0]) setLastUpdated(allDates[0])
    } catch { /* skip */ }
  }, [])

  useEffect(() => { void fetchCategories() }, [fetchCategories])

  const loadEntry = async (catId: string, date: string) => {
    setLoading(true)
    setEntryContent('')
    setSelectedEntry({ cat: catId, date })
    try {
      const r = await fetch(`/api/research/entry?category=${catId}&date=${date}`)
      const data = await r.json()
      setEntryContent(data.content ?? 'Entry not found.')
    } catch {
      setEntryContent('Failed to load entry.')
    } finally {
      setLoading(false)
    }
  }

  const runResearch = async (catIds?: string[]) => {
    setResearching(true)
    setResearchLog(['🚀 Starting research pipeline...'])
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catIds ? { categories: catIds } : {}),
      })
      const reader = r.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (line === '[DONE]') break
          try {
            const ev = JSON.parse(line)
            if (ev.type === 'status') setResearchLog(l => [...l, `🔍 ${ev.text ?? ev.category}`])
            if (ev.type === 'saved')  setResearchLog(l => [...l, `✅ Saved: ${ev.name}`])
            if (ev.type === 'done')   setResearchLog(l => [...l, `🎉 ${ev.message}`])
            if (ev.type === 'error')  setResearchLog(l => [...l, `❌ ${ev.error}`])
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setResearchLog(l => [...l, `❌ ${String(err)}`])
    } finally {
      setResearching(false)
      await fetchCategories()
    }
  }

  const totalEntries = categories.reduce((s, c) => s + c.entries.length, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nebula-bg)', color: 'var(--cmd-text)', padding: '28px 32px' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: 'var(--cmd-text)', letterSpacing: 2, margin: 0 }}>
              SCROLL VAULT
            </h1>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'var(--purple)', letterSpacing: 2, marginTop: 4 }}>
              {'KNOWLEDGE BASE · ' + totalEntries + ' ENTRIES' + (lastUpdated ? ' · LAST UPDATED ' + lastUpdated : '')}
            </p>
          </div>
          <button
            onClick={() => void runResearch()}
            disabled={researching}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid color-mix(in srgb, var(--purple) 40%, transparent)',
              background: researching
                ? 'color-mix(in srgb, var(--purple) 8%, transparent)'
                : 'linear-gradient(135deg, color-mix(in srgb, var(--purple) 20%, transparent), color-mix(in srgb, var(--cyan) 10%, transparent))',
              color: 'var(--cmd-text)', cursor: researching ? 'not-allowed' : 'pointer',
              fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span>{researching ? '⚙️' : '🔭'}</span>
            {researching ? 'RESEARCHING...' : 'RUN RESEARCH'}
          </button>
        </div>

        {researchLog.length > 0 && (
          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 'var(--cmd-card-radius)',
            background: 'var(--magic-glass)', border: '1px solid var(--magic-glass-border)',
            boxShadow: 'var(--magic-glow-soft)',
            backdropFilter: 'blur(var(--magic-glass-blur))', WebkitBackdropFilter: 'blur(var(--magic-glass-blur))',
            fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'var(--cmd-text-soft)',
            maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {researchLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {categories.map(cat => {
            const color = COLORS[cat.id] ?? 'var(--purple)'
            const isActive = selectedCat === cat.id
            return (
              <div key={cat.id}>
                <button
                  onClick={() => setSelectedCat(isActive ? null : cat.id)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                    border: isActive ? `1px solid color-mix(in srgb, ${color} 33%, transparent)` : '1px solid var(--magic-glass-border)',
                    background: isActive ? `color-mix(in srgb, ${color} 8%, transparent)` : 'var(--card)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{ICONS[cat.id] ?? '📁'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: 0, color: isActive ? color : 'var(--cmd-text-soft)', fontFamily: "'Space Mono',monospace" }}>{cat.name}</p>
                    <p style={{ fontSize: 9, color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace", marginTop: 2, margin: 0 }}>{cat.entries.length} {cat.entries.length === 1 ? 'entry' : 'entries'}</p>
                  </div>
                  <span style={{ fontSize: 10, color: `color-mix(in srgb, ${color} 44%, transparent)` }}>{isActive ? '▾' : '▸'}</span>
                </button>

                {isActive && cat.entries.length > 0 && (
                  <div style={{ marginTop: 4, marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {cat.entries.map(entry => {
                      const isSel = selectedEntry?.cat === cat.id && selectedEntry?.date === entry.date
                      return (
                        <button
                          key={entry.date}
                          onClick={() => void loadEntry(cat.id, entry.date)}
                          style={{
                            padding: '7px 10px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                            border: isSel ? `1px solid color-mix(in srgb, ${color} 27%, transparent)` : '1px solid var(--cmd-divider)',
                            background: isSel ? `color-mix(in srgb, ${color} 5%, transparent)` : 'transparent',
                          }}
                        >
                          <p style={{ fontSize: 10, fontWeight: 700, margin: 0, color: isSel ? color : 'var(--cmd-text-soft)', fontFamily: "'Space Mono',monospace" }}>{entry.date}</p>
                          <p style={{ fontSize: 9, color: 'var(--cmd-label)', margin: '2px 0 0', lineHeight: 1.4 }}>{entry.preview.slice(0, 75)}{entry.preview.length > 75 ? '…' : ''}</p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {isActive && cat.entries.length === 0 && (
                  <div style={{ padding: '8px 10px', marginTop: 4 }}>
                    <p style={{ fontSize: 9, color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace", margin: '0 0 6px' }}>Empty &mdash; run research first.</p>
                    <button onClick={() => void runResearch([cat.id])} disabled={researching} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 9, border: `1px solid color-mix(in srgb, ${color} 21%, transparent)`, background: `color-mix(in srgb, ${color} 5%, transparent)`, color, cursor: 'pointer', fontFamily: "'Space Mono',monospace" }}>
                      Research this
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: 'var(--magic-glass)', border: '1px solid var(--magic-glass-border)', boxShadow: 'var(--magic-glow-soft)', backdropFilter: 'blur(var(--magic-glass-blur))', WebkitBackdropFilter: 'blur(var(--magic-glass-blur))', borderRadius: 'var(--cmd-card-radius)', padding: 28, minHeight: 420 }}>
          {!selectedEntry && !loading && (
            <div style={{ textAlign: 'center', paddingTop: 90, color: 'var(--cmd-label)' }}>
              <div style={{ fontSize: 38, marginBottom: 14 }}>📜</div>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 1, color: 'var(--cmd-text-soft)' }}>Select an entry to read</p>
              {totalEntries === 0 && <p style={{ fontSize: 10, color: 'var(--cmd-label)', marginTop: 10 }}>Vault is empty &mdash; click RUN RESEARCH to fill it</p>}
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', paddingTop: 90 }}>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--purple)' }}>Loading...</p>
            </div>
          )}
          {selectedEntry && !loading && entryContent && (
            <div>
              <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--cmd-divider)' }}>
                <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: 1, margin: 0, color: COLORS[selectedEntry.cat] ?? 'var(--purple)' }}>
                  {(ICONS[selectedEntry.cat] ?? '📁') + ' '}
                  {(categories.find(c => c.id === selectedEntry.cat)?.name ?? '') + ' · ' + selectedEntry.date}
                </p>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--cmd-text-soft)' }}>
                {entryContent.split('\n').map((line, i) => {
                  if (line.startsWith('# '))  return <h2 key={i} style={{ color: 'var(--cmd-text)', fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>{line.slice(2)}</h2>
                  if (line.startsWith('## ')) return <h3 key={i} style={{ color: 'var(--purple)', fontSize: 13, fontWeight: 700, margin: '14px 0 5px' }}>{line.slice(3)}</h3>
                  if (line.startsWith('- '))  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                      <span style={{ color: COLORS[selectedEntry.cat] ?? 'var(--purple)', flexShrink: 0, marginTop: 2 }}>▸</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  )
                  if (line.startsWith('>'))  return <p key={i} style={{ color: 'var(--cmd-label)', fontSize: 11, fontStyle: 'italic', margin: '4px 0' }}>{line.slice(1).trim()}</p>
                  if (line === '---')        return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--cmd-divider)', margin: '14px 0' }} />
                  if (!line.trim())          return <div key={i} style={{ height: 5 }} />
                  return <p key={i} style={{ margin: '2px 0' }}>{line}</p>
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
