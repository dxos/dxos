---
'@dxos/app-framework': patch
---

Plugin body imports resolve concurrently instead of one at a time, so core plugins activate first and startup drops ~500 ms.
