---
'@dxos/index-core': patch
---

Full-text search, `queryAll`, `queryTypes` and `queryByTimeRange` no longer fail with
`too many SQL variables` on Durable Object SQLite when given many spaces, queues or types. A read too
wide for one statement is split across several and merged back into the same rows in the same order.
