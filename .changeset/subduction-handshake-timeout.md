---
'@dxos/echo-host': patch
---

A Subduction handshake whose EDGE reply never arrives now fails after 15 seconds and restarts the replication connection, instead of holding the attempt open until the 30 second bind watchdog fires.
