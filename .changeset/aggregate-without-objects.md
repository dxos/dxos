---
'@dxos/echo': minor
---

Aggregate queries that declare no `items` no longer load objects into the tab: the host collapses each group to one record carrying its key and aggregate values. When such a query selects by type or timestamp and groups only by `Aggregate.type()`, `Aggregate.updated(unit)` / `Aggregate.created(unit)` and `Aggregate.count()`, the host counts index rows and loads no documents. Time grouping takes `'hour'` (UTC) or `'day'`, with an optional `timeZone` for local days. `Obj.getMeta(object).updatedAt` reads change metadata instead of decoding the head change.
