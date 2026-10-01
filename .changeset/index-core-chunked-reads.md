---
'@dxos/index-core': patch
---

Full-text search, `queryAll`, `queryTypes` and `queryByTimeRange` no longer fail with
`too many SQL variables` on Durable Object SQLite when given many spaces, queues or types. A read too
wide for one statement is split across as few statements as the limit allows and merged back into the
same rows in the same order; on the client, these reads plan against its SQLite's 32,766-variable
limit and stay one statement. The devtools Indexer card no longer counts a document as behind when
the EDGE indexer lists an older fragment head beside the document's current head.
