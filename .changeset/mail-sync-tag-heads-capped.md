---
'@dxos/plugin-inbox': patch
---

Mail sync no longer re-pushes and reloads every previously synced message on each capped backfill run, which ran EDGE's operation service out of memory on large mailboxes; tag reconciliation now records its base on capped runs and resolves message ids in bounded batches.
