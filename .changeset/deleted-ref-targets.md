---
'@dxos/echo': minor
---

Deleted objects are absent by default when resolving references, matching how queries already treat them. `ref.load`, `ref.tryLoad`, `Database.load`, `Obj.atom` and `useObject` each take `{ deleted: 'include' }` to resolve a tombstoned target instead, and a reference carrying an inlined target applies the same rule rather than returning a deleted object indefinitely. Adds `Filter.entity(entity)`, which selects by an entity's id while keeping its type for the rest of the query chain.
