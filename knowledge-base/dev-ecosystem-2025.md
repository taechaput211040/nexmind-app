## Dev Ecosystem
- Next.js 16 (Oct 21, 2025, LTS): Turbopack now the default bundler — 2–5× faster production builds, up to 10× faster Fast Refresh; production builds still experimental.
- Next.js 16 breaking changes: `params`, `cookies()`, `headers()` are async-only; `middleware.ts` → `proxy.ts` (export renamed to `proxy`); legacy AMP, runtime configs, and `next lint` wrapper removed.
- Cache Components: explicit `"use cache"` directive replaces implicit caching; compiler auto-generates cache keys for pages, components, and functions.
- React 19 + React Compiler stable (React 19.2): automatic memoization cuts re-renders without manual `useMemo`/`useCallback`; fully supported in Next.js 16.
- Vite now bundles with Rolldown (Rust-based, replacing esbuild/Rollup) for optimized production output; requires Node.js 20.19+ or 22.12+.
- Next.js DevTools MCP: Model Context Protocol integration lets AI agents diagnose issues and suggest fixes inside the dev workflow.
