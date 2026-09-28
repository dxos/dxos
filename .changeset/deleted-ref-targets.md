---
'@dxos/echo': minor
---

Resolving a reference whose target has been deleted now yields nothing by default, matching how queries already treat deleted objects; a ref array still stores its dangling entries. `ref.load`, `ref.tryLoad`, `Database.load`, `Obj.atom` and `useObject` each take `{ deleted: 'include' }` to resolve a tombstoned target instead, and a reference carrying an inlined target applies the same rule rather than returning a deleted object indefinitely. Adds `Filter.entity(entity)`, which selects by an entity's id while keeping its type for the rest of the query chain.
