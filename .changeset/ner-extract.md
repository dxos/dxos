---
'@dxos/assistant': minor
---

Remove the unused named-entity-recognition helpers from `@dxos/assistant/extraction`. They now live in the private `@dxos/ner` package, which drops `@xenova/transformers` (and its `protobufjs` dependency) from the assistant dependency graph.
