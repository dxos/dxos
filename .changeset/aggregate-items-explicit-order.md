---
'@dxos/echo': minor
'@dxos/plugin-inbox': minor
---

Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
