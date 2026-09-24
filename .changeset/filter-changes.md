---
'@dxos/echo': minor
'@dxos/plugin-space': patch
---

`Filter.changes(targets?)` selects Automerge changes instead of objects. Each result is a frozen `Change.Change` record (`key`, `source`, `time`, `actor`, `seq`, `ops`), not an entity. A space-wide query must aggregate with `Aggregate.time('time', …)`, `Aggregate.group('source')`, `Aggregate.count()` and `Aggregate.sum('ops')`. The host answers those from hourly buckets it keeps per document, which survive garbage collection. With targets, any shape works, including a plain ordered history: the host replays the documents holding those entities. Two new aggregates work on any type: `Aggregate.sum(property)` and `Aggregate.time(property, unit, { timeZone })`. The SQL executor compiles both, except a `time` day in a named time zone, which runs in memory as a `timestamp` day already does; change queries always run on their own executor. `Query.AggregateResult` is renamed to `Query.RecordResult`. The space home heatmap now counts every change on the day it was made, so objects edited on several days, or since deleted, show on each of those days.
