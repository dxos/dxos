---
'@dxos/echo-host': patch
'@dxos/echo': minor
'@dxos/echo-panproto': minor
'@dxos/echo-client': patch
---

Fix `waitUntilHeadsReplicated` hanging when the awaited change merges without visible patches (a concurrent write into an already-conflicted key) by waiting on `heads-changed` instead of `change`, and make `TestReplicationNetwork` register connections so removing a replicator tears down its local end, enabling transport-level partition/heal in tests. Move the `Lens` object-lens namespace from `@dxos/echo-panproto` into `@dxos/echo`, beside `Type`/`Obj`/`Annotation`; `@dxos/echo-panproto` keeps the `Panproto` wire lens, its runner, and the `useLens` React hooks. Fix `db.runMigrations` clobbering concurrent edits and silently dropping retired properties: an object migration now writes only its changed data keys, the type, and a migration marker in one automerge change, so fields the migration doesn't touch — including a peer's concurrent edit to one — survive.
