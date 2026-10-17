---
'@dxos/echo-host': patch
---

A head EDGE lists beyond the local ones is confirmed from storage, before the document is loaded to check it, when storage holds that commit or fragment and its whole history; any other head is still loaded and checked. Confirmations lived only in memory, so every boot loaded and synced each in-sync document whose EDGE heads include a fragment head: on a 3,400-document profile, 40 documents and ~30 MB of reads per boot, which set the ECHO worker's Automerge and Subduction wasm memories at ~40 MiB each. An unchanged collection state from an in-sync peer also no longer copies the collection to compare it; EDGE answers each space's poll every 10 s with every document's heads, and each reply was copied and diffed twice.
