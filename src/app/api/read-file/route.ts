/**
 * POST /api/read-file
 * Accepts multipart form data with a single file.
 * Extracts text content and returns it for use as agent context.
 *
 * Supported formats:
 *   .txt .md .csv .json .yaml .yml .log .ts .js .py → plain text
 *   .xlsx .xls                                       → xlsx (npm install xlsx)
 *   .pdf                                             → pdf-parse (npm install pdf-parse)
 *   .docx                                            → mammoth (npm install mammoth)
 */
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export const runtime = 'nodejs'

// Maximum file size: 20 MB
const MAX_BYTES = 20 * 1024 * 1024

// Plain-text extensions — read directly, no library needed
const TEXT_EXTS = new Set([
  'txt', 'md', 'mdx', 'csv', 'json', 'yaml', 'yml',
  'log', 'env', 'toml', 'ini', 'xml', 'html', 'htm',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cpp', 'h',
  'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  'css', 'scss', 'sass', 'less',
  'gitignore', 'dockerignore', 'dockerfile',
])

function ext(filename: string): string {
  const base = path.basename(filename).toLowerCase()
  // Handle dotfiles like .env, .gitignore
  if (!base.includes('.') || base.startsWith('.')) return base.replace(/^\./, '')
  return base.split('.').pop() ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (max 20 MB, got ${(file.size / 1024 / 1024).toFixed(1)} MB)` }, { status: 413 })
    }

    const filename = file.name
    const fileExt = ext(filename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''
    let meta: Record<string, unknown> = { name: filename, size: file.size, ext: fileExt }

    // ── Plain text ────────────────────────────────────────────────────────────
    if (TEXT_EXTS.has(fileExt)) {
      text = buffer.toString('utf8')
      meta.type = 'text'

      // For CSV: count rows
      if (fileExt === 'csv') {
        const rows = text.split('\n').filter(l => l.trim()).length
        meta.rows = rows
      }
    }

    // ── Excel (.xlsx / .xls) ──────────────────────────────────────────────────
    else if (fileExt === 'xlsx' || fileExt === 'xls') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx') as typeof import('xlsx')
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const parts: string[] = []
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' })
          // Drop empty rows
          const rows = csv.split('\n').filter(r => r.replace(/\t/g, '').trim())
          parts.push(`## Sheet: ${sheetName}\n${rows.join('\n')}`)
        }
        text = parts.join('\n\n')
        meta.type = 'excel'
        meta.sheets = workbook.SheetNames.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("Cannot find module 'xlsx'")) {
          return NextResponse.json({
            error: 'xlsx library not installed. Run: npm install xlsx',
            install: 'npm install xlsx',
          }, { status: 501 })
        }
        throw err
      }
    }

    // ── PDF ───────────────────────────────────────────────────────────────────
    else if (fileExt === 'pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
        const result = await pdfParse(buffer)
        text = result.text
        meta.type = 'pdf'
        meta.pages = result.numpages
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("Cannot find module 'pdf-parse'")) {
          return NextResponse.json({
            error: 'pdf-parse library not installed. Run: npm install pdf-parse',
            install: 'npm install pdf-parse',
          }, { status: 501 })
        }
        throw err
      }
    }

    // ── Word (.docx) ──────────────────────────────────────────────────────────
    else if (fileExt === 'docx') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth') as { extractRawText(opts: { buffer: Buffer }): Promise<{ value: string }> }
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
        meta.type = 'word'
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("Cannot find module 'mammoth'")) {
          return NextResponse.json({
            error: 'mammoth library not installed. Run: npm install mammoth',
            install: 'npm install mammoth',
          }, { status: 501 })
        }
        throw err
      }
    }

    // ── Unsupported ───────────────────────────────────────────────────────────
    else {
      return NextResponse.json({
        error: `Unsupported file type: .${fileExt}`,
        supported: [...TEXT_EXTS, 'xlsx', 'xls', 'pdf', 'docx'].join(', '),
      }, { status: 415 })
    }

    // Truncate very long content to avoid token explosion (keep first ~60k chars ≈ ~15k tokens)
    const MAX_CHARS = 60_000
    let truncated = false
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS)
      truncated = true
    }

    return NextResponse.json({
      ok: true,
      text,
      truncated,
      meta,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
