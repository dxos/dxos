---
'@dxos/echo': minor
---

Aggregate queries that declare no `items` no longer load objects: the host collapses each group to one record and, when every key is `Aggregate.type()` or the new `Aggregate.bucket('updatedAt')` (UTC hour), answers the query with one grouped SQL read of the meta index. `Obj.getMeta(object).updatedAt` reads change metadata instead of decoding the head change.
