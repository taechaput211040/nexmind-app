#!/usr/bin/env node
// Slice a 2-frame walk-cycle SHEET (both frames drawn together by codex so they
// share scale + baseline) into two registered sprites: char-<id>-walk.png and
// char-<id>-walk2.png.
//
// Registration is the whole point: the engine alternates the two frames, so the
// torso/head must stay put while only the legs/arms move. We therefore use a
// SINGLE shared scale (from the contact frame) and align both frames by a stable
// head-center-x and the foot baseline — NOT each frame's own bbox (which changes
// as a leg lifts and would make the body bounce).
//
// Output matches char-rex-stand geometry (512² canvas, content height ~423,
// feet pinned near the bottom) so walk frames line up with the stand sprite too.
//
// Usage:
//   node scripts/walksheet.mjs <sheet> <id> [--bg=RRGGBB] [--flip]
//   e.g. node scripts/walksheet.mjs tmp/imagegen/zeta-walksheet-source.png zeta --bg=ff00ff

import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAP_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'map')
const REF = 'char-rex-stand' // geometry target

function parseArgs(argv) {
  const pos = [], opt = {}
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    if (m) opt[m[1]] = m[2] ?? true; else pos.push(a)
  }
  return { pos, opt }
}
const hexToRgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] }
const cdist = (r, g, b, R, G, B) => Math.sqrt((r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2)

async function keyRaw(input, bgOpt, tol = 70, feather = 30) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let bg
  if (bgOpt && bgOpt !== true) bg = hexToRgb(bgOpt)
  else {
    const cs = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
      .map(([x, y]) => { const i = (y * width + x) * channels; return [data[i], data[i + 1], data[i + 2]] })
    bg = [0, 1, 2].map(c => { const v = cs.map(p => p[c]).sort((a, b) => a - b); return Math.round((v[1] + v[2]) / 2) })
  }
  for (let p = 0; p < width * height; p++) {
    const i = p * channels
    const d = cdist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2])
    if (d <= tol) data[i + 3] = 0
    else if (d <= tol + feather) data[i + 3] = Math.round(((d - tol) / feather) * data[i + 3])
  }
  return { data, width, height, channels, bg }
}

