---
'@dxos/compute-runtime': patch
'@dxos/sql-sqlite': patch
---

Make a crashed process diagnosable from a user-submitted debug bundle.

A failed process logged `lifecycle: failed` at `debug` with only `Cause.pretty` text, and the deferred `ctx.fail` path logged nothing about the cause at all — so a crashed agent turn left no error-level line to find. Both paths now report at `error` and carry the failing `Error`/defect itself, so the record keeps the message, stack, and nested causes that `Cause.pretty` flattens away.

`sqlite query` moves from `debug` to `trace` unless the query took at least 20 ms. The persistent log store drops `trace`, and this one line was 80% of a 50 MB feedback upload — enough to cut the retained window to under nine minutes and evict the failure being reported. Slow queries, the ones worth diagnosing after the fact, still log at `debug`. Use `DX_LOG=trace` or a per-file filter to see every query locally; the DevTools `performance.measure` track is unchanged.
