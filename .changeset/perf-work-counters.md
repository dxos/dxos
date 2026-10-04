---
'@dxos/util': minor
---

Add `countWork`, always-on work counters published on `__dxosWorkCounters`, and count automerge storage, ECHO query and SQLite statement work with it, plus per-method served calls in `RpcTiming`'s readout, so a perf harness can budget on counts rather than timings.
