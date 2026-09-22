---
'@dxos/client': minor
---

Add `client.halo.deleteIdentity()`, which closes and deletes every space and the identity, then wipes the storage they left behind (automerge documents, hypercore files, the feed store, the index tables and the keyring). The client stays open, so `createIdentity()` can be called straight afterwards.
