---
'@dxos/plugin-agent': minor
---

An agent's extracted facts now live only in its brain (`BrainService`): reading a chat or a document no longer writes `FactEntry`/`ExtractionPass` items to an annotation feed in the space, and documents read with `ReadSource` now wake watches as chat turns do. Breaking: the `@dxos/plugin-agent/FactEntry` export is removed, `ReadSource` returns `fired`/`undelivered` instead of a `pass` ref, `BrainService` gains `readThrough` and a `read` push option (the chat read cursor, kept with the facts), and annotation feeds already in a space are no longer read.
