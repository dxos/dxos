---
'@dxos/echo': minor
'@dxos/plugin-space': patch
---

`Ref.loadAll(refs, options?)` loads the targets of a ref array in order. It drops missing targets and, unless `{ deleted: 'include' }` is passed, deleted ones. It replaces `Ref.Array.loadAll`, which rejected when any target was deleted. `Ref.atom(ref | refs, options?)` is its reactive counterpart: it reads loaded targets synchronously, adds the rest as they load, and drops a target once it is deleted. The navtree's collection rows now come from the collection's `objects` array through `Ref.atom` instead of a live query, so a document dragged between collections leaves the old one in the same update that adds it to the new one.
