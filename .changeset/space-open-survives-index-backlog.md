---
'@dxos/echo': patch
---

Spaces open while the index is catching up after a long offline period or a reindex migration:

- A compiled query runs on the in-memory path while the snapshot store is incomplete, instead of waiting for the whole index backlog to drain. The wait could outlast the client's 20 s query timeout and fail space open.
- A space whose initialization fails now retries on its own, starting at 1 s and backing off to 30 s. Before, it retried only after the host took the space out of ready and back, so one timeout left the space unusable until reload.
