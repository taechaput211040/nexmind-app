# Graph Report - nexmind-app  (2026-05-24)

## Corpus Check
- 93 files · ~48,387 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 572 nodes · 887 edges · 33 communities (28 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ac603c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 19 edges
2. `compilerOptions` - 16 edges
3. `agents` - 11 edges
4. `resolveRange()` - 11 edges
5. `buildAnalytics()` - 10 edges
6. `getWorkspace()` - 10 edges
7. `buildSystemPrompt()` - 9 edges
8. `buildTimeseries()` - 9 edges
9. `GET()` - 8 edges
10. `ok()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `buildSystemPrompt()`  [EXTRACTED]
  src/app/api/chat/route.ts → src/lib/agentPrompts.ts
- `POST()` --calls--> `buildSystemPrompt()`  [EXTRACTED]
  src/app/api/dm/route.ts → src/lib/agentPrompts.ts
- `POST()` --calls--> `addWorkspace()`  [EXTRACTED]
  src/app/api/workspace/route.ts → src/lib/db.ts
- `GET()` --calls--> `getWorkspace()`  [EXTRACTED]
  src/app/api/workspace/file-content/route.ts → src/lib/db.ts
- `mockFetch()` --calls--> `buildAnalytics()`  [EXTRACTED]
  src/components/analytics/AnalyticsDashboard.test.tsx → src/lib/analytics.ts

## Communities (33 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (50): ActivityPanels(), zeroValue, CommissionTable(), HEADERS, STATUS_BG, STATUS_COLOR, rows, Counter() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.28
Nodes (7): Counter(), fmt(), KpiCard(), baht, count, pct, trendMeta

### Community 2 - "Community 2"
Cohesion: 0.24
Nodes (6): agents, AgentStatus, AgentTier, logEntries, LogEntry, quests

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk, better-sqlite3, next, react, react-dom, devDependencies, eslint (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (15): agentEmoji, AgentEvent, _g, GlobalChatState, PipelineProgressBar(), PipelineTrack(), renderInlineText(), RenderText() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (24): ALLOWED_COMMANDS, execAsync, executeTool(), FullMessage, getProjectContext(), isCommandAllowed(), POST(), PROJECT_ROOT (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (8): getCurrentGoldAnalysis(), GoldMarketAnalysis, GoldPrice, MarketDriver, SupportResistance, TechnicalIndicator, TradingSetup, GET()

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (62): GET(), glass, RANGES, mockFetch(), requested, user, Props, data (+54 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (5): AGENT_ROLES, DEFAULT_WORK_DIR, getEnv(), SendFn, spawnCC()

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (5): execAsync, GET(), POST(), REPOS_DIR, GET()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): agents, args, block, bold(), c(), COL, depts, dim() (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (9): agentById, glass, logStatusColor, statCards, Panel(), SectionLabel(), StatCardData, glass (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (6): CATEGORIES, getEnv(), KB_DIR, researchCategory(), runAgent(), spawnCC()

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (54): DELETE(), GET(), POST(), WORKSPACES_DIR, buildTree(), GET(), IGNORE, readFileSafe() (+46 more)

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (5): Category, COLORS, Entry, ICONS, memories

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (14): agentEmoji, ALL_HANDS_FALLBACK, FILE_ICONS, FileContent, FileExplorer(), FileNode, formatSize(), getFileIcon() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (7): inter, metadata, spaceMono, inter, metadata, spaceMono, nav

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (4): Database, DatabaseConstructor, RunResult, Statement

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (9): deptPositions, EDGES, MapNode, NODES, NodeState, STATE_COLOR, STATE_GLOW, STATE_LABEL (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (6): Agent, depts, CharacterDesign, characterDesigns, characterImages, fallbackDesign

### Community 30 - "Community 30"
Cohesion: 0.52
Nodes (6): DATA_FILE, GET(), PATCH(), POST(), readQuests(), writeQuests()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (3): Quest, deptFilters, statusConfig

### Community 32 - "Community 32"
Cohesion: 0.53
Nodes (5): DATA_FILE, GET(), POST(), readLogs(), writeLogs()

## Knowledge Gaps
- **211 isolated node(s):** `eslintConfig`, `name`, `version`, `private`, `dev` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `agents` connect `Community 2` to `Community 4`, `Community 5`, `Community 12`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `name`, `version` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05719298245614035 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06218487394957983 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.08712121212121213 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._