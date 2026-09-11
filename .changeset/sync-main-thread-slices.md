---
'@dxos/echo': patch
---

Syncing a large space no longer freezes the tab: the client integrates incoming documents, opens linked documents, and hydrates index results in short slices that yield to the event loop, the worker caps each batch it forwards, and db update events are coalesced to ten per second during a burst of synced documents while a local write still emits at once.
