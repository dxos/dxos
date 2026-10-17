---
'@dxos/echo-host': patch
---

Past 50 released documents the host evicts the oldest at once instead of waiting out the 30 s idle delay, so a reindex no longer holds most of a profile loaded together and sizes the worker's Automerge wasm memory, which never shrinks, by it.
