# Garbage Collection — Tasks

_Resume: Phases 2-5 IMPLEMENTED (all dxos-side work), PR #12535; next is Phase 6 (edge, dxos/edge repo). Uncommitted: none. Last: keep-set moved OFF createEpoch and reframed as `clearSpaceEpochMigration` in @dxos/migrations — no enumeration, no RPC surface change._

Phase numbers are shared with DESIGN.md §5 — "Phase N" means the same thing in
both documents.

## Phase 1: Research — DONE

Mapped soft-delete, on-disk storage, replication/epochs, prior art (dxos), and
the edge side (dxos/edge). All findings in DESIGN.md §3–§4.

### Tasks

- [x] **Map soft-delete mechanics** — `system.deleted` flag, transitive rule, space tombstones (DESIGN.md §4.1).
- [x] **Map on-disk storage** — single SQLite DB, chunk key namespaces, unwired delete primitives, no VACUUM (§4.2).
- [x] **Map replication** — reachability-from-root collections, resurrection path, epoch boundary closes it (§4.3).
- [x] **Survey epoch mechanism** — functional; compaction path exists; only sweep missing (§4.4).
- [x] **Survey edge** — control plane epoch-aware, data plane epoch-blind; sweep primitives dead code (§4.5).
- [x] **Write DESIGN.md** — findings + phased plan.
- [ ] **Design review** — walk §5 plan + §6 risks with Josiah; confirm scope and the bare-`createEpoch()` surface.

## Phase 2: Local sweep — `EchoHost.sweepSpace`

The sweep half, shippable alone: reclaims the epoch-superseded garbage already
on disk today (old roots and their exclusive docs from past epochs), and is the
primitive every later phase calls. Client-side only; no protocol or API
changes.

### Tasks

- [x] **Reachability walk** — `computeSweepSet` in `echo-host/src/db-host/space-sweeper.ts`: transitive over `links` ∪ branch urls, storage-only loads, unloadable docs terminate the walk and are never swept.
- [x] **Candidate enumeration** — `retiredRoots` (caller supplies the epoch chain) + optional `scanOrphans` over `automerge_heads`, gated on the doc's own `access.spaceId` matching.
- [x] **Chunk deletion** — `AutomergeHost.removeDocuments`: `removeRange([docId])` plus all six `subduction-*` families; `documentIdToSedimentreeIdHex` derives the key arithmetically (verified against `SedimentreeId.toString()`).
- [x] **Companion-state deletion** — `SqliteHeadsStore.deleteHeads`; `IndexEngine.removeDocuments` drops `ftsIndex` → `reverseRef` → `objectMeta` (joined on `recordId`) + `indexCursor`, batched and transactional.
- [x] **Process-state eviction** — `Repo.delete` (detaches sync sources, drops the query) + clears `_createdDocuments` / `_documentsToSync` / `_documentsToRequest` / `_documentsRequested` / `_headsUpdates`.
- [x] **VACUUM step** — `AutomergeHost.vacuum()`, opt-in via `sweepSpace({ vacuum: true })`.
- [x] **Tests** — `space-sweeper.test.ts`, 5 passing: retired-root sweep keeps survivors, idempotent second pass, branch docs retained, foreign/unattributed docs untouched, no-root refused.

## Phase 3: GC epoch — bare `createEpoch()`

The mark half. Creating an epoch is a plain, invokable operation with fixed
built-in semantics — new root materialized from current state, soft-deleted
objects excluded, history dropped — NOT a migration. Full mechanism:
DESIGN.md §5.2. Manual trigger is the v1 deliverable.

### Tasks

