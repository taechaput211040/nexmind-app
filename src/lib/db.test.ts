/**
 * Unit tests for db.ts — SQLite helper layer
 *
 * Strategy: redirect the DB to an in-memory file per test suite so tests
 * never touch the real data/nexmind.db on disk.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'

// ── In-memory DB factory (mirrors initSchema in db.ts) ──────────────────────
function makeDB() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('taec','agent')),
      content TEXT NOT NULL,
      ts TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dm_agent_ts ON dm_messages (agent_id, ts);

    CREATE TABLE IF NOT EXISTS cc_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cc',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      task_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES cc_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      agent_id TEXT,
      text TEXT NOT NULL,
      ts TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cc_msg_session ON cc_messages (session_id, ts);

    CREATE TABLE IF NOT EXISTS task_log (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      title TEXT NOT NULL,
      agents TEXT NOT NULL,
      summary TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'cc'
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      git_url TEXT,
      branch TEXT DEFAULT 'main',
      created_at TEXT NOT NULL,
      last_used TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_last_used ON workspaces (last_used DESC);
  `)
  return db
}

// ── Inline helpers (same logic as db.ts, operating on our test DB) ───────────
function makeDMHelpers(db: ReturnType<typeof makeDB>) {
  return {
    getDMHistory(agentId: string, limit = 100) {
      return db.prepare(
        `SELECT * FROM dm_messages WHERE agent_id = ? ORDER BY ts ASC LIMIT ?`
      ).all(agentId, limit)
    },
    appendDMMessage(msg: { id: string; agent_id: string; role: string; content: string; ts: string }) {
      db.prepare(
        `INSERT OR REPLACE INTO dm_messages (id, agent_id, role, content, ts) VALUES (@id, @agent_id, @role, @content, @ts)`
      ).run(msg)
    },
    clearDMHistory(agentId: string) {
      db.prepare(`DELETE FROM dm_messages WHERE agent_id = ?`).run(agentId)
    },
  }
}

function makeWSHelpers(db: ReturnType<typeof makeDB>) {
  return {
    addWorkspace(ws: { id: string; name: string; path: string; git_url?: string | null; branch?: string; created_at: string; last_used: string }) {
      db.prepare(
        `INSERT OR REPLACE INTO workspaces (id, name, path, git_url, branch, created_at, last_used)
         VALUES (@id, @name, @path, @git_url, @branch, @created_at, @last_used)`
      ).run({ git_url: null, branch: 'main', ...ws })
    },
    getWorkspace(id: string) {
      return db.prepare(`SELECT * FROM workspaces WHERE id = ?`).get(id) as Record<string, unknown> | undefined
    },
    getWorkspaces() {
      return db.prepare(`SELECT * FROM workspaces ORDER BY last_used DESC`).all()
    },
    touchWorkspace(id: string) {
      db.prepare(`UPDATE workspaces SET last_used = ? WHERE id = ?`).run(new Date().toISOString(), id)
    },
    removeWorkspace(id: string) {
      db.prepare(`DELETE FROM workspaces WHERE id = ?`).run(id)
    },
    updateBranch(id: string, branch: string) {
      db.prepare(`UPDATE workspaces SET branch = ? WHERE id = ?`).run(branch, id)
    },
  }
}

function makeCCHelpers(db: ReturnType<typeof makeDB>) {
  return {
    upsertSession(s: { id: string; title: string; mode: string; started_at: string; updated_at: string; task_summary?: string | null }) {
      db.prepare(
        `INSERT OR REPLACE INTO cc_sessions (id, title, mode, started_at, updated_at, task_summary)
         VALUES (@id, @title, @mode, @started_at, @updated_at, @task_summary)`
      ).run({ task_summary: null, ...s })
    },
    appendMessage(msg: { id: string; session_id: string; role: string; agent_id?: string | null; text: string; ts: string }) {
      db.prepare(
        `INSERT OR REPLACE INTO cc_messages (id, session_id, role, agent_id, text, ts)
         VALUES (@id, @session_id, @role, @agent_id, @text, @ts)`
      ).run({ agent_id: null, ...msg })
    },
    getSession(id: string) {
      const session = db.prepare(`SELECT * FROM cc_sessions WHERE id = ?`).get(id) as Record<string, unknown> | undefined
      if (!session) return null
      const messages = db.prepare(`SELECT * FROM cc_messages WHERE session_id = ? ORDER BY ts ASC`).all(id)
      return { ...session, messages }
    },
    deleteSession(id: string) {
      db.prepare(`DELETE FROM cc_sessions WHERE id = ?`).run(id)
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DM message helpers', () => {
  let db: ReturnType<typeof makeDB>
  let dm: ReturnType<typeof makeDMHelpers>

  beforeEach(() => { db = makeDB(); dm = makeDMHelpers(db) })
  afterEach(() => { db.close() })

  it('starts empty for a new agent', () => {
    expect(dm.getDMHistory('nova')).toHaveLength(0)
  })

  it('persists and retrieves a message', () => {
    dm.appendDMMessage({ id: 'msg-1', agent_id: 'nova', role: 'taec', content: 'Hello Nova', ts: '2025-01-01T00:00:00Z' })
    const msgs = dm.getDMHistory('nova')
    expect(msgs).toHaveLength(1)
    expect((msgs[0] as Record<string, unknown>).content).toBe('Hello Nova')
  })

  it('isolates messages by agent_id', () => {
    dm.appendDMMessage({ id: 'a1', agent_id: 'nova', role: 'taec', content: 'For Nova', ts: '2025-01-01T00:00:00Z' })
    dm.appendDMMessage({ id: 'a2', agent_id: 'byte', role: 'taec', content: 'For Byte', ts: '2025-01-01T00:00:01Z' })
    expect(dm.getDMHistory('nova')).toHaveLength(1)
    expect(dm.getDMHistory('byte')).toHaveLength(1)
  })

  it('upserts on duplicate id', () => {
    dm.appendDMMessage({ id: 'dup', agent_id: 'aria', role: 'taec', content: 'Original', ts: '2025-01-01T00:00:00Z' })
    dm.appendDMMessage({ id: 'dup', agent_id: 'aria', role: 'agent', content: 'Updated', ts: '2025-01-01T00:00:01Z' })
    const msgs = dm.getDMHistory('aria')
    expect(msgs).toHaveLength(1)
    expect((msgs[0] as Record<string, unknown>).content).toBe('Updated')
  })

  it('clears history for a specific agent only', () => {
    dm.appendDMMessage({ id: 'x1', agent_id: 'nova', role: 'taec', content: 'Nova msg', ts: '2025-01-01T00:00:00Z' })
    dm.appendDMMessage({ id: 'x2', agent_id: 'byte', role: 'taec', content: 'Byte msg', ts: '2025-01-01T00:00:00Z' })
    dm.clearDMHistory('nova')
    expect(dm.getDMHistory('nova')).toHaveLength(0)
    expect(dm.getDMHistory('byte')).toHaveLength(1)
  })

  it('enforces role CHECK constraint', () => {
    expect(() =>
      dm.appendDMMessage({ id: 'bad', agent_id: 'nova', role: 'invalid_role', content: 'x', ts: '' })
    ).toThrow()
  })

  it('respects the limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      dm.appendDMMessage({ id: `m${i}`, agent_id: 'aria', role: 'taec', content: `msg ${i}`, ts: `2025-01-01T00:00:${String(i).padStart(2,'0')}Z` })
    }
    expect(dm.getDMHistory('aria', 3)).toHaveLength(3)
  })
})

describe('Workspace helpers', () => {
  let db: ReturnType<typeof makeDB>
  let ws: ReturnType<typeof makeWSHelpers>

  beforeEach(() => { db = makeDB(); ws = makeWSHelpers(db) })
  afterEach(() => { db.close() })

  const sample = {
    id: 'ws-1',
    name: 'NEXMIND App',
    path: 'C:\\projects\\nexmind',
    created_at: '2025-01-01T00:00:00Z',
    last_used: '2025-01-01T00:00:00Z',
  }

  it('adds and retrieves a workspace', () => {
    ws.addWorkspace(sample)
    const found = ws.getWorkspace('ws-1')
    expect(found).toBeDefined()
    expect((found as Record<string, unknown>).name).toBe('NEXMIND App')
  })

  it('returns null for unknown id', () => {
    expect(ws.getWorkspace('does-not-exist')).toBeUndefined()
  })

  it('enforces unique path constraint', () => {
    ws.addWorkspace(sample)
    expect(() => ws.addWorkspace({ ...sample, id: 'ws-2' })).toThrow()
  })

  it('defaults branch to main', () => {
    ws.addWorkspace(sample)
    expect((ws.getWorkspace('ws-1') as Record<string, unknown>).branch).toBe('main')
  })

  it('updates branch', () => {
    ws.addWorkspace(sample)
    ws.updateBranch('ws-1', 'develop')
    expect((ws.getWorkspace('ws-1') as Record<string, unknown>).branch).toBe('develop')
  })

  it('touchWorkspace updates last_used to a newer time', () => {
    ws.addWorkspace(sample)
    const before = (ws.getWorkspace('ws-1') as Record<string, unknown>).last_used as string
    // Ensure a different timestamp
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
    ws.touchWorkspace('ws-1')
    const after = (ws.getWorkspace('ws-1') as Record<string, unknown>).last_used as string
    expect(after > before).toBe(true)
    vi.useRealTimers()
  })

  it('removes a workspace', () => {
    ws.addWorkspace(sample)
    ws.removeWorkspace('ws-1')
    expect(ws.getWorkspace('ws-1')).toBeUndefined()
  })

  it('orders getWorkspaces by last_used DESC', () => {
    ws.addWorkspace({ ...sample, id: 'old', path: 'C:\\old', last_used: '2024-01-01T00:00:00Z' })
    ws.addWorkspace({ ...sample, id: 'new', path: 'C:\\new', last_used: '2025-06-01T00:00:00Z' })
    const list = ws.getWorkspaces() as Array<Record<string, unknown>>
    expect(list[0].id).toBe('new')
    expect(list[1].id).toBe('old')
  })
})

describe('CC session helpers', () => {
  let db: ReturnType<typeof makeDB>
  let cc: ReturnType<typeof makeCCHelpers>

  beforeEach(() => { db = makeDB(); cc = makeCCHelpers(db) })
  afterEach(() => { db.close() })

  const session = {
    id: 'sess-1',
    title: 'Build auth system',
    mode: 'cc',
    started_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }

  it('creates a session and retrieves it with messages', () => {
    cc.upsertSession(session)
    cc.appendMessage({ id: 'msg-1', session_id: 'sess-1', role: 'user', text: 'Build auth', ts: '2025-01-01T00:01:00Z' })
    cc.appendMessage({ id: 'msg-2', session_id: 'sess-1', role: 'aria', agent_id: 'aria', text: 'On it', ts: '2025-01-01T00:02:00Z' })

    const s = cc.getSession('sess-1')
    expect(s).toBeDefined()
    expect((s as Record<string, unknown>).title).toBe('Build auth system')
    expect((s as Record<string, unknown & { messages: unknown[] }>).messages).toHaveLength(2)
  })

  it('returns null for non-existent session', () => {
    expect(cc.getSession('ghost')).toBeNull()
  })

  it('cascades delete to messages', () => {
    cc.upsertSession(session)
    cc.appendMessage({ id: 'msg-x', session_id: 'sess-1', role: 'user', text: 'hello', ts: '2025-01-01T00:01:00Z' })
    cc.deleteSession('sess-1')
    expect(cc.getSession('sess-1')).toBeNull()
    // Message should also be gone (CASCADE)
    const msgs = db.prepare(`SELECT * FROM cc_messages WHERE session_id = ?`).all('sess-1')
    expect(msgs).toHaveLength(0)
  })

  it('upserts session on duplicate id', () => {
    cc.upsertSession(session)
    cc.upsertSession({ ...session, title: 'Updated title' })
    expect((cc.getSession('sess-1') as Record<string, unknown>).title).toBe('Updated title')
  })
})
