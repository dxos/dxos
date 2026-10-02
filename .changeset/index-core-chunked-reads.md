---
'@dxos/index-core': patch
---

Full-text search, `queryAll`, `queryTypes` and `queryByTimeRange` no longer fail with
`too many SQL variables` when given many spaces, queues or types: on EDGE and the client alike, a read
too wide for one 100-variable statement is split and merged back into the same rows in the same order.
The devtools Indexer card no longer counts a document as behind when the EDGE indexer lists an older
fragment head beside the document's current head.
