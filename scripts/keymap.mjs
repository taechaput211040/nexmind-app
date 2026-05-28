#!/usr/bin/env node
// Chroma-key a codex imagegen output to a transparent PNG sprite, then NORMALISE
// it to the exact canvas + content placement of a reference sprite so every
// agent renders at a consistent size in the map engine.
//
// Why normalise: REX/NOVA were authored as padded squares (char = 512², iso
// unit = 640²) with the body filling ~84% of the height and the feet/desk-base
// pinned near the bottom. A naive trim-to-content crop produces wildly
// different aspect ratios (a tall-thin character vs a square one), and the
// engine scales by width → characters end up different heights. So instead of
// trimming, we re-seat the new content inside the reference's content rectangle
// on a canvas of the reference's size.
//
// Usage:
//   node scripts/keymap.mjs <input> <output> [--bg=RRGGBB] [--ref=NAME]
//                                            [--tol=N] [--feather=N] [--flip]
//
//   <input>     source PNG (e.g. tmp/imagegen/char-byte-stand-source.png)
//   <output>    bare sprite name (lands in public/assets/map/<name>.png) or path
//   --bg        backdrop colour to key out. Omit to auto-sample the 4 corners.
//   --ref       reference sprite name for canvas/placement. Default auto-picked
//               by output prefix: char-* → char-rex-stand, work-* → work-rex,
//               desk-* → desk-rex. Pass --ref=none to skip normalisation (raw
//               keyed + tight-trim, the old behaviour).
//   --flip      mirror horizontally (use when a walk sprite faces the wrong way)
//   --tol       colour-distance 0..441 for full transparency (def 70)
//   --feather   extra band above --tol fading alpha 1→0 (def 30)
//
// Examples:
//   node scripts/keymap.mjs tmp/imagegen/char-byte-stand-source.png char-byte-stand --bg=ff00ff
//   node scripts/keymap.mjs tmp/imagegen/work-zeta-source.png work-zeta --bg=ff00ff

import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAP_DIR = path.resolve(__dirname, '..', 'public', 'assets', 'map')

function parseArgs(argv) {
  const pos = [], opt = {}
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    if (m) opt[m[1]] = m[2] ?? true
    else pos.push(a)
  }
  return { pos, opt }
}

const hexToRgb = hex => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
const dist = (r, g, b, R, G, B) => Math.sqrt((r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2)

// Key the chroma backdrop to alpha. Returns { data, width, height, channels }.
async function keyToAlpha(input, bgOpt, tol, feather) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let bg
  if (bgOpt && bgOpt !== true) {
    bg = hexToRgb(bgOpt)
  } else {
    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
      .map(([x, y]) => { const i = (y * width + x) * channels; return [data[i], data[i + 1], data[i + 2]] })
    bg = [0, 1, 2].map(c => { const v = corners.map(p => p[c]).sort((a, b) => a - b); return Math.round((v[1] + v[2]) / 2) })
  }
  for (let p = 0; p < width * height; p++) {
    const i = p * channels
    const d = dist(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2])
    if (d <= tol) data[i + 3] = 0
    else if (d <= tol + feather) data[i + 3] = Math.round(((d - tol) / feather) * data[i + 3])
  }
  return { data, width, height, channels, bg }
}

// Tight content bbox of an RGBA raw buffer (alpha > 20).
function contentBox(data, width, height, channels) {
  let x0 = width, y0 = height, x1 = 0, y1 = 0
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * channels + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

function pickRef(outName) {
  if (outName.startsWith('work-')) return 'work-rex'
  if (outName.startsWith('desk-')) return 'desk-rex'
  if (outName.startsWith('char-')) return 'char-rex-stand'
  return null
}

async function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2))
  const [input, outArg] = pos
  if (!input || !outArg) {
    console.error('usage: node scripts/keymap.mjs <input> <output> [--bg=RRGGBB] [--ref=NAME] [--flip] [--tol=N] [--feather=N]')
    process.exit(1)
  }
  const outName = path.basename(outArg).replace(/\.png$/, '')
  const outPath = /[\\/]/.test(outArg) || outArg.endsWith('.png')
    ? path.resolve(outArg.endsWith('.png') ? outArg : outArg + '.png')
    : path.join(MAP_DIR, outName + '.png')

  const tol = Number(opt.tol ?? 70)
  const feather = Number(opt.feather ?? 30)

  const keyed = await keyToAlpha(input, opt.bg, tol, feather)
  let { data, width, height, channels, bg } = keyed
  const box = contentBox(data, width, height, channels)

  // Pull the keyed content out as a standalone buffer (optionally mirrored).
  let content = sharp(data, { raw: { width, height, channels } })
    .extract({ left: box.x0, top: box.y0, width: box.w, height: box.h })
  if (opt.flip) content = content.flop()
  const contentPng = await content.png().toBuffer()

  const refName = opt.ref && opt.ref !== true ? opt.ref : pickRef(outName)

  if (!refName || refName === 'none') {
    // Raw keyed + tight crop, no normalisation.
    await sharp(contentPng).toFile(outPath)
    console.log(`keyed bg rgb(${bg.join(',')}) — no ref, tight-cropped → ${outPath}`)
    return
  }

  // Reference geometry: canvas size + content rectangle to seat the new sprite in.
  const refPath = path.join(MAP_DIR, refName + '.png')
  const refRaw = await sharp(refPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const rbox = contentBox(refRaw.data, refRaw.info.width, refRaw.info.height, refRaw.info.channels)
  const TW = refRaw.info.width, TH = refRaw.info.height
  const refCenterX = (rbox.x0 + rbox.x1) / 2
  const refBottom = rbox.y1

  // Scale new content so its HEIGHT matches the reference content height; if that
  // makes it wider than the canvas, fall back to scaling by width.
  let scaledH = rbox.h
  let scaledW = Math.round(box.w * (scaledH / box.h))
  if (scaledW > TW) { scaledW = TW; scaledH = Math.round(box.h * (scaledW / box.w)) }
  const resized = await sharp(contentPng).resize(scaledW, scaledH, { fit: 'fill' }).png().toBuffer()

  // Seat it: horizontally centred on the reference centre, bottom pinned to the
  // reference's content bottom (feet / desk base land where the engine expects).
  let left = Math.round(refCenterX - scaledW / 2)
  let top = Math.round(refBottom - scaledH)
  left = Math.max(0, Math.min(left, TW - scaledW))
  top = Math.max(0, Math.min(top, TH - scaledH))

  await sharp({ create: { width: TW, height: TH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(outPath)

  console.log(`keyed rgb(${bg.join(',')}) → ${TW}x${TH} (ref ${refName}, content ${scaledW}x${scaledH} @ ${left},${top}) → ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
