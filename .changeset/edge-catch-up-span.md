---
'@dxos/echo': patch
---

The `syncPeer` span with EDGE now times a space's whole catch-up: it spans reconnects, ends `synced` or `closed` (never `disconnected`), and records how many connections diverged and dropped (`connections`, `disconnects`) during the catch-up.
