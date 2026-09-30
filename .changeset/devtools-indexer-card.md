---
'@dxos/echo': minor
'@dxos/plugin-devtools': minor
---

Add `EdgeHttpClient.getIndexerHeads`, which returns the heads of every document as last indexed by EDGE, and expose `getDocumentHeads` on `EchoDatabase`. The devtools overview gains an Indexer card that compares each space's local document heads against the EDGE indexer's.
