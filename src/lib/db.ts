/**
 * SQLite database — nexmind.db
 * Tables: dm_messages | cc_sessions | cc_messages | task_log | workspaces
 *
 * Install once: npm install better-sqlite3
 * DB file lives at: <project-root>/data/nexmind.db
 */
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'

const DB_DIR  = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'nexmind.db')

// Ensure data/ directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

let _db: ReturnType<typeof Database> | null = null

export function getDB() {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')    // faster concurrent reads
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  return _db
}

function initSchema(db: ReturnType<typeof Database>) {
  db.exec(`
    -- DM Messages
    CREATE TABLE IF NOT EXISTS dm_messages (
      id        TEXT PRIMARY KEY,
      agent_id  TEXT NOT NULL,
      role      TEXT NOT NULL CHECK(role IN ('taec','agent')),
      content   TEXT NOT NULL,
      ts        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dm_agent_ts ON dm_messages (agent_id, ts);

    -- CC Sessions
    CREATE TABLE IF NOT EXISTS cc_sessions (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      mode         TEXT NOT NULL DEFAULT 'cc',
      started_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      task_summary TEXT
    );

    -- CC Messages (within a session)
    CREATE TABLE IF NOT EXISTS cc_messages (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES cc_sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL,
      agent_id   TEXT,
      text       TEXT NOT NULL,
      ts         TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cc_msg_session ON cc_messages (session_id, ts);

    -- Task Log
    CREATE TABLE IF NOT EXISTS task_log (
      id      TEXT PRIMARY KEY,
      ts      TEXT NOT NULL,
      title   TEXT NOT NULL,
      agents  TEXT NOT NULL,
      summary TEXT NOT NULL,
      mode    TEXT NOT NULL DEFAULT 'cc'
    );
    CREATE INDEX IF NOT EXISTS idx_task_log_ts ON task_log (ts DESC);

    -- Workspaces
    CREATE TABLE IF NOT EXISTS workspaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL UNIQUE,
      git_url    TEXT,
      branch     TEXT DEFAULT 'main',
      created_at TEXT NOT NULL,
      last_used  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_last_used ON workspaces (last_used DESC);
  `)
}

// DM helpers

export interface DMMessage {
  id: string
  agent_id: string
  role: 'taec' | 'agent'
  content: string
  ts: string
}

export function getDMHistory(agentId: string, limit = 100): DMMessage[] {
  const db = getDB()
  return db.prepare<DMMessage>(
    `SELECT * FROM dm_messages WHERE agent_id = ? ORDER BY ts ASC LIMIT ?`
  ).all(agentId, limit) as DMMessage[]
}

