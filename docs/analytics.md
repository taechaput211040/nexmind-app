# /analytics Redesign — Design Spec & Flow

> **Owner:** REX (architect) · **Implementers:** PIXEL (theme/tokens), NOVA (UI/components)
> **Route:** `src/app/analytics/page.tsx` → `src/components/analytics/AnalyticsDashboard.tsx`
> **Goal:** Re-skin `/analytics` to the **Futuristic Arcane — Dark Nebula** theme so it
> matches the dashboard (`src/app/page.tsx`) and the rest of the site. **Functionality
> stays identical** — this is a visual + structural re-skin, not a data change.

---

## 1. Why (gap analysis)

`/analytics` is on the **old** look. The dashboard (`page.tsx`) is the **canonical** look.

| Aspect | Dashboard (`page.tsx`) — TARGET | `/analytics` now — TO FIX |
|--------|--------------------------------|---------------------------|
| Page wrapper | `var(--nebula-bg)` + 3 ambient orbs + centered `maxWidth:1340` | bare `min-h-screen p-4` — no nebula, no orbs, no container |
| Cards | inline `glass` object → `--magic-glass`, `--magic-glass-border`, `--magic-glow-soft`, blur, top accent stripe | `className="glass-card"` — **undefined in globals.css → no glass at all** |
| KPI cards | `StatCard` — animated counter, LIVE badge, accent glow, hover lift, corner blob | `KpiCard` — flat, 2px dot, no animation |
| Headings | Space Mono eyebrow + gradient `--magic-grad-heading` H1 | plain `text-3xl`, single cyan eyebrow |
| Color tokens | `--magic-*`, `--arcane-*`, `--cmd-*` | legacy `--muted`, `--gold`, `--rim`, `--hover` |
| Panels | top accent gradient stripe per panel | none |

**Root bug:** `.glass-card` is referenced in 6 files but **never defined** in `globals.css`.
The fix is NOT to define `.glass-card` — it is to migrate analytics onto the shared
`magic-glass` system (inline object or `.magic-glass` utility class) like the dashboard.

---

## 2. Target layout (UI sections)

```
┌──────────────────────────────────────────────────────────────────────┐
│  nebula-bg  +  3 ambient orbs (fixed, blurred, drifting)               │
│  ┌────────────────────  maxWidth 1340, centered  ───────────────────┐ │
│  │ HEADER                                                            │ │
│  │  ⚡ NEXMIND · THE LEDGER (Space Mono eyebrow)                      │ │
│  │  Analytics  (gradient heading)            [ 7d | 30d | 90d ] ◄ range│
│  │  sub: Revenue, traffic & conversion …       updated HH:MM         │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ KPI ROW   grid auto-fit minmax(230px,1fr)                         │ │
│  │  [Kpi]  [Kpi]  [Kpi]  [Kpi]   ← StatCard look + ▲/▼ delta         │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ CHARTS ROW   grid  minmax(0,1fr) minmax(0,1.15fr)  (collapses 1col)│ │
│  │  ┌───────── glass panel ─────────┐ ┌──── glass panel ────┐        │ │
│  │  │ ░ purple top stripe           │ │ ░ cyan top stripe   │        │ │
│  │  │ Revenue & Traffic Trend       │ │ Revenue by Channel  │        │ │
│  │  │ <LineChart>                   │ │ <BarChart>          │        │ │
│  │  └───────────────────────────────┘ └─────────────────────┘        │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ TABLE   glass panel (░ gold top stripe)                           │ │
│  │  Channel Performance              [Filters]      updated …        │ │
│  │  <DataTable> (sortable, status pills)                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Section order (top→bottom): **Header+Range → KPI row → Charts row → Table**.
Same data, same widgets — just re-skinned and wrapped in the nebula shell.

---

## 3. Data flow (unchanged — re-skin only)

```
range (client state, AnalyticsDashboard)
   │  fetch(`/api/analytics?range=${range}`)        ← refetch on range change
   ▼
GET /api/analytics ──► lib/analytics.buildAnalytics(range)
   ▼
AnalyticsData { kpis, timeseries, breakdown, table, updatedAt }
   ▼
AnalyticsDashboard distributes:
   kpis       → KpiCard[]    (KPI row)
   timeseries → LineChart    (trend panel, wider)
   breakdown  → BarChart     (channel panel)
   table      → DataTable    (sortable client-side)
```

No API change. No `types.ts` change. The redesign touches only **presentation**.

---

## 4. Component structure (final)

```
src/app/analytics/page.tsx                 server shell (unchanged)
src/components/analytics/
  AnalyticsDashboard.tsx   [NOVA]  ← shell: nebula bg, orbs, container, header, grid
  KpiCard.tsx              [NOVA]  ← re-skin to StatCard language (+keep delta)
  LineChart.tsx            [NOVA]  ← wrap in glass panel w/ top stripe (chart SVG as-is)
  BarChart.tsx             [NOVA]  ← same panel treatment
  DataTable.tsx            [NOVA]  ← swap legacy tokens → cmd/magic tokens
  types.ts                         (no change)
