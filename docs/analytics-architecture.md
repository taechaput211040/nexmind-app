# Analytics Dashboard — Architecture Plan

> Owner: REX (architect) · Implementers: BYTE (API/server), NOVA (UI/components)
> Route: `/analytics` · Stack: Next.js 16 App Router · TS · Tailwind v4 (CSS vars only)

## 1. Goal

A single-screen analytics dashboard at `/analytics`:
KPI cards → charts (trend + breakdown) → filterable data table, with a date-range
selector. All data flows from one API surface into one client dashboard component.

## 2. Status (already built)

| Layer | File | State |
|-------|------|-------|
| Page shell | `src/app/analytics/page.tsx` | ✅ thin server shell → `<AnalyticsDashboard/>` |
| Data contracts | `src/components/analytics/types.ts` | ✅ `AnalyticsData`, `Kpi`, `TimePoint`, `BreakdownItem`, `TableRow`, `DateRange` |
| Domain logic | `src/lib/analytics.ts` | ✅ `buildAnalytics`, `buildKpis`, `buildTimeseries`, `buildTable`, `resolveRange`, `RANGE_DAYS`, `ok`/`fail` envelope, `persistSnapshot` |
| Combined API | `src/app/api/analytics/route.ts` | ✅ `GET ?range=` → raw `AnalyticsData` |
| Granular API | `src/app/api/analytics/{kpis,timeseries,aggregations}/route.ts` | ✅ `ApiResult<T>` envelopes |
| Dashboard | `src/components/analytics/AnalyticsDashboard.tsx` | ✅ fetch + layout + range toggle |
| KPI card | `src/components/analytics/KpiCard.tsx` | ✅ |
| Charts | `src/components/analytics/{LineChart,BarChart}.tsx` | ✅ SVG, no chart lib |
| Table | `src/components/analytics/DataTable.tsx` | ✅ |
| Tests | `src/lib/analytics.test.ts` + `*.test.tsx` | ✅ |

**Gap vs spec:** "filters" exists only as an inline range toggle. No discrete
filter component for channel / status / sort. That is the remaining work below.

## 3. Data flow

```
DateRange + filters (client state, AnalyticsDashboard)
        │  fetch(`/api/analytics?range=${range}`)
        ▼
GET /api/analytics  ──► lib/analytics.buildAnalytics(range)
        │                 ├ buildTimeseries(RANGE_DAYS[range]) → TimePoint[]
        │                 ├ buildKpis(timeseries, table)       → Kpi[]
        │                 ├ buildBreakdown()                   → BreakdownItem[]
        │                 └ buildTable()                       → TableRow[]
        ▼
AnalyticsData (single payload)
        ▼
AnalyticsDashboard distributes:
  kpis      → KpiCard[]      (KPI row)
  timeseries→ LineChart      (trend, lg:col-span-2)
  breakdown → BarChart       (channel breakdown)
  table     → DataTable      (filtered/sorted client-side)
```

Range = server-driven (refetch on change). Channel/status filter + sort =
client-side over `data.table` (no refetch — payload is small).

## 4. Remaining work

### 4.1 BYTE — server (optional hardening, low priority)
- Keep `/api/analytics` as the single source for the dashboard.
- No new endpoint needed for filters (client-side). If table grows large later,
  add `?channel=&status=` query params to `buildTable()` and filter server-side.
- Ensure `resolveRange` defaults invalid input to `'30d'` (already does).

### 4.2 NOVA — `Filters` component (primary remaining task)
New file: `src/components/analytics/Filters.tsx`

```ts
// Props
interface FiltersProps {
  channels: string[]            // derived from data.table (unique)
  value: FilterState
  onChange: (next: FilterState) => void
}
export interface FilterState {
  channel: string | 'all'
  status: RowStatus | 'all'
  sort: 'revenue' | 'conversions' | 'ctr'
}
```

- Render: channel `<select>`, status segmented buttons (`all|active|paused|review`),
  sort `<select>`. Style with `var(--rim)`, `var(--hover)`, `var(--gold)` (match
  the existing range toggle look). No hex.
- Add `FilterState` + `FilterField` types to `types.ts`.
- Place inside the table card header, left of the "Updated …" timestamp.

### 4.3 NOVA — wire filters into `AnalyticsDashboard.tsx`
- Add `const [filters, setFilters] = useState<FilterState>({ channel:'all', status:'all', sort:'revenue' })`.
- Derive `channels = useMemo(() => [...new Set(data.table.map(r => r.channel))], [data])`.
- Compute `visibleRows` = filter by channel/status, then sort desc by `filters.sort`.
- Pass `visibleRows` to `<DataTable rows={visibleRows} />`.
- Render `<Filters channels={channels} value={filters} onChange={setFilters} />`.

## 5. File map (final)

```
src/app/analytics/page.tsx                         server shell
src/app/api/analytics/route.ts                     GET combined snapshot   [BYTE]
src/app/api/analytics/{kpis,timeseries,aggregations}/route.ts  granular   [BYTE]
src/lib/analytics.ts                               domain builders         [BYTE]
src/components/analytics/types.ts                  contracts (+FilterState)[shared]
src/components/analytics/AnalyticsDashboard.tsx    orchestrator            [NOVA]
src/components/analytics/Filters.tsx               NEW — filter controls   [NOVA]
src/components/analytics/KpiCard.tsx               KPI card                [NOVA]
src/components/analytics/LineChart.tsx             trend chart             [NOVA]
src/components/analytics/BarChart.tsx              breakdown chart         [NOVA]
src/components/analytics/DataTable.tsx             table (rows prop)       [NOVA]
```

## 6. Constraints
- Colors via `var(--…)` only — never hex (`--gold`, `--cyan`, `--rim`, `--hover`, `--muted`, `--dim`, `--void`, `--red`).
- `'use client'` on every interactive component; `page.tsx` stays server.
- `types.ts` is the single contract — API + components import from it. Change there first.
- After TS edits run `npx tsc --noEmit`; analytics layer must stay error-free.
