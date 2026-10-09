---
'@dxos/echo-protocol': minor
'@dxos/index-core': minor
---

The index stores each object as its document holds it, beside the JSON snapshot: the raw entity structure (bytes and raw strings kept) and the document heads it was read at. `encodeEntityStructure` and `decodeEntityStructure` convert it. Existing databases re-index once to fill it.
