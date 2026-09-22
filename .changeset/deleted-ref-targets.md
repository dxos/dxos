---
'@dxos/echo': minor
---

Deleted objects are now consistently absent when resolving refs. `ref.load()`, `Database.load()` and the ref atoms accept `{ deleted: 'include' }` to resolve a tombstoned target, a ref carrying an inlined target applies the same rule, and the new `Ref.loadAll` loads a ref array in order, skipping entries whose target is deleted or unavailable. `Filter.entity(entity)` anchors a query on an object already in hand, keeping its type for the rest of the chain.
