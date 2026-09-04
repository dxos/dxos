---
'@dxos/edge-client': patch
---

Pre-authenticate every EdgeHttpClient endpoint that the edge worker authenticates, so credentials go
out with the first request instead of after a 401 challenge.
