---
'@dxos/echo-host': patch
---

A document whose data this device received through Subduction while the document was not loaded now opens from local storage at once. It used to wait for a peer to answer its first sync round, so it stayed loading while peers were slow and was reported unavailable with no peer connected.