export function saveDMMessages(agentId: string, messages: DMMessage[]) {
  const db = getDB()
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO dm_messages (id, agent_id, role, content, ts)
    VALUES (@id, @agent_id, @role, @content, @ts)
  `)
  const insertMany = db.transaction((msgs: DMMessage[]) => {
    for (const m of msgs) upsert.run(m)
  })
  insertMany(messages.map(m => ({ ...m, agent_id: agentId })))
}

export function appendDMMessage(msg: DMMessage) {
  const db = getDB()
  db.prepare(`
    INSERT OR REPLACE INTO dm_messages (id, agent_id, role, content, ts)
    VALUES (@id, @agent_id, @role, @content, @ts)
  `).run(msg)
}

export function clearDMHistory(agentId: string) {
  getDB().prepare(`DELETE FROM dm_messages WHERE agent_id = ?`).run(agentId)
}

// CC Session helpers

export interface CCSession {
  id: string
  title: string
  mode: string
  started_at: string
  updated_at: string
  task_summary?: string
  messages?: CCMessage[]
}

export interface CCMessage {
  id: string
  session_id: string
  role: string
  agent_id?: string
  text: string
  ts: string
}

export function getCCSessions(limit = 50): CCSession[] {
  const db = getDB()
  return db.prepare<CCSession>(
    `SELECT * FROM cc_sessions ORDER BY updated_at DESC LIMIT ?`
  ).all(limit) as CCSession[]
}

export function getCCSessionWithMessages(sessionId: string): CCSession | null {
  const db = getDB()
  const session = db.prepare<CCSession>(
    `SELECT * FROM cc_sessions WHERE id = ?`
  ).get(sessionId) as CCSession | undefined
  if (!session) return null
  session.messages = db.prepare<CCMessage>(
    `SELECT * FROM cc_messages WHERE session_id = ? ORDER BY ts ASC`
  ).all(sessionId) as CCMessage[]
  return session
}

export function upsertCCSession(session: Omit<CCSession, 'messages'>) {
  getDB().prepare(`
    INSERT OR REPLACE INTO cc_sessions (id, title, mode, started_at, updated_at, task_summary)
    VALUES (@id, @title, @mode, @started_at, @updated_at, @task_summary)
  `).run({ task_summary: null, ...session })
}

export function appendCCMessage(msg: CCMessage) {
  getDB().prepare(`
    INSERT OR REPLACE INTO cc_messages (id, session_id, role, agent_id, text, ts)
    VALUES (@id, @session_id, @role, @agent_id, @text, @ts)
  `).run({ agent_id: null, ...msg })
}

export function deleteCCSession(sessionId: string) {
  getDB().prepare(`DELETE FROM cc_sessions WHERE id = ?`).run(sessionId)
}

// Task Log helpers

export interface TaskLogEntry {
  id: string
  ts: string
  title: string
  agents: string
  summary: string
  mode: string
}

export interface TaskLogEntryParsed extends Omit<TaskLogEntry, 'agents'> {
  agents: string[]
}

export function getTaskLog(limit = 100): TaskLogEntryParsed[] {
  const rows = getDB().prepare<TaskLogEntry>(
    `SELECT * FROM task_log ORDER BY ts DESC LIMIT ?`
  ).all(limit) as TaskLogEntry[]
  return rows.map(r => ({ ...r, agents: JSON.parse(r.agents) as string[] }))
}

export function addTaskLogEntry(entry: TaskLogEntryParsed) {
  getDB().prepare(`
    INSERT OR REPLACE INTO task_log (id, ts, title, agents, summary, mode)
    VALUES (@id, @ts, @title, @agents, @summary, @mode)
  `).run({ ...entry, agents: JSON.stringify(entry.agents) })
}

// Workspace helpers

export interface Workspace {
  id: string
  name: string
  path: string
  git_url?: string
  branch?: string
  created_at: string
  last_used: string
}

export function getWorkspaces(): Workspace[] {
  return getDB().prepare<Workspace>(
    `SELECT * FROM workspaces ORDER BY last_used DESC`
  ).all() as Workspace[]
}

export function getWorkspace(id: string): Workspace | null {
  return (getDB().prepare<Workspace>(
    `SELECT * FROM workspaces WHERE id = ?`
  ).get(id) as Workspace | undefined) ?? null
}

export function addWorkspace(ws: Workspace) {
  getDB().prepare(`
    INSERT OR REPLACE INTO workspaces (id, name, path, git_url, branch, created_at, last_used)
    VALUES (@id, @name, @path, @git_url, @branch, @created_at, @last_used)
  `).run({ git_url: null, branch: 'main', ...ws })
}

export function touchWorkspace(id: string) {
  getDB().prepare(
    `UPDATE workspaces SET last_used = ? WHERE id = ?`
  ).run(new Date().toISOString(), id)
}

export function updateWorkspaceBranch(id: string, branch: string) {
  getDB().prepare(
    `UPDATE workspaces SET branch = ? WHERE id = ?`
  ).run(branch, id)
}

export function removeWorkspace(id: string) {
  getDB().prepare(`DELETE FROM workspaces WHERE id = ?`).run(id)
}
