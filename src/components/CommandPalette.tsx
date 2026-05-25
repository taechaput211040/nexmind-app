'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { agents } from '@/data/agents'

interface PaletteItem {
  id: string
  label: string
  sub?: string
  icon: string
  group: string
  action: () => void
}

const PAGES: PaletteItem[] = [
  { id: 'pg-dash',    icon: '⚡', label: 'Dashboard',    group: '🧭 NAVIGATE', sub: '/',            action: () => {} },
  { id: 'pg-guild',   icon: '🏰', label: 'Guild Room',   group: '🧭 NAVIGATE', sub: '/guild-room',  action: () => {} },
  { id: 'pg-roster',  icon: '🛡️', label: 'Roster',       group: '🧭 NAVIGATE', sub: '/roster',      action: () => {} },
  { id: 'pg-vault',   icon: '🗝️', label: 'Scroll Vault', group: '🧭 NAVIGATE', sub: '/scroll-vault', action: () => {} },
  { id: 'pg-map',     icon: '🗺️', label: 'Map',          group: '🧭 NAVIGATE', sub: '/map',         action: () => {} },
  { id: 'pg-quests',  icon: '📜', label: 'Quests',       group: '🧭 NAVIGATE', sub: '/quests',      action: () => {} },
]

const TEMPLATES = [
  { id: 'tp-1', icon: '🔍', label: 'Review latest changes',  prompt: 'Review โค้ดที่เปลี่ยนล่าสุด บอกว่ามี bug หรือ issue อะไรบ้าง' },
  { id: 'tp-2', icon: '🧪', label: 'Write unit tests',       prompt: 'เขียน unit test สำหรับไฟล์ที่แก้ล่าสุด ครอบคลุม edge cases' },
  { id: 'tp-3', icon: '📐', label: 'Explain architecture',   prompt: 'อธิบาย architecture และ structure ของ project นี้ให้เข้าใจง่าย' },
  { id: 'tp-4', icon: '🐛', label: 'Fix TypeScript errors',  prompt: 'ตรวจสอบและแก้ TypeScript errors ทั้งหมดใน project' },
  { id: 'tp-5', icon: '⚡', label: 'Optimize performance',   prompt: 'วิเคราะห์และ optimize performance ของ project นี้' },
  { id: 'tp-6', icon: '📝', label: 'Write documentation',    prompt: 'เขียน documentation สำหรับ functions และ components หลักใน project' },
  { id: 'tp-7', icon: '🔒', label: 'Security review',        prompt: 'ทำ security review — หา vulnerabilities, ช่องโหว่, และปัญหา auth/validation' },
  { id: 'tp-8', icon: '♻️', label: 'Refactor code',          prompt: 'Refactor โค้ดให้ clean ขึ้น ลด duplication และปรับปรุง readability' },
]

