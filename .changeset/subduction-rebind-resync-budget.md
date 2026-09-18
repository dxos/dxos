---
'@dxos/echo': patch
---

Let a rebound edge connection re-send the writes its lost session dropped, instead of parking them behind the diverged-document resync guard until something else moves either side's heads.
