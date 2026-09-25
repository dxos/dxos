---
'@dxos/app-graph': minor
'@dxos/plugin-navtree': patch
---

**Breaking:** `Graph.expand` is renamed to `Graph.expandSync`, and `Graph.expand` now returns an `Effect` that runs the expansion off the paint-critical path. Both overloads (direct and curried) are preserved on `expandSync`, so migrating is a rename. Interrupting the new `expand` cancels a still-pending expansion, which makes superseding one scheduled expansion with another a matter of interrupting the previous fiber.

Expanding a node also no longer blocks the main thread on stack-trace capture. `Atom.withLabel` records a stack trace on every call, and the graph labelled an atom per node, per connection key and per extension, so a single expansion cost hundreds of captures — measured at 17ms with 40 registered extensions. Labels are now opt-in via `VITE_ATOM_LABELS` under the dev server.

The nav-tree's hover prefetch uses the new scheduled `expand` behind a 150ms settle delay, so moving the cursor across rows only expands the row it stops on.

The tooltip context is split so that pointing at a trigger no longer re-renders every `Tooltip.Trigger` in the app, and the open tooltip's `data-state`/`aria-describedby` are applied to the active trigger alone rather than to all of them.
