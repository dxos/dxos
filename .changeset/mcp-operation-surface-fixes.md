---
'@dxos/plugin-space': patch
'@dxos/plugin-tasks': patch
'@dxos/types': patch
'@dxos/echo': patch
---

Three fixes to the operation surface the MCP server projects.

`space.queryObjects` with a `typename` filter under-returned, nondeterministically: the typename was resolved to one registered `Type` entity and the filter built from that entity's identity — a versioned `dxn:` for a static declaration, an `echo:` id for a copy persisted in the space. Objects of the same typename written under any other registration did not match, and which registration was picked depended on the order the registry query happened to return, so the same call could answer with every object, some of them, or none. The typename now filters as the bare-typename DXN `Filter.type` documents for this case; the registry is consulted only to reject a typename nothing declares.

`projects.get` and `tasks.list` timed out on a task set with members. Loading a set's tasks resolved the refs one at a time, each a separate indexed query, and an unresolvable ref does not fail — it waits out the resolver's own 30s timeout. Materialized refs are now read from the working set, the cold remainder resolves concurrently, and a ref that does not resolve within 5s is treated as gone.

`tasks.getOutline` given a ref to something that is not an outline now fails with a typed `InvalidOperationInput` naming the actual typename, rather than throwing `TypeError: Cannot read properties of undefined (reading 'tryLoad')`.

Adds `Database.makeRef`, the Effect wrapper around `db.makeRef`.
