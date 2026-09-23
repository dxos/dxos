---
'@dxos/index-core': patch
---

Fix indexing failing outright against Durable Object SQLite, where batched index writes exceeded the runtime's bound-variable limit of 100 and every indexing pass threw before completing. Statements are now sized by the variables they bind rather than by a row count.
