---
'@dxos/client-services': patch
---

`Space.listen` returns a handle whose `ready` promise resolves once the listener is registered, so a message posted after awaiting it is not dropped. A listener that throws now raises an unhandled error instead of silently ending its subscription.