export default function CommandPalette() {
  const [open, setOpen]             = useState(false)
  const [query, setQuery]           = useState('')
  const [selected, setSelected]     = useState(0)
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; path: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fetch workspaces when opened
  useEffect(() => {
    if (!open) return
    setQuery(''); setSelected(0)
    setTimeout(() => inputRef.current?.focus(), 30)
    fetch('/api/workspace')
      .then(r => r.json())
      .then((d: { workspaces: { id: string; name: string; path: string }[] }) => {
        setWorkspaces(d.workspaces ?? [])
      })
      .catch(() => {})
  }, [open])

  // Build flat items list
  function buildItems(): PaletteItem[] {
    const q = query.toLowerCase()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    const items: PaletteItem[] = []

    // Pages
    for (const p of PAGES) {
      if (match(p.label)) {
        items.push({ ...p, action: () => { router.push(p.sub!); close() } })
      }
    }

    // Workspaces
    for (const ws of workspaces) {
      if (match(ws.name) || match(ws.path)) {
        items.push({
          id: `ws-${ws.id}`, label: ws.name, sub: ws.path,
          icon: '🗂️', group: '🗂️ WORKSPACES',
          action: () => {
            sessionStorage.setItem('nexmind_pending_workspace', ws.id)
            router.push('/guild-room'); close()
          },
        })
      }
    }

    // Agents
    for (const ag of agents) {
      if (match(ag.name) || match(ag.title ?? '') || match(ag.dept ?? '')) {
        items.push({
          id: `ag-${ag.id}`, label: ag.name, sub: ag.title,
          icon: ag.emoji, group: '💬 DM AGENTS',
          action: () => {
            sessionStorage.setItem('nexmind_pending_agent', ag.id)
            router.push('/guild-room'); close()
          },
        })
      }
    }

    // Templates
    for (const t of TEMPLATES) {
      if (match(t.label) || match(t.prompt)) {
        items.push({
          id: t.id, label: t.label, sub: t.prompt.slice(0, 60) + '…',
          icon: t.icon, group: '📋 CC TEMPLATES',
          action: () => {
            sessionStorage.setItem('nexmind_pending_prompt', t.prompt)
            // If already on guild-room, fire event directly too
            window.dispatchEvent(new CustomEvent('nexmind:send-template', { detail: t.prompt }))
            router.push('/guild-room'); close()
          },
        })
      }
    }

    return items
  }

  function close() { setOpen(false) }

  const items = buildItems()

  // Arrow key navigation
  useEffect(() => {
    if (!open) return
    function onNav(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => { const next = Math.min(s + 1, items.length - 1); scrollToItem(next); return next })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => { const next = Math.max(s - 1, 0); scrollToItem(next); return next })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        items[selected]?.action()
      }
    }
    window.addEventListener('keydown', onNav)
    return () => window.removeEventListener('keydown', onNav)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected, items.length])

  function scrollToItem(idx: number) {
    const el = listRef.current?.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }

  // Group items for display
  const groups: { name: string; items: (PaletteItem & { idx: number })[] }[] = []
  const seenGroups = new Set<string>()
  items.forEach((item, idx) => {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group)
      groups.push({ name: item.group, items: [] })
    }
    groups.at(-1)!.items.push({ ...item, idx })
  })

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(7,7,26,0.82)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
      onClick={close}
    >
      <div
        style={{
          width: '100%', maxWidth: 620,
          background: 'var(--magic-glass)',
          border: '1px solid var(--magic-glass-border)',
          borderRadius: 16,
          boxShadow: 'var(--magic-glow-soft), 0 24px 80px rgba(0,0,0,.7)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--magic-glass-border)',
        }}>
          <span style={{ fontSize: 15, opacity: 0.5, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Search pages, workspaces, agents, templates…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--cmd-text)', fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 5, flexShrink: 0,
            background: 'color-mix(in srgb, var(--cmd-text) 5%, transparent)',
            border: '1px solid var(--magic-glass-border)',
            color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0' }}>
          {items.length === 0 && (
            <p style={{
              padding: '28px 20px', textAlign: 'center',
              color: 'var(--cmd-label)', fontSize: 12,
              fontFamily: "'Space Mono',monospace",
            }}>ไม่พบผลลัพธ์ สำหรับ &quot;{query}&quot;</p>
          )}

          {groups.map(g => (
            <div key={g.name}>
              <p style={{
                fontSize: 9, fontFamily: "'Space Mono',monospace",
                color: 'var(--cmd-label)', letterSpacing: 2, fontWeight: 700,
                padding: '10px 18px 4px', margin: 0,
              }}>{g.name}</p>

              {g.items.map(item => {
                const isSel = item.idx === selected
                return (
                  <button
                    key={item.id}
                    data-idx={item.idx}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(item.idx)}
                    style={{
                      width: '100%', padding: '8px 18px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: isSel
                        ? 'color-mix(in srgb, var(--magic-purple) 14%, transparent)'
                        : 'transparent',
                      border: 'none',
                      borderLeft: isSel
                        ? '2px solid var(--magic-purple)'
                        : '2px solid transparent',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background .08s',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 13,
                        color: isSel ? 'var(--cmd-text)' : 'var(--cmd-text-soft)',
                        fontWeight: isSel ? 600 : 400,
                      }}>{item.label}</p>
                      {item.sub && (
                        <p style={{
                          margin: 0, fontSize: 10, color: 'var(--cmd-label)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}>{item.sub}</p>
                      )}
                    </div>
                    {isSel && (
                      <kbd style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                        background: 'color-mix(in srgb, var(--magic-purple) 14%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--magic-purple) 30%, transparent)',
                        color: 'var(--magic-purple)', fontFamily: "'Space Mono',monospace",
                      }}>↵</kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--magic-glass-border)',
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([k, l]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--cmd-label)' }}>
              <kbd style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: 'color-mix(in srgb, var(--cmd-text) 5%, transparent)',
                border: '1px solid var(--magic-glass-border)',
                fontFamily: "'Space Mono',monospace",
              }}>{k}</kbd>
              {l}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--cmd-label)', fontFamily: "'Space Mono',monospace" }}>
            {items.length} results
          </span>
        </div>
      </div>
    </div>
  )
}
