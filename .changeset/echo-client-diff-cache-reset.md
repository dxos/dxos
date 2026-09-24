---
'@dxos/echo': patch
---

A document loaded into a tab or the storage worker no longer keeps Automerge's diff cache for its whole content after the first update, so documents that are only read take less wasm memory.
