---
'@dxos/echo': minor
---

Aggregate queries that declare no `items` no longer load objects into the tab: the host collapses each group to one record carrying its key and aggregate values. New group keys `Aggregate.type()` and `Aggregate.updated('hour')` / `Aggregate.created('hour')` group by stored type and by the start of the UTC hour. `Obj.getMeta(object).updatedAt` reads change metadata instead of decoding the head change.
