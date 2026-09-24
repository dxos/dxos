---
'@dxos/echo': patch
'@dxos/effect': minor
'@dxos/app-framework': patch
'@dxos/app-graph': minor
'@dxos/graph': minor
---

ECHO atom families no longer use `Atom.keepAlive`, so an entity's atoms, snapshots and subscriptions are released once nothing observes them instead of being retained for the lifetime of the page. Multi-key families (`Obj.atomProperty`, `Annotation.atom`, ref properties) are keyed by a tuple rather than nested families.

`@dxos/effect` adds the `AtomEx` namespace with `AtomEx.makeRegistry`, an atom registry with a 5 second idle grace period (`AtomEx.DEFAULT_IDLE_TTL`). Use it for any registry that hosts ECHO atoms, which no longer carry `keepAlive`. The plugin manager's registry uses it (`atomIdleTTL`).

Breaking: app-graph's `Graph.nodeOrThrow` and `@dxos/graph`'s `Store.nodeOrThrow` atoms are removed. Use `getNodeOrThrow`, which now throws `GraphNode.NotFoundError`, or read `node` and handle `Option.none`.