// Does column x have any opaque pixel? Used to find the gap between the 2 frames.
function colHasContent(data, width, height, channels, x) {
  for (let y = 0; y < height; y++) if (data[(y * width + x) * channels + 3] > 20) return true
  return false
}
function bboxIn(data, width, height, channels, xs, xe) {
  let x0 = xe, y0 = height, x1 = xs, y1 = 0
  for (let y = 0; y < height; y++)
    for (let x = xs; x < xe; x++)
      if (data[(y * width + x) * channels + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}
// Stable horizontal anchor: centre of content in the top `frac` of the body
// (the head/shoulders, which don't swing during a walk).
function headCenter(data, width, channels, box, frac = 0.18) {
  const yEnd = box.y0 + Math.max(2, Math.round(box.h * frac))
  let xmin = box.x1, xmax = box.x0
  for (let y = box.y0; y < yEnd; y++)
    for (let x = box.x0; x <= box.x1; x++)
      if (data[(y * width + x) * channels + 3] > 20) { if (x < xmin) xmin = x; if (x > xmax) xmax = x }
  return (xmin + xmax) / 2
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2))
  const [sheet, id] = pos
  if (!sheet || !id) { console.error('usage: node scripts/walksheet.mjs <sheet> <id> [--bg=RRGGBB] [--flip]'); process.exit(1) }

  let keyed = await keyRaw(sheet, opt.bg)
  // Flip the whole sheet first if requested (keeps frame A = left visually).
  if (opt.flip) {
    const flopped = await sharp(keyed.data, { raw: { width: keyed.width, height: keyed.height, channels: keyed.channels } })
      .flop().raw().toBuffer({ resolveWithObject: true })
    keyed = { ...keyed, data: flopped.data }
  }
  const { data, width, height, channels } = keyed

  // Segment the sheet into frames by transparent vertical gaps — supports any
  // frame count (2, 4, ...). A run of opaque columns = one frame.
  const minFrameW = Math.max(8, Math.round(width * 0.03))
  let segs = []
  let runStart = -1
  for (let x = 0; x <= width; x++) {
    const has = x < width && colHasContent(data, width, height, channels, x)
    if (has && runStart < 0) runStart = x
    else if (!has && runStart >= 0) {
      if (x - runStart >= minFrameW) segs.push([runStart, x])
      runStart = -1
    }
  }
  // When codex leaves no clear gap, frames merge. If --frames=N is given and the
  // gap split disagrees, fall back to N equal columns (a 4:1 sheet is evenly
  // spaced) and bbox within each column.
  // Per-column opaque-pixel count — used to find the true gap (valley) between
  // two figures that touched and merged into one wide segment.
  const colCount = x => { let n = 0; for (let y = 0; y < height; y++) if (data[(y * width + x) * channels + 3] > 20) n++; return n }
  // Split [s,e] into n sub-frames at the n-1 lowest-density columns (the actual
  // gaps between touching characters), not by geometry — handles uneven widths.
  function valleySplit(s, e, n) {
    const cuts = []
    for (let k = 1; k < n; k++) {
      const lo = Math.round(s + (k - 0.32) * (e - s) / n), hi = Math.round(s + (k + 0.32) * (e - s) / n)
      let bx = Math.round(s + k * (e - s) / n), bv = Infinity
      for (let x = lo; x <= hi; x++) { const v = colCount(x); if (v < bv) { bv = v; bx = x } }
      cuts.push(bx)
    }
    const pts = [s, ...cuts, e], out = []
    for (let i = 0; i < pts.length - 1; i++) out.push([pts[i], pts[i + 1]])
    return out
  }

  // A frame whose neighbour touched it has no gap and reads as one wide segment.
  // Split any segment much wider than the median at its internal valleys.
  if (segs.length >= 2) {
    const widths = segs.map(([s, e]) => e - s).sort((a, b) => a - b)
    const med = widths[Math.floor(widths.length / 2)]
    const expanded = []
    for (const [s, e] of segs) {
      const n = Math.max(1, Math.round((e - s) / med))
      if (n > 1) { console.log(`valley-splitting wide segment [${s},${e}] into ${n}`); expanded.push(...valleySplit(s, e, n)) }
      else expanded.push([s, e])
    }
    segs = expanded
  }
  const want = opt.frames && opt.frames !== true ? Number(opt.frames) : 0
  if (want >= 2 && segs.length !== want) {
    console.log(`split found ${segs.length}, forcing ${want} equal columns over content span`)
    const minX = Math.min(...segs.map(s => s[0])), maxX = Math.max(...segs.map(s => s[1]))
    segs = Array.from({ length: want }, (_, i) => [Math.round(minX + i * (maxX - minX) / want), Math.round(minX + (i + 1) * (maxX - minX) / want)])
  }
  if (segs.length < 2) { console.error(`only ${segs.length} frame(s) found in sheet`); process.exit(1) }
  const boxes = segs.map(([s, e]) => bboxIn(data, width, height, channels, s, e))

  // Reference geometry.
  const rr = await sharp(path.join(MAP_DIR, REF + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const rb = bboxIn(rr.data, rr.info.width, rr.info.height, rr.info.channels, 0, rr.info.width)
  const TW = rr.info.width, TH = rr.info.height
  const refCenterX = (rb.x0 + rb.x1) / 2, refBottom = rb.y1, refH = rb.h

  // ONE shared scale from the TALLEST frame (legs fully extended) → all frames
  // same body size, shorter (leg-lifted) frames sit feet-aligned above baseline.
  const S = refH / Math.max(...boxes.map(b => b.h))

  const frames = boxes.map((box, i) => ({ box, out: `char-${id}-walk${i === 0 ? '' : i + 1}` }))
  for (const f of frames) {
    const b = f.box
    const buf = await sharp(data, { raw: { width, height, channels } })
      .extract({ left: b.x0, top: b.y0, width: b.w, height: b.h }).png().toBuffer()
    const sw = Math.round(b.w * S), sh = Math.round(b.h * S)
    const resized = await sharp(buf).resize(sw, sh, { fit: 'fill' }).png().toBuffer()
    const hc = headCenter(data, width, channels, b)          // sheet-space head x
    const hcLocal = (hc - b.x0) * S                            // within scaled frame
    let left = Math.round(refCenterX - hcLocal)
    let top = Math.round(refBottom - sh)                       // feet → ref baseline
    left = Math.max(Math.min(left, TW - sw), Math.min(0, TW - sw))
    top = Math.max(0, Math.min(top, TH - sh))
    await sharp({ create: { width: TW, height: TH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: resized, left, top }]).png().toFile(path.join(MAP_DIR, f.out + '.png'))
    console.log(`${f.out}: scale ${S.toFixed(3)} headX→${refCenterX} feet→${refBottom} (${sw}x${sh} @ ${left},${top})`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
