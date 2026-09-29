---
'@dxos/echo-host': patch
---

A sync round no longer waits for its slowest peer once another peer has delivered the document, so a slow or silent peer-to-peer connection no longer throttles loading a space from EDGE.
