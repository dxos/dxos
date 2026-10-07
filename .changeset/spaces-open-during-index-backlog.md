---
'@dxos/echo': patch
---

Spaces open while the index catches up after a long offline period or a reindex migration:

- A compiled query runs on the in-memory path while the snapshot store is incomplete, instead of waiting for the whole index backlog to drain. That wait could outlast the client's 20 s query timeout and fail space open.
- A `Resource` whose `_open` throws can be opened again: the failed attempt's contexts are disposed and the next `open()` calls `_open` again instead of replaying the original rejection.
- A space whose initialization fails retries on its own, starting at 1 s and backing off to 30 s, and `waitUntilReady()` retries a failed initialization before waiting. Before, one timeout left the space unusable until reload.
