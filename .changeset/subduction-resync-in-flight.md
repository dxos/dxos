---
'@dxos/echo': patch
---

A document whose peer's heads diverge is now resynced even when a sync round for it is already running. The resync used to be overwritten when that round settled, so a client that missed an edit pushed during a reconnect could stay one edit behind EDGE indefinitely.
