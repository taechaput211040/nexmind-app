<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:graphify-rules -->
## Graphify Knowledge Graph

This project has a graphify knowledge graph at `graphify-out/`.

Rules for all agents:
- **Before any architecture or codebase question** → read `graphify-out/GRAPH_REPORT.md` first (god nodes + community structure)
- **If `graphify-out/wiki/index.md` exists** → navigate the wiki instead of grepping raw files
- **After modifying code files** → run `graphify update .` to keep graph current (AST-only, no API cost, instant)
- **To explore interactively** → open `graphify-out/graph.html` in browser

Available slash command: `/graphify [path] [options]`
<!-- END:graphify-rules -->
