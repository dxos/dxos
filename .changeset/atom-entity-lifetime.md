---
'@dxos/echo': patch
'@dxos/effect': minor
'@dxos/app-framework': patch
'@dxos/app-graph': minor
'@dxos/graph': minor
---

Bound reactive object atoms to the lifetime of the entity they derive from, so they and their cached snapshots are released with the object rather than retained for the lifetime of the page.

`@dxos/effect/AtomEx` adds `AtomEx.makeRegistry`, an atom registry with a 5 second idle grace period (`AtomEx.DEFAULT_IDLE_TTL`). Use it for any registry that hosts ECHO atoms, which no longer carry `keepAlive`. The plugin manager's registry uses it (`atomIdleTTL`).

Breaking: app-graph's `Graph.nodeOrThrow` and `@dxos/graph`'s `Store.nodeOrThrow` atoms are removed. Use `getNodeOrThrow`, which now throws `GraphNode.NotFoundError`, or read `node` and handle `Option.none`.
