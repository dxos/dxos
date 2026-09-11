---
'@dxos/client-services': patch
---

HALO documents now replicate between an identity's own devices.

The HALO space registered only the gossip extension on an authorized device session, so its space root and credentials document had no path between devices: a joining device could never adopt the root the inviting device named and was left with a feed-only credential chain.

Device sessions now carry the automerge replicator extension, and root adoption retries with backoff since the root arrives over the mesh without emitting an identity state update. Both sit behind the existing `DX_AUTOMERGE_CREDENTIALS` opt-in, so behaviour is unchanged with the flag off.
