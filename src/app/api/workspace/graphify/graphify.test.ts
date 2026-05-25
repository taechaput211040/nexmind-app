/**
 * Tests for graphify route utility logic.
 * We extract and test the pure functions — no real child_process calls.
 */
import { describe, it, expect } from 'vitest'

// ── Pure helpers extracted from the route (copy for testability) ───────────────

/** Parse first readable error line from graphify output. */
function parseGraphifyError(output: string, maxLen = 120): string {
  const firstLine = output.split('\n').find(l => l.trim()) ?? output
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + '…' : firstLine
}

/** Decide whether to run full build or incremental update. */
function resolveGraphifyArgs(hasExistingGraph: boolean): string[] {
  return hasExistingGraph
    ? ['.', '--update']
    : ['.', '--backend', 'claude']
}

/** Determine if a run failure was a "command not found" error. */
function isCommandNotFound(output: string): boolean {
  return output.includes('not found') || output.includes('command not found')
}

/** Extract node summary from GRAPH_REPORT.md content. */
function extractGraphSummary(reportContent: string): string {
  const m = reportContent.match(/^- (\d+ nodes[^\n]+)$/m)
  return m ? m[1] : ''
}

/** Extract commit hash from GRAPH_REPORT.md content. */
function extractBuiltAtCommit(reportContent: string): string {
  const m = reportContent.match(/Built from commit: `([a-f0-9]+)`/)
  return m ? m[1] : ''
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseGraphifyError', () => {
  it('returns the first non-empty line', () => {
    const output = '\nerror: no LLM API key found\nmore info here'
    expect(parseGraphifyError(output)).toBe('error: no LLM API key found')
  })

  it('truncates long lines and appends ellipsis', () => {
    const longLine = 'e'.repeat(200)
    const result = parseGraphifyError(longLine)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBe(121) // 120 chars + '…'
  })

  it('returns the raw output when every line is empty', () => {
    expect(parseGraphifyError('')).toBe('')
  })

  it('preserves short lines as-is', () => {
    expect(parseGraphifyError('short error')).toBe('short error')
  })
})

describe('resolveGraphifyArgs', () => {
  it('uses --backend claude for first-time build', () => {
    const args = resolveGraphifyArgs(false)
    expect(args).toContain('--backend')
    expect(args).toContain('claude')
    expect(args).not.toContain('--update')
  })

  it('uses --update for incremental build', () => {
    const args = resolveGraphifyArgs(true)
    expect(args).toContain('--update')
    expect(args).not.toContain('--backend')
    expect(args).not.toContain('claude')
  })

  it('always starts with "."', () => {
    expect(resolveGraphifyArgs(false)[0]).toBe('.')
    expect(resolveGraphifyArgs(true)[0]).toBe('.')
  })
})

describe('isCommandNotFound', () => {
  it('detects "not found" message', () => {
    expect(isCommandNotFound('graphify: not found')).toBe(true)
  })

  it('detects "command not found" message', () => {
    expect(isCommandNotFound('bash: command not found: graphify')).toBe(true)
  })

  it('returns false for other errors', () => {
    expect(isCommandNotFound('error: no LLM API key found')).toBe(false)
    expect(isCommandNotFound('EACCES: permission denied')).toBe(false)
  })
})

describe('extractGraphSummary', () => {
  const sampleReport = `
# GRAPH REPORT
Built from commit: \`abc1234def5678\`

## Summary
- 142 nodes, 89 edges, 12 files
`

  it('extracts the node summary line', () => {
    expect(extractGraphSummary(sampleReport)).toBe('142 nodes, 89 edges, 12 files')
  })

  it('returns empty string when no summary line', () => {
    expect(extractGraphSummary('# No summary here')).toBe('')
  })
})

describe('extractBuiltAtCommit', () => {
  const sampleReport = `
# GRAPH REPORT
Built from commit: \`abc1234def5678\`
`

  it('extracts the commit hash', () => {
    expect(extractBuiltAtCommit(sampleReport)).toBe('abc1234def5678')
  })

  it('returns empty string when no commit line', () => {
    expect(extractBuiltAtCommit('# No commit here')).toBe('')
  })
})
