---
'@dxos/echo': minor
'@dxos/plugin-client': patch
---

Make ECHO schema migrations coordination-free. Each peer migrates on its own and all peers converge, and a write an old client makes to a renamed or dropped field is carried forward to the new shape instead of being lost.

**Breaking:** `Migration.define`'s `transform` is now a synchronous, pure function of the object's own data, with references as `Ref`s and no database or context. Fold-forward re-runs it, so work that reads or writes other objects moves to `onMigration`. `onMigration` now receives `ensure` (find or create an object by convergence key) and `assign` (a value-compared cross-object write), never re-runs during fold, and resumes on the next run if it did not complete. `Migration.defineFanIn` requires an `id`, and its `absorb` takes the child's data only. `Migration.defineArrayFanOut` requires `toProperty` to be a record of element id to child ref, and passes each element's index to `toChild`.

- **Runner.** `db.runMigrations` rejects a transform that changes the value of a property it keeps under the same name, writes only the keys a migration changed, switches the type and records the step in one change, and keeps dropped keys in place. Each step is stored under its own annotation key and read with `Migration.getMigrationSteps`. `runMigrations` and `db.foldForward` run one at a time per database.
- **Fold-forward.** `db.foldForward` and `db.watchFoldForward` carry late old-shape writes into the new shape, including fan-in children and array fan-out elements. A fold is written as concurrent with direct edits, so a direct edit and a late write become an Automerge conflict, and `Obj.getConflict` reads it back with the direct edit presented first. Each late change is folded as its own change, derived only from the source history, so peers that fold it independently write it once. A late write that sets an old property replaces the target value; one that edits inside it (a map key, a list insert, a text splice) edits inside the target, so a direct edit elsewhere in the same value survives.
- **Multi-object migrations.** `Migration.defineFanIn`, `Migration.defineStampElementIds`, `Migration.defineArrayFanOut` and `Migration.findOrphanedChildren`. `ConvergenceKeyMerger` now replays a losing duplicate's edits onto the winner, so an edit made before the merge is kept.
- **Lenses.** `Lens` moves from `@dxos/echo-panproto` to `@dxos/echo` and gains `compose`, `invert` and version-aware `findPath`/`resolveView`. `Migration.fromLens` derives a migration from a lens and checks for unreviewed drops.
- **Fixes.** `waitUntilHeadsReplicated` no longer hangs when the awaited change merges without a patch. A nested element no longer keeps a stale `id` after a remote change removes it. `TestReplicationNetwork` supports partition and heal.
- **plugin-client.** Every space is migrated and watched once it is ready, including spaces created or joined later.
