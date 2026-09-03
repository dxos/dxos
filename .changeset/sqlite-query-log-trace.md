---
'@dxos/sql-sqlite': patch
---

`sqlite query` is now logged at `trace` unless the query took at least 20 ms, in which case it stays at `debug`.

The persistent log store drops `trace`, so per-query lines no longer consume the retained log budget. In the feedback bundle that motivated this change, `sqlite query` was 80% of a 50 MB upload and the whole bundle covered under nine minutes of session — the reported failure had already been evicted. Slow queries, the ones worth diagnosing after the fact, are unaffected.

Run with `DX_LOG=trace` (or a per-file filter) to see every query locally; the Chrome DevTools `performance.measure` track is unchanged.
