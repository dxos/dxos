---
'@dxos/echo-host': patch
---

Fix `TestReplicationNetwork` connection bookkeeping so removing a replicator actually tears down its connections and fresh replicators can be re-attached, enabling transport-level partition/heal in tests.
