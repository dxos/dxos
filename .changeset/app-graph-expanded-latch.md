---
'@dxos/app-graph': patch
---

Fix the graph's `_expanded` / `_initialized` latches and `_initialNodes` / `_initialEdges` seeds never recording anything: they were built with `Record.empty()` and written with `Record.set(...)`, which is immutable in Effect and returns a new record rather than mutating. As a result every `Graph.expand` call re-fired the node's connector, re-running its queries. They are now a `Set`/`Map`, matching `_pendingExpands`.
