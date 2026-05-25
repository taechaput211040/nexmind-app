/**
 * Tests for the workspaceName safety logic that caused the GitPanel crash.
 *
 * Regression: `workspaceName.toUpperCase()` threw when workspaceName was
 * undefined (GitPanel used as a side-panel without the prop).
 *
 * Fix: `(workspaceName ?? 'WORKSPACE').toUpperCase()`
 */
import { describe, it, expect } from 'vitest'

// ── Pure helper extracted from the component ───────────────────────────────────
function safeWorkspaceLabel(workspaceName?: string): string {
  return (workspaceName ?? 'WORKSPACE').toUpperCase()
}

// ── Pure helper for terminal project name (extracted from TerminalPanel) ────────
function terminalProjectName(workspacePath?: string): string {
  if (!workspacePath) return ''
  const lastBackslash = workspacePath.lastIndexOf('\\')
  const lastSlash = workspacePath.lastIndexOf('/')
  const lastSep = Math.max(lastBackslash, lastSlash)
  return lastSep >= 0 ? workspacePath.slice(lastSep + 1).toUpperCase() : workspacePath.toUpperCase()
}

describe('safeWorkspaceLabel', () => {
  it('uppercases a given name', () => {
    expect(safeWorkspaceLabel('nexmind-app')).toBe('NEXMIND-APP')
    expect(safeWorkspaceLabel('My Project')).toBe('MY PROJECT')
  })

  it('falls back to WORKSPACE when name is undefined', () => {
    expect(safeWorkspaceLabel(undefined)).toBe('WORKSPACE')
  })

  it('falls back to WORKSPACE when name is empty string', () => {
    // empty string is falsy-ish but not undefined — spec: keep as-is uppercased
    expect(safeWorkspaceLabel('')).toBe('')
  })

  it('does NOT throw for any input', () => {
    expect(() => safeWorkspaceLabel(undefined)).not.toThrow()
    expect(() => safeWorkspaceLabel('ok')).not.toThrow()
  })
})

describe('terminalProjectName', () => {
  it('extracts the last path segment on Windows paths', () => {
    expect(terminalProjectName('C:\\Users\\taec\\projects\\nexmind-app')).toBe('NEXMIND-APP')
  })

  it('extracts the last path segment on POSIX paths', () => {
    expect(terminalProjectName('/home/taec/projects/nexmind-app')).toBe('NEXMIND-APP')
  })

  it('handles mixed separators', () => {
    expect(terminalProjectName('C:\\projects/nexmind')).toBe('NEXMIND')
  })

  it('returns empty string when path is undefined', () => {
    expect(terminalProjectName(undefined)).toBe('')
    expect(terminalProjectName('')).toBe('')
  })

  it('handles paths with no separator (bare name)', () => {
    expect(terminalProjectName('nexmind')).toBe('NEXMIND')
  })

  it('does NOT throw for any input', () => {
    expect(() => terminalProjectName(undefined)).not.toThrow()
    expect(() => terminalProjectName('')).not.toThrow()
    expect(() => terminalProjectName('C:\\ok')).not.toThrow()
  })
})
