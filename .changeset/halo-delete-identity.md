---
'@dxos/client': minor
---

Add `client.halo.deleteIdentity()`, which closes and deletes every space and the identity, then wipes the storage they left behind (automerge documents, hypercore files, the feed store, the index tables and the keyring). Like `client.reset()`, it leaves the client closed.
