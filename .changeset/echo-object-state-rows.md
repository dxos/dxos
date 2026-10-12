---
'@dxos/echo': minor
---

Query results are backed by the index's copy of each object: an object's Automerge document loads only when something writes to it or reads the document itself. Writes are accepted at once and replayed onto the document when it loads. On by default; `runtime.client.lazyQueries: false` (or `DX_ECHO_LAZY_QUERIES=false`) loads every result's document as before.

- The index stores each object's lossless structure and the heads it was read at; existing databases re-index once to fill it.
- Reading an unloaded object's document (cursors, heads, history, version checkout) throws `DocumentNotLoadedError`. Load it first with `Doc.load` / `Doc.loadAccessor` (`@dxos/echo-doc`), or in React with `useDocAccessor` / `useDocLoaded` (`@dxos/react-client/echo`).
- A database can opt in to `eviction`, which releases idle documents back to the index copy. Off by default.
