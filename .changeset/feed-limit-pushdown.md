---
'@dxos/index-core': minor
'@dxos/echo-host': minor
---

A feed query with a `limit` now reads bounded work: the planner pushes the cap into the index scan (`ORDER BY objectId … LIMIT n`, with the deleted filter folded in), so asking a feed for 10 items reads 10 rows and decodes 10 snapshots instead of materialising every block in the feed to hand back 10. Measured on a 40-item feed, the two tail reads `Cursor.seedDedupSet` issues per sync go from 40 index hits and 40 decoded documents each to 5 and 5.

The cap moves into the scan only where the planner can prove it sound — a feed-only scope, a natural (insertion-order) ordering in either direction, and no step between the select and the limit that would prune the page. Anything else keeps the previous behaviour.

`QueueWindow` in `@dxos/index-core` is now a tagged union: `{ kind: 'cursor', after, before?, limit? }` for a positional cursor read (its previous shape, plus the tag) and `{ kind: 'natural', direction, limit, deleted? }` for a bounded natural read. A new `objectMeta(queueId, objectId)` index backs the latter.
