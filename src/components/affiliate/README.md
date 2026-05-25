# Affiliate · Partner Hub — Architecture

Premium affiliate dashboard. Refactored from a single 745-line `page.tsx` into a
layered structure so data, behaviour, and presentation are independently testable.

## File map

```
src/
├─ data/
│  └─ affiliate.ts            # Data model: types + mock data + constants + getTierProgress()
├─ hooks/
│  ├─ useCountUp.ts           # Animated count-up (handles negatives, gated by `active`)
│  ├─ useClipboard.ts         # Copy + transient `copied` flag
│  └─ useRevealOnMount.ts     # Delay-based reveal flag for staggered enter animations
├─ components/affiliate/
│  ├─ index.ts                # Barrel export
│  ├─ SectionHeader.tsx       # Primitive: tag/title/subtitle
│  ├─ TierBadge.tsx           # Primitive: tier pill (sm | lg)
│  ├─ Counter.tsx             # Primitive: animated number (wraps useCountUp)
│  ├─ HeroSection.tsx         # Pitch + lifetime earnings + copyable referral link
│  ├─ StatsGrid.tsx           # 4 animated metric cards (StatCard local)
│  ├─ TierProgress.tsx        # Progress bar + tier ladder (uses getTierProgress)
│  ├─ CommissionTable.tsx     # Commission breakdown table
│  ├─ ActivityPanels.tsx      # Referrals + payout history (side-by-side grid)
│  ├─ MarketingAssets.tsx     # Filterable downloadable creatives
│  ├─ FaqSection.tsx          # Accordion
│  └─ FooterCta.tsx           # Support banner
└─ app/affiliate/page.tsx     # Composition only (~56 lines)
```

## Layers & rules

- **Data layer** (`data/affiliate.ts`) — pure, no React. Single source of truth.
  Domain types are exported (`Tier`, `Stat`, `Commission`, `Referral`, `Payout`,
  `Asset`, `Faq`) plus narrowed status unions. `getTierProgress()` is a pure
  function — the only business logic, kept side-effect free for unit testing.
- **Hooks** (`hooks/*`) — all client (`'use client'`), encapsulate timers/effects.
  No JSX, no styling. Reusable beyond affiliate.
- **Components** — server components by default; only those needing state/effects
  (`HeroSection`, `StatsGrid`, `MarketingAssets`, `FaqSection`, `Counter`) are
  `'use client'`. Static sections render on the server.
- **Page** — composition only. No data, no logic, no inline mock arrays.
- **Styling** — inline styles with `var(--*)` tokens from `globals.css`. Never
  hardcode hex (matches project convention). Status→colour maps live next to the
  component that uses them.

## Component hierarchy

```
AffiliatePage
├─ HeroSection            (useClipboard)        → TierBadge
├─ StatsGrid                                     → StatCard (useRevealOnMount) → Counter (useCountUp)
├─ TierProgress           (getTierProgress)      → TierBadge ×2
├─ CommissionTable                               → SectionHeader
├─ ActivityPanels                                → ReferralsPanel + PayoutsPanel → SectionHeader
├─ MarketingAssets        (useState filter)      → SectionHeader
├─ FaqSection             (useState accordion)   → SectionHeader
└─ FooterCta
```

## Frontend testing strategy

No test runner is wired into this project yet. Recommended setup: **Vitest +
@testing-library/react + jsdom** (Vitest plays well with the TS/ESM toolchain).

Test in three tiers, cheapest first:

1. **Data / pure logic (unit, fast, no DOM)** — highest ROI.
   - `getTierProgress()`: `pct` clamps to `[0,100]`; `gap = next - earnings`;
     midpoint earnings → ~50%; earnings ≥ next threshold → `pct === 100`,
     `gap ≤ 0`; earnings below current tier → `pct === 0`.
   - Data invariants: `STATS` keys unique; `TIER_THRESHOLDS` strictly increasing
     across `TIER_ORDER`; every `Referral.email` unique (used as React key);
     every `Payout.ref` unique; `ASSET_FILTERS[0] === 'all'`.

2. **Hooks (unit, fake timers)**.
   - `useCountUp`: with `vi.useFakeTimers()`, advancing time reaches `target`
     exactly and stops (no overshoot); negative target counts down to it;
     `active=false` stays at `0`.
   - `useClipboard`: mock `navigator.clipboard.writeText`; `copy()` sets
     `copied=true` then auto-resets after `resetMs`; a rejected write keeps
     `copied=false`.
   - `useRevealOnMount`: `false` initially, `true` after `delayMs`.

3. **Component (integration, render + interaction)**.
   - `HeroSection`: clicking COPY LINK calls clipboard with `REFERRAL_LINK` and
     swaps the button label to `✓ COPIED`.
   - `FaqSection`: first item open on mount; clicking another opens it and closes
     the previous; clicking the open one collapses it.
   - `MarketingAssets`: selecting a filter narrows the rendered card count;
     `all` shows every asset.
   - `CommissionTable`: renders one row per `COMMISSIONS` entry; negative `earned`
     shows a leading `-` and the negative colour token.
   - `TierProgress`: progress bar `width` style equals `getTierProgress().pct`.

Smoke: render `<AffiliatePage />` and assert it mounts without throwing — guards
the composition wiring after refactors.

### Why this split helps testing

Business logic (`getTierProgress`) and timing (`useCountUp`) are isolated from
JSX, so the bulk of coverage comes from fast unit tests with no DOM. Component
tests only verify wiring and interaction, not numbers — those are pinned at the
data layer.
