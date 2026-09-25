---
'@dxos/client': patch
---

`Space.listen` returns a handle whose `ready` promise resolves once the listener is registered, so a message posted after awaiting it is not dropped. A service stream subscriber whose `onData` throws now raises an unhandled error and keeps receiving, instead of silently ending its subscription.
