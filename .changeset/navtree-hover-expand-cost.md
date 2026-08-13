---
'@dxos/app-graph': patch
'@dxos/plugin-navtree': patch
---

Expanding a graph node no longer blocks the main thread on stack-trace capture. `Atom.withLabel` records a stack trace on every call, and the graph labelled an atom per node, per connection key and per extension, so a single `Graph.expand` cost hundreds of captures — measured at 17ms per expand with 40 registered extensions. Labels are now opt-in via `VITE_ATOM_LABELS` under the dev server. The nav-tree's hover prefetch is also trailing-edge debounced by 150ms, so moving the cursor across rows only expands the row it settles on.
