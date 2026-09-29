---
'@dxos/echo-host': patch
---

Loading a space from EDGE is faster on a fresh device. A sync round, heal retries included, no longer waits for its slowest peer once another peer has delivered the document, so a slow or silent peer-to-peer connection no longer throttles the load. A device pulling documents it has never stored no longer lists every stored document id on each sync round, which made the first sync of a large space quadratic.
