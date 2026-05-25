You are running the **graphify** knowledge-graph skill for NEXMIND Command Center.

## Task
Build (or update) a queryable knowledge graph of this codebase.

Arguments passed: $ARGUMENTS

## Steps

1. **Run graphify** in the project root:
   ```
   graphify $ARGUMENTS
   ```
   If no arguments given, default to: `graphify .`

2. **After the graph is built**, read `graphify-out/GRAPH_REPORT.md` and give the user:
   - **God nodes** — the most connected files/concepts (everything flows through these)
   - **Surprising connections** — unexpected links between modules
   - **Suggested questions** — 3 things the graph is uniquely positioned to answer
   - **Quick summary** — 2-3 sentences on the architecture

3. **Tell the user** to open `graphify-out/graph.html` in browser for interactive view.

## Rules
- If graph already exists, use `graphify . --update` to re-extract only changed files
- After modifying code in a session, run `graphify update .` (AST-only, free, instant)
- Never delete `graphify-out/` — it is the shared codebase map
