---
'@dxos/client': minor
---

`space.internal.syncToEdge()` now fails at once with `EdgeReplicationRefusedError` when EDGE refuses replication for the identity (for example, an identity with no Hub Account), instead of timing out after 60 seconds. The refusal is also reported on the EDGE connection status as `EdgeStatus.refusal`.
