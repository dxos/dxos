---
'@dxos/echo': patch
---

Saving a long document to Subduction no longer recomputes its whole fragment metadata twice per save; the storage worker's per-save cost on a 30k-change document drops from about 44 ms to 0.2 ms.
