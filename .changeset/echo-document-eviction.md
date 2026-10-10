---
'@dxos/echo-client': minor
'@dxos/echo-host': patch
---

A database can opt in to `eviction`: an idle object no editor holds, whose document the index has at its current heads, goes back to the index's copy and its document is released. Off by default. The host now sends a document a client has just subscribed to without waiting for its rate limit.
