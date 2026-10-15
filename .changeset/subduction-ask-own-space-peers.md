---
'@dxos/echo-host': patch
---

A Subduction sync round asks only the peers the share policy would serve the document to, instead of every connected peer. When the policy would serve it to none, as for a document whose space is not known locally yet, the round still asks every connected peer. With one EDGE peer per space, every round used to ask each space's peer, and all but one refused; on a reindex that was ~13 requests per document and set the worker's Subduction wasm memory, which never shrinks.
