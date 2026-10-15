---
'@dxos/echo-host': patch
---

A Subduction sync round asks only the peers the share policy would serve the document to, instead of every connected peer. With one EDGE peer per space, every round used to ask each space's peer, and all but one refused; on a reindex that was ~13 requests per document and set the worker's Subduction wasm memory, which never shrinks.
