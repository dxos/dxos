---
'@dxos/echo-host': patch
---

Fix `waitUntilHeadsReplicated` hanging when the awaited change merges without visible patches (a concurrent write into an already-conflicted key) by waiting on `heads-changed` instead of `change`, and make `TestReplicationNetwork` register connections so removing a replicator tears down its local end, enabling transport-level partition/heal in tests.