- [x] **Hard-delete-set enumeration** — objects with `isDeleted()` true including the transitive rule (deleted parents' subtrees; relations with deleted endpoints; depth-capped like `ObjectCore.isDeleted`).
- [x] **Root materialization** — fresh root doc: copy `access`/`version`; survivors re-created without history (`toJS` → `repo.create`); deleted objects' links omitted; inline `objects` in the root filtered the same way; branch registry carried for survivors only.
  - Extract/relocate the plumbing from `sdk/migrations` (`MigrationBuilder`/`compactDocumentsEpochMigration`) into the service layer so the operation has no migration-authoring surface; `MigrationBuilder` stays for real migrations.
- [x] **Epoch commit** — `Epoch { number: last+1, previousId, automergeRoot }` credential on the control pipeline (the existing commit path), then local application (`_onNewRoot` → collection swap), then invoke the Phase 2 sweep.
- [x] **API surface** — `DataSpace.createEpoch()` with no migration performs GC (replaces the silent `return null`); `SpacesService`/`SpaceProxy` pass-through; `Migration` enum untouched.
- [x] **Trigger surfaces** — exposed via `SpaceOperation.CreateEpoch` + the debug plugin button (Phase 5). NOT done: devtools StoragePanel action, recovery-page entry beside `compactDocumentsInRecovery`, `dx` CLI.
- [x] **Tests** — `client-e2e/src/spaces.test.ts` "garbage-collecting epoch", 3 passing: deleted objects unreachable afterwards in every `deleted:` mode (recoverable before it), epoch recorded and the space still writable, keep-set drops everything unnamed. NOT covered: two-peer convergence (Phase 4 test item).

## Phase 4: Every-peer auto-sweep

Peers clean their own disk as the epoch replicates to them — no coordination.

### Tasks

- [x] **Hook** — on `spaceDocumentListUpdated` with `previousRootId` set (fires on every peer when an epoch root lands, incl. delayed offline application), schedule `sweepSpace` debounced/idle after the new root is applied.
- [x] **Ordering guard** — sweep only after the new root's collection state is registered, so no fetch race resurrects a doc mid-swap.
- [ ] **Tests** — two-peer harness: peer A creates GC epoch, peer B applies it and sweeps automatically; offline peer applies + sweeps on reconnect.

## Phase 5: User-facing operations (plugin layer)

Surface the mechanism in Composer once Phases 2–4 work: an explicit epoch
action, and the existing clear-space path rebuilt on top of it. Last of the
dxos-side phases — edge starts only after this lands. Detail: DESIGN.md §5.4.

### Tasks

- [x] **`SpaceOperation.CreateEpoch`** (plugin-space) — new operation wrapping bare `space.internal.createEpoch()` (regular GC epoch: hard-deletes already-soft-deleted objects, compacts history).
- [x] **Expose in debug plugin** — alongside the clear-space action in the `SpaceGenerator` reset panel (`plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:100`).
- [x] **`clearSpaceEpochMigration`** (`@dxos/migrations`) — the clear is a MIGRATION, not GC: it destroys live objects on caller instruction (DESIGN.md §5.2/§5.4). `MigrationBuilder.keepOnlyObjects` derives the drop set from the root doc's own `links`/`objects` maps, so the space's contents are never enumerated; commits via the existing `REPLACE_AUTOMERGE_ROOT` path. Also fixed `_buildNewRoot` to drop deleted ids from inline `objects` (previously copied wholesale).
- [x] **Reimplement `RemoveAllObjects` on top of it** — replaces the `Filter.everything()` query + per-object `Database.remove` loop; empties the root collection, then one `clearSpaceEpochMigration`.
  - Semantic change flagged: soft delete (undoable) → hard clear; description updated; no undo mapping.
  - Test moved to `migrations/src/space-clear.test.ts` (real client harness); the plugin-space unit test was removed — its layer provides only a database, and the clear now needs a client-attached space.

## Phase 6: Edge mark-and-sweep (dxos/edge)

Same model server-side in `SubductionAutomergeReplicator`. Begins only after
every dxos-side phase (2–5) has landed. The mark signal arrives free — the
client's epoch credential replicates over the control feed and
`SpaceStateMachine` already parses it. Detail: DESIGN.md §4.5, §5.5.

### Tasks

- [ ] **Fix `getAutomergeRoot` ordering** — select by `Epoch.number`, not DO-KV key order (today arbitrary with >1 epoch; prerequisite for anything GC-critical).
- [ ] **Reachability** — epoch root docId from the SSM → materialize root doc server-side (indexer/legacy replicator already decode docs) → links ∪ branches → sedimentree ids (docId = first 16 bytes of the 32-byte id).
- [ ] **Sweep** — `loadAllSedimentreeIds()` minus reachable → `deleteAllCommits` + `deleteAllFragments` + `deleteSedimentreeId` per tree (currently zero-caller primitives), transactional per tree, following the compaction template's safety rules; mind the 128 MB isolate on oversized trees.
- [ ] **GC verb** — `@devtoolsRpc({ globalDispatch: true })` on the DO + `rpcMethods` whitelist entry (lazy proxy silently drops unlisted methods); invokable per space or fleet-wide via the existing admin fan-out.
- [ ] **Indexer cleanup** — drop index state for swept docs; prune `root-candidates` to the current root.
- [ ] **Later** — automatic sweep on Epoch credential processing (SSM → replicator DO), or `DurableObjectCronScheduler`.

## Phase 7: Space purge

Hard-delete tombstoned spaces from local disk. Sequenced last of the
implementation phases: least recoverable, and blocked on a semantic
prerequisite — **deletion is not revocation**, so a purged space must still
be restorable by re-invitation. Detail: DESIGN.md §5.6.

### Tasks

- [ ] **PREREQUISITE: make the tombstone re-joinable** — `acceptSpace` currently asserts `!isSpaceDeleted` (`data-space-manager.ts:438`), so a space you deleted can never be re-joined; `_open` skips it forever. Change to: explicit re-entry (accepting an invitation / explicit restore) clears the tombstone; passive resurrection (a still-holding device, a replayed `SpaceMember` admission) stays blocked. Ship and verify this BEFORE any purge lands.
- [ ] **Doc sweep** — walk the space's full epoch chain for every root ever; sweep all docs (Phase 2 machinery), plus `echo_spaces` row (`SpaceStateManager._deleteSpace`, exists).
- [ ] **Index purge** — `objectMeta`/`ftsIndex`/`reverseRef`/`indexCursor` by spaceId.
- [ ] **Feed-store purge** — `blocks`/`feeds`/`cursor_tokens`/`sync_state` by spaceId.
- [ ] **Hypercore purge** — resolve the space's feed keys (genesis/control/data + admitted feeds from metadata/control pipeline) → `Directory.remove()` per feed dir in `hypercore_files`.
- [ ] **Metadata trim** — delete `space_large` blob; drop the `SpaceMetadata` entry from the `space_metadata('main')` blob (read-modify-write of one shared protobuf blob); optionally keyring rows for space/feed keys.
- [ ] **Trigger + tests** — "purge deleted spaces" action (devtools/CLI); tests: delete → purge → per-table row counts zero and tombstone intact; **purge → re-invite → space syncs back from a peer/EDGE**; passive resurrection still blocked.

## Phase 8: Deferred

- [ ] **Epoch policy** — implement `EpochMonitor` per the existing `EpochMonitorConfig` proto (messages/time/inactivity thresholds) to create GC epochs automatically per space.
- [ ] **Epoch permissions** — restrict who may create epochs (any member for v1).
- [ ] **Feed retention** — `Feed.RetentionOptions` → `deleteOldestBlocks`; edge trims only the `trace` namespace today.
- [ ] **Blob GC** — `blobs_data` refcounting; no space attribution today.

### References

- `.agents/projects/garbage-collection/DESIGN.md` (findings §3–§4, plan §5, risks §6)
- Related: `.agents/projects/object-merging/DESIGN.md` §4.3 (merge-loser docs want the same sweep), `.agents/projects/feed-live-objects/DESIGN.md` (tombstone compaction constraint).
