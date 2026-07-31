---
'@dxos/index-core': patch
---

Feed removals now index a body-preserving tombstone: a `{ id, '@deleted': true }` block is merged onto the object's prior snapshot (and its meta row keeps the original type/kind/relation/parent) instead of replacing it wholesale. Queries with `deleted: 'include'` therefore return the deleted feed object with its type and body intact, so it hydrates as a deleted object (`Obj.isDeleted === true`) rather than being dropped.
