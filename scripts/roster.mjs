// View the NEXMIND agent team in the terminal as a colored table.
// Usage: node scripts/roster.mjs            (all, grouped by department)
//        node scripts/roster.mjs <dept>     (filter, e.g. "Trading")
//        node scripts/roster.mjs --no-color (plain, e.g. for piping to a file)
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = await readFile(join(root, 'src/data/agents.ts'), 'utf8')

// Pull each agent object literal out of the `agents` array (AST-free, regex-based).
const block = src.slice(src.indexOf('export const agents'), src.indexOf('export const depts'))
const grab = (obj, key) => (obj.match(new RegExp(`${key}\\s*:\\s*'([^']*)'`)) ?? [])[1] ?? ''
const agents = [...block.matchAll(/\{([^{}]*?id\s*:[^{}]*?)\}/g)].map((m) => ({
  name: grab(m[1], 'name'), title: grab(m[1], 'title'), dept: grab(m[1], 'dept'),
  emoji: grab(m[1], 'emoji'), tier: grab(m[1], 'tier'), status: grab(m[1], 'status'),
}))
const depts = [...src.matchAll(/name\s*:\s*'([^']+)'\s*,\s*color[^}]*?icon\s*:\s*'([^']+)'/g)]
  .map((m) => ({ name: m[1], icon: m[2] }))

// ── styling ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const noColor = args.includes('--no-color') || !process.stdout.isTTY
const filter = args.find((a) => !a.startsWith('--'))?.toLowerCase()
const c = (code, s) => (noColor ? s : `\x1b[${code}m${s}\x1b[0m`)
const dim = (s) => c('2', s)
const bold = (s) => c('1', s)
const statusDot = { online: c('32', '●'), busy: c('33', '●'), idle: c('90', '○'), offline: c('31', '○') }
const tierTag = {
  LEGENDARY: c('35', 'LEGENDARY'), EPIC: c('34', 'EPIC '), RARE: c('36', 'RARE '),
}
// Width helper: count emoji/wide chars as 2 columns so borders stay aligned.
const w = (s) => [...s].reduce((n, ch) => {
  if (/[\u{FE0E}\u{FE0F}\u{200D}]/u.test(ch)) return n + 0 // variation selectors / ZWJ render zero-width
  return n + (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}⁉‼]/u.test(ch) ? 2 : 1)
}, 0)
const pad = (s, len) => s + ' '.repeat(Math.max(0, len - w(s)))

// ── columns ──────────────────────────────────────────────────────────
const COL = { name: 9, title: 21, tier: 11, status: 8 }
const inner = COL.name + COL.title + COL.tier + COL.status + 3 // +3 separators " │ "
const line = (l, m, r) => l + '─'.repeat(inner + 2) + r
const row = (cells) => '│ ' + cells.join(' ') + ' │'

const order = filter ? depts.filter((d) => d.name.toLowerCase().includes(filter)) : depts
const total = agents.length

console.log()
console.log(bold(`  NEXMIND Agent Team`) + dim(`  ·  ${total} agents · ${depts.length} departments`))

for (const d of order) {
  const team = agents.filter((a) => a.dept === d.name)
  if (!team.length) continue
  console.log(line('┌', '', '┐'))
  console.log(row([pad(`${d.icon}  ${bold(d.name)}`, inner - w(`(${team.length})`) - 1) + dim(`(${team.length})`)]))
  console.log(line('├', '', '┤'))
  for (const a of team) {
    console.log(row([
      pad(`${a.emoji} ${a.name}`, COL.name),
      dim(pad(a.title, COL.title)),
      pad(tierTag[a.tier] ?? a.tier, COL.tier),
      pad(`${statusDot[a.status] ?? '○'} ${a.status}`, COL.status),
    ]))
  }
  console.log(line('└', '', '┘'))
}
console.log()
