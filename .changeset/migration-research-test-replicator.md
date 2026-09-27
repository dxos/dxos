---
'@dxos/echo-host': patch
'@dxos/echo': minor
'@dxos/echo-panproto': minor
---

Fix `waitUntilHeadsReplicated` hanging when the awaited change merges without visible patches (a concurrent write into an already-conflicted key) by waiting on `heads-changed` instead of `change`, and make `TestReplicationNetwork` register connections so removing a replicator tears down its local end, enabling transport-level partition/heal in tests. Move the `Lens` object-lens namespace from `@dxos/echo-panproto` into `@dxos/echo`, beside `Type`/`Obj`/`Annotation`; `@dxos/echo-panproto` keeps the `Panproto` wire lens, its runner, and the `useLens` React hooks.
