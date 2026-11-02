---
'@dxos/echo': patch
---

Add `Annotation.RawStringAnnotation`: strings under an annotated schema field are stored as immutable Automerge strings, one op per write instead of one per character. Connector cursors use it for `spec.snapshots`, so a snapshot that changes costs a few ops rather than its full text.
