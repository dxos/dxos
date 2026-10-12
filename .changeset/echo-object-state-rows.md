---
'@dxos/echo': minor
---

Query results are backed by the index's copy of each object, with the object's Automerge document held as bytes the tab has not loaded. The first write or document read (cursors, history, version checkout) loads those bytes synchronously, so the write is a real change at once, and subscribes the document from their heads. On by default; `runtime.client.lazyQueries: false` (or `DX_ECHO_LAZY_QUERIES=false`) loads every result's document as before.

- The index stores each object's lossless structure, its document's bytes, and the heads both were read at; existing databases re-index once to fill them.
- A database can opt in to `eviction`, which returns idle documents to bytes. Off by default.
