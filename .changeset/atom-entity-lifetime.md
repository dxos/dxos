---
'@dxos/echo': patch
'@dxos/app-framework': patch
'@dxos/app-graph': patch
'@dxos/graph': patch
---

Bound reactive object atoms to the lifetime of the entity they derive from, so they and their cached snapshots are released with the object rather than retained for the lifetime of the page. The plugin manager's registry now keeps unobserved atoms for a 5 second grace period (`atomIdleTTL`). App-graph drops the `nodeOrThrow` atom; use `getNodeOrThrow`, or read `node` and handle `Option.none`.