```

Shared visual primitives (PIXEL owns; NOVA consumes):
- `glass` style object (copy the dashboard's, `page.tsx:25-32`) **or** `.magic-glass` class.
- Panel top-stripe snippet (`page.tsx:112` / `:166`).
- Ambient orb block (`page.tsx:54-57`).

---

## 5. PIXEL spec — theme & tokens

**Scope:** decide the token mapping; do NOT restructure JSX. No raw hex / rgb / hsl.

1. **Confirm token migration table** (legacy → canonical):

   | Legacy (remove) | Canonical (use) |
   |-----------------|-----------------|
   | `var(--muted)`  | `var(--cmd-text-soft)` |
   | `var(--dim)`    | `var(--cmd-label)` / `var(--arcane-rune)` |
   | `var(--text)`   | `var(--cmd-text)` |
   | `var(--rim)`    | `var(--magic-glass-border)` / `var(--cmd-divider)` |
   | `var(--hover)`  | `var(--magic-glass)` |
   | `var(--gold)`   | `var(--arcane-gold)` (+ `--magic-glow-gold`) |
   | `var(--cyan)`   | `var(--magic-cyan)` (+ `--magic-text-glow`) |
   | `var(--green)`  | `var(--arcane-emerald)` |
   | `var(--red)`    | keep `var(--red)` (no arcane equivalent) |
   | `${color}22` (hex-alpha) | `color-mix(in srgb, <color> 14%, transparent)` |

2. **Range toggle** active state: `background: var(--arcane-gold)`, text `var(--arcane-void)`,
   add `box-shadow: var(--magic-glow-gold)`. Inactive: `var(--cmd-text-soft)`.

3. **Panel accent assignment** (for top stripes): Trend = `--magic-purple`,
   Breakdown = `--magic-cyan`, Table = `--arcane-gold`. (Mirrors dashboard rhythm.)

4. **No new globals.css vars needed** — all tokens already exist. Do **not** add a
   `.glass-card` definition; analytics moves to `magic-glass`. Optionally leave a one-line
   note that the other 4 files still using `.glass-card` are out of scope here.

Deliverable: this table confirmed/edited in §5 → NOVA applies it verbatim.

---

## 6. NOVA spec — components

**Scope:** apply PIXEL's tokens + the dashboard structural patterns. Keep all data wiring,
fetch logic, range state, and sort logic exactly as-is. Read each file fully before editing.

### 6.1 `AnalyticsDashboard.tsx`
- Wrap return in the dashboard shell: `<div>` with `background: var(--nebula-bg)`,
  `padding: '32px clamp(20px,4vw,48px)'`, `position:relative`, `overflow:hidden`.
- Add the 3 ambient orbs (copy `page.tsx:54-57`).
- Inner container: `position:relative; zIndex:1; maxWidth:1340; margin:0 auto;
  display:flex; flexDirection:column; gap:24`.
- Header: Space Mono eyebrow row (`⚡ NEXMIND` · `THE LEDGER`), gradient H1 "Analytics"
  using `var(--magic-grad-heading)` clip, soft sub-line in `var(--cmd-text-soft)`.
  Keep the range toggle on the right (PIXEL-styled).
- Define the `glass` const object (copy `page.tsx:25-32`); apply to chart + table panels.
- Loading/empty states: `var(--cmd-label)` / `var(--red)`.

### 6.2 `KpiCard.tsx`
- Re-skin to the `StatCard` visual language: glass bg, accent-tinted border via
  `color-mix`, top accent stripe, corner glow blob, hover lift.
- **Keep the KPI-specific bits** StatCard lacks: the ▲/▼/▬ trend arrow + `delta% vs prev`
  line, colored by trend (`up→--arcane-emerald`, `down→--red`, `flat→--cmd-label`).
- Value text uses `kpi.color` + matching glow, Space Mono, ~32–38px.
- Animated count-up is optional (nice-to-have; reuse StatCard's `Counter` if cheap).
- Make it `'use client'` only if you add animation/hover state.

### 6.3 `LineChart.tsx` / `BarChart.tsx`
- Charts render inside glass panels created by the dashboard; add the **top accent stripe**
  per §5.3 to each panel. SVG drawing logic untouched — only swap stroke/fill color tokens
  to `--magic-cyan` / `--magic-purple` / `--arcane-gold` and grid lines to `--cmd-divider`.

### 6.4 `DataTable.tsx`
- Replace legacy tokens per §5.1. Header text `--cmd-label`, row text `--cmd-text`,
  revenue cell `--arcane-gold`, agent cell `--magic-cyan`, row borders `--cmd-divider`.
- Status pills: `active→--arcane-emerald`, `paused→--cmd-label`, `review→--arcane-gold`,
  bg via `color-mix(... 14%, transparent)`.

---

## 7. Execution order

1. **PIXEL** confirms §5 token table (types/contracts: none — pure design decision).
2. **NOVA** edits in order: `KpiCard` → `LineChart` → `BarChart` → `DataTable` →
   `AnalyticsDashboard` (shell last, so panels exist to drop in).
3. After each file: `npx tsc --noEmit`, fix errors before next.
4. Final `npx tsc --noEmit` across project — must be clean.
5. `graphify update .`

## 8. Constraints (hard rules)
- **Colors via `var(--…)` only** — never hex/rgb/hsl. Use `color-mix` for tints.
- Every card/panel uses the **magic-glass** system (bg + border + glow + blur + radius).
- `page.tsx` analytics shell stays a server component; interactive children are `'use client'`.
- **No data/contract/API change** — `types.ts` and `/api/analytics` are frozen here.
- Preserve sort, range-fetch, loading/empty behaviour exactly.
```
