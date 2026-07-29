---
'@dxos/plugin-markdown': minor
---

Document branches now use ECHO-core branching: new branches fork the content's automerge history (same object, CRDT merge-back — no conflict markers), the editor binds branches per surface, and checkpoint viewing pins the live document to historical heads instead of swapping in a snapshot. Legacy content-copy branches remain readable and merge textually.
