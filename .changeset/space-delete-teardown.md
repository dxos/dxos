---
'@dxos/client-services': patch
---

Deleting a space now removes it locally even when its teardown fails. Leaving the replication swarm waits on the signaling server, so with EDGE unreachable `space.delete()` rejected after the tombstone had already been written — the space stayed in the client's space list as `SPACE_CLOSED`, and because the tombstone made the deletion look done, retrying was a no-op until the app reloaded.
