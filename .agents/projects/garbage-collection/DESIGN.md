# ECHO Garbage Collection — Design

Status: research complete (2026-08-10); plan proposed in §5, not yet reviewed.

## 1. Problem

ECHO has soft deletes only. Deleted objects keep their automerge documents (and
index entries) on disk; deleted/closed spaces keep their documents, feeds, and
metadata. Nothing ever reclaims disk — the only chunk-deleting code in the repo
is the whole-profile `ClientServicesHost.reset()`. Worse, a naively hard-deleted
document is re-replicated by peers/EDGE within ~10 s (§4.3).

## 2. Direction (decided)

Epoch-based mark-and-sweep:

- **Epoch = the GC boundary.** A new epoch is created whose root document set
  excludes everything soft-deleted at that moment. Soft delete → hard delete is
  promoted by the epoch, not by an independent purge pass.
- **GC is not a migration.** Creating an epoch is a plain, invokable operation
  — "set an epoch now" — with no data-migration definition attached. Today a
  no-migration `createEpoch()` is a silent no-op (`return null`), and the code
  already flags the mismatch (`REPLACE_AUTOMERGE_ROOT`: "This is not a
  migration" TODO). We make the bare operation meaningful: a new epoch is
  materialized from current state, excluding soft-deleted objects. Dropping the
  history of surviving documents is opt-in (`compact: true`), so the default
  blast radius equals what the user actually deleted. The `Migration` enum
  remains only for genuine schema/data migrations; GC reuses the underlying
  root-swap plumbing, never the migration-definition surface.
- **Mark** = documents not reachable from the new epoch's root.
- **Sweep** = delete unreachable documents' storage locally (chunks + heads +
  index rows). Runs on every peer as the epoch credential replicates to it, as
  an automatic part of epoch application — so peers converge on the cleaned
  state without coordination.
- **Permissions: none for v1.** Any member of the space can trigger an epoch
  (this is already true of `createEpoch`). Restricting who may trigger one is
  deferred.
- **Trigger: manual for v1** (explicit API + devtools/CLI). A per-space epoch
  _policy_ (automatic scheduling) is the long-term follow-up; its config schema
  already exists (`EpochMonitorConfig`, §4.4).
- **No ambient hard deletion** (decided 2026-08-10, Josiah). Promoting a soft
  delete to a hard delete is unrecoverable, so it may only ever happen under an
  explicit invocation or a declared per-space policy — never as a background
  pass that happens to run. Soft-deleted state is a _recoverability contract_
  (undo via `db.add`, `deleted: 'only'` queries); an ambient collector would
  make that contract nondeterministic — undo works until the collector happens
  to fire. This is also why the epoch is the right governing mechanism: the
  epoch credential is a signed, numbered, permanently ordered record on the
  control feed of _when_ deletions were promoted and by whom — a historical
  record of the destruction. An in-place unlink (the #12529 mechanism) leaves
  no such record and therefore must also only run under explicit invocation;
  its cheapness is not a license to run it continuously. A future automatic
  policy should additionally carry a retention window (only promote deletions
  older than N days), so recoverability has a declared, predictable horizon.
- **Re-replication safety falls out of the epoch model** — validated in §4.3:
  the replication collection id embeds the root doc id, and a root swap clears
  the old collection and registers the new one, so swept docs are never
  diffed, advertised, or fetched again.

## 3. Findings — the four load-bearing facts

1. **Soft delete never stops replication.** `db.remove` flips
   `system.deleted` inside the object's own doc; the `DatabaseDirectory.links`
   entry in the space root is never removed, and the replication set is derived
   from `root.getAllLinkedDocuments()`. A soft-deleted object's doc syncs to
   peers and EDGE forever. Space deletion likewise is a pure tombstone (HALO
   `SpaceDeleted` credential + `deletedSpaces` metadata) — replication and
   auto-open stop, bytes all stay.
2. **Sweeping without unlinking resurrects the doc.** With the root still
   linking the object, the collection keeps the doc id (with empty heads), the
   peer/EDGE diff reports it `missingOnLocal`, and `findWithProgress`
   re-fetches it — within one 10 s collection-sync poll. The unlink (or root
   replacement) must replicate _before_ bytes are deleted.
3. **Epochs are alive and are already the compaction mechanism.** An epoch is
   a signed root-pointer swap (`Epoch.automergeRoot` credential on the control
   feed), processed by every peer; `compactDocumentsEpochMigration` +
   `MigrationBuilder` already re-materialize surviving docs _without history_
   and commit `REPLACE_AUTOMERGE_ROOT`; `MigrationBuilder.deleteObject` already
   builds a new root omitting entries. Only the sweep is missing — nothing
   deletes the retired docs' bytes.
4. **All the sweep primitives exist, unwired.**
   `SqliteStorageAdapter.removeRange([docId])` (zero callers),
   `EntityManager.unlinkDeletedObjects` (zero callers), `EchoHost.removeSpace`
   (tests only), `FeedStore.deleteOldestBlocks` (tests only),
   hypercore `Directory.remove()` (never called).

## 4. Findings — detail

### 4.1 Soft delete mechanics

- Object marker: `system.deleted` in the object's automerge doc
  (`EntitySystem.deleted`, `echo-protocol/src/document-structure.ts:394`);
  write path `db.remove` → `EntityManager.removeCore` →
  `ObjectCore.setDeleted(true)` (`object-core.ts:619`).
- **Transitive deletion is computed, not written** (`ObjectCore.isDeleted`,
  `object-core.ts:573`): a child with a deleted parent, or a relation with a
  deleted endpoint, reports deleted without its own flag (depth-capped at 10;
  same-space only). The mark phase must evaluate this rule, not just read
  flags. Restoring a parent implicitly restores the subtree.
- **Undelete is `db.add(deletedObj)`** (`entity-manager.ts:507`), wired into
  plugin-space undo (`RemoveObjects` ↔ `RestoreObjects`). Hard delete at an
  epoch forfeits this for the purged objects — the intended semantic change.
- Queries default to `deleted: 'exclude'`; `'include' | 'only'` are query
  options compiled to a `FilterDeletedStep`. The indexer keeps rows for
  deleted objects (`objectMeta.deleted` column) and the FTS index retains the
  **full JSON snapshot** of deleted objects so `deleted: 'include'` can
  hydrate them — the largest index-side consumer of soft-deleted space.
- Space deletion: `space.delete()` → `DataSpaceManager.markSpaceDeleted` →
  HALO `SpaceDeleted` credential (replicates to the user's **own devices**
  only) + `deletedSpaces` metadata + `SpaceState.SPACE_DELETED`. Doc comments
  in three places say "data is not removed until garbage collection (future
  work)". **It is not revocation** — the `SpaceMember` credential stays
  valid and other members are unaffected — yet it behaves as terminal today:
  `_open` skips tombstoned spaces and `acceptSpace` asserts
  `!isSpaceDeleted` (`data-space-manager.ts:438`), so a re-invitation is
  refused. That mismatch is a prerequisite for Phase 7 (§5.6).
- Feed items delete by appending a `{ id, '@deleted': true }` tombstone block
  (append-only); the feed-live-objects constraint applies: a tombstone must
  not be compacted away while a replica could still hold the live version.

### 4.2 On-disk storage

One SQLite database per profile (wa-sqlite/OPFS in the browser,
better-sqlite3 on node); every layer is a table:

| Bytes for          | Table(s)                                                          | Per-doc/space delete API                                 |
| ------------------ | ----------------------------------------------------------------- | -------------------------------------------------------- |
| Automerge docs     | `automerge_chunks`                                                | `SqliteStorageAdapter.removeRange([docId])` — unwired    |
| Doc heads          | `automerge_heads`                                                 | none (`DELETE` needed; indexer iterates the whole table) |
| Space → root       | `echo_spaces`                                                     | `SpaceStateManager._deleteSpace` (tests only)            |
| Indexes            | `objectMeta`, `ftsIndex`, `reverseRef`, `indexCursor`             | none                                                     |
| Queues/feeds       | `feeds`, `blocks`, `subscriptions`, `cursor_tokens`, `sync_state` | `deleteOldestBlocks` only (spaceId-scoped tables)        |
| Control/data feeds | `hypercore_files`                                                 | `Directory.remove()` — unwired                           |
| Space metadata     | `space_metadata('main')` blob, `space_large`                      | none per-space                                           |
| Keys / blobs       | `keyring`, `blobs_meta`/`blobs_data`                              | none                                                     |

- `automerge_chunks` has **two key namespaces** for the same document:
  classical automerge-repo (`<docId>-snapshot-…`, `-incremental-…`,
  `-sync-state-…`) and subduction sedimentree (`subduction-{ids,commits,
blobs,fragments,fragment-blobs}-<sid>-…`). A profile that ran under both
  modes has both. automerge-repo's `Repo.delete` misses the subduction keys
  and the heads row — the sweep should call `removeRange` on all prefixes
  directly rather than go through `Repo.delete` (which also errors live
  handles).
- Per-doc chunk compaction (snapshot folding) is automatic but **size-only —
  history is never dropped** except by document re-creation (epoch).
- **No `VACUUM` anywhere in the repo** — deleted rows return pages to the
  SQLite freelist but the OPFS file never shrinks. GC needs an explicit
  `VACUUM` (or `auto_vacuum`) step to reclaim actual disk.
- Indexer coupling: `AutomergeDataSource` iterates **all** of
  `automerge_heads`; orphaned heads rows leave the indexer permanently
  re-attempting `loadDoc` on vanished docs (with `fetchFromNetwork`
  defaulting true — a resurrection vector of its own). Heads + `indexCursor`
  must be deleted atomically with chunks.
- Diagnostics for sizing already exist: `measureDocMetrics`
  (compressedByteSize/mutationCount per doc) and the recovery-page SQL
  storage report (per-table row counts, page counts).

### 4.3 Replication and the resurrection path

- Transport is subduction (flag `edgeFeatures.subductionReplicator`, on in
  Composer/presets; classical automerge-repo sync remains behind the flag,
  used by the recovery boot). Above either sits the same DXOS collection-sync
  control plane.
- **The replicated set = reachability from the space root**, published as
  collection `space:<spaceId>:<rootDocId>` — membership recomputed on every
  root change from `root.documentId + getAllLinkedDocuments()` (links ∪
  **branch docs** — a reachability walk must include `branches`).
- Resurrection, precisely: purged-but-still-linked docs stay collection
  members with `heads: []`; remote reports real heads → `missingOnLocal` →
  `findWithProgress` re-fetches. Outbound gates don't help (membership is
  answered from the same collection state).
- **The epoch boundary closes this**: root swap fires
  `clearLocalCollectionState(oldRoot)` + `updateLocalCollectionState(newRoot)`
  (`echo-host.ts:282`), and the collection id itself changes. Docs absent
  from the new root are absent from the collection — not diffed, not
  advertised (`shouldAdvertise` → `getContainingSpaceIdForDocument` fails),
  not served (`authorizeFetch` denies).
- EDGE: retains every sedimentree id it has ever seen and **has no delete
  RPC** (full `EdgeHttpClient` + subduction opcode inventory checked). v1 GC
  is local-only; edge orphans are already treated as inert by the
  `subsetRemoteToLocal` diff filter (edge peers only). Mesh peers converge by
  applying the same epoch, so the mesh equivalent isn't needed. Server-side
  detail → §4.5.
- `authorizePut` is deliberately allow-all (invitation bootstrap + sticky
  denials); acceptable under the epoch model since collection membership
  gates fetching, but a non-epoch purge would need an inbound deny-set.
- Process-state caveat: `_createdDocuments` / `_documentsToSync` /
  `_documentsToRequest` in `AutomergeHost` are never cleared; the sweep must
  clear them (and evict `Repo` handles) or classical-mode announce keeps
  offering swept docs for the process lifetime.

### 4.4 Epochs

- `Epoch` credential = `{ number, previousId, automergeRoot }` on the space
  control feed; #0 written at genesis; processed by every peer
  (`AutomergeSpaceState.processCredential` → `DataSpace._onNewRoot` →
  `EchoHost.updateSpaceRoot`). Legacy `timeframe`/`snapshot_cid` fields are
  vestigial.
- `DataSpace.createEpoch` requires a `migration`; working variants:
  `INIT_AUTOMERGE`, `PRUNE_AUTOMERGE_ROOT_HISTORY` (root re-created without
  history), `REPLACE_AUTOMERGE_ROOT` (caller-supplied root). Client RPC waits
  up to 60 s for application; devtools shows epoch state.
- `compactDocumentsEpochMigration` (`sdk/migrations/document-compaction.ts`)
  is the working mark-phase skeleton: `toJS(oldDoc)` → `repo.create(...)`
  (fresh doc, **history dropped**) per linked doc, `deleteObject(id)` to omit
  entries, `_commit` → `REPLACE_AUTOMERGE_ROOT` epoch. Reachable today from
  the Composer recovery page (`compactDocumentsInRecovery`).
- **Retired-epoch docs are the highest-yield, lowest-risk GC target**: after
  any epoch, the old root + its exclusive links are provably unreachable
  (epoch chain via `space.internal.getEpochs()` records retired roots), yet
  stay on disk and keep their heads rows.
- `EpochMonitorConfig` proto (`min_messages_between_epochs`,
  `min_time_between_epochs`, `min_inactivity_before_epoch`) exists with **no
  implementation** — the ready-made schema for the future per-space epoch
  policy.
- Open TODO at `data-space.ts:534`: "How do we handle changing to the next
  EPOCH?" — epoch application concurrency is guarded by
  `_epochProcessingMutex` but cross-peer write races are unresolved (§6).

### 4.5 EDGE (dxos/edge repo, surveyed 2026-08-10 @ 8f6f163e)

**Epoch awareness is split: the control plane has it, the data plane doesn't.**

- **Control plane — yes.** `FeedReplicator` (one DO per space) replicates the
  hypercore control feeds; `SpaceStateMachine` decodes every credential in
  them (catch-all `CredentialIndexProcessor`), so **Epoch credentials are
  already parsed and persisted server-side**, and
  `SpaceStateMachine.getAutomergeRoot` returns the current epoch's root URL
  (`db-service/src/worker/space/space-state-machine.ts:118`). A client-created
  GC epoch therefore becomes visible to edge automatically via normal feed
  replication — no new protocol needed for the mark signal. Consumers today:
  only `DataService.getSpaceMeta` (server-side ECHO clients — functions, MCP,
  trace writer). Two caveats:
  - **Ordering bug**: `getAutomergeRoot` picks the "last" Epoch credential by
    DO-KV key order, which is keyed on credential id (a key hex), not
    `Epoch.number`/insertion — with >1 epoch it can return an arbitrary root.
    `Epoch.number`/`previousId` are never read anywhere in edge. Must be
    fixed (order by `number`) before anything GC-critical keys off it.
  - Edge writes only the genesis epoch (`number: 1`, via `edge-crypto`
    genesis); it never issues epoch 2+. Client-notarized credentials are
    accepted without assertion-type restriction, so client-created epochs
    land in the control feed fine.
- **Data plane — no.** `SubductionAutomergeReplicator` (one DO per space,
  SQLite-in-DO: `sub_sedimentree_ids` / `sub_commits` / `sub_fragments`,
  blobs inline, ids = raw 32-byte sedimentree ids ↔ docId = first 16 bytes
  base58check) validates only the `spaceId` part of a collection id and
  **discards the root-doc component** — it ships `getAllHeads()` for every
  tree it has ever seen, by design ("filtering here would couple the DO to
  ECHO doc semantics"); the client intersects. The legacy
  `AutomergeReplicator` _did_ do root+links reachability filtering in its
  collection reply; that was deliberately dropped in the subduction rewrite.
  Nothing ever deletes a whole tree: `deleteSedimentreeId` /
  `deleteAllCommits` / `deleteAllFragments` exist with **zero callers**;
  `sub_sedimentree_ids` rows are insert-only.
- **A sweep template already runs in production**: intra-tree minimal-tree
  compaction (`_compactionDirty` mark → pass-tail sweep →
  `deleteBatchAll` in one transaction) deletes commits/fragments absorbed
  into higher fragments. Its documented safety rules transfer to an epoch
  sweep: list stored rows _before_ sampling the live view; only diff
  resident trees; treat an empty view as failed hydration, delete nothing.
  Memory caveat: sweep working set is O(records) in a 128 MB isolate;
  `COMPACTION_OVERSIZED_TREE_RECORDS = 100k` is log-only.
- **Space partitioning is structural** — one DO (own SQLite DB) per space, so
  a per-space sweep needs no space predicate, and **whole-space wipe already
  exists**: `DataManagement.deleteSpace` → `storage-purge` queue →
  `durableObjectStorageReset` (KV + `dropAllSqlTables`) across all
  space-owned DOs including the subduction replicator. Per-document deletion
  does not exist at all.
- **Admin surface for a GC verb**: the DO is RPC-only; a new verb must be
  added to the `rpcMethods` whitelist (`db-service/src/durable-objects.ts:39`
  — the lazy proxy silently drops unlisted methods). The clean pattern is
  `@devtoolsRpc({ globalDispatch: true })`, the same fleet-fan-out the legacy
  replicator's `cleanStorage` uses; the subduction DO has zero devtools RPCs
  today. A `DurableObjectCronScheduler` exists as precedent for periodic
  sweeps.
- **Other edge storage**: hypercore feed bytes (`FeedReplicator`, DO-KV
  `feed-block-chunk:*` etc.) are append-only forever — no block deletion
  exists and truncation would be a protocol change (out of GC scope).
  `FeedSpace` (queues) tombstones grow storage; only the `trace` namespace is
  size-trimmed (`deleteOldestBlocks`), `data` never. The edge indexer
  enumerates _all_ docs with heads — it indexes pre-epoch orphans like live
  docs today, and its `root-candidates` list keeps both old and new roots
  after an epoch (never pruned).

## 5. Plan

Phase numbers are shared with `TASKS.md` (Phase 1 there is the completed
research; implementation starts at Phase 2). Subsection numbers are this
document's own.

### 5.1 Phase 2 — the local sweep (host-side, no epoch changes)

`EchoHost.sweepSpace(spaceId)` (name TBD) in echo-host:

1. Compute **reachable** = current root docId + `getAllLinkedDocuments()`
   (links ∪ branches), transitively (linked docs can nest links).
2. Compute **candidates** = union of: retired roots from the epoch chain and
   their link closures (loaded with `fetchFromNetwork: false`), plus
   `automerge_heads` rows whose doc's `access.spaceId` matches (orphan
   pickup).
3. For each candidate ∉ reachable, delete: `automerge_chunks` under the
   classical prefix (`removeRange([docId])`) **and** the five `subduction-*`
   prefixes; the `automerge_heads` row; `indexCursor` row; evict the `Repo`
   handle; remove from the three announce sets.
4. Purge index rows for entities whose docs were swept (`ftsIndex` →
   `reverseRef` → `objectMeta`, joined on `recordId`).
5. `VACUUM` (explicit step, possibly separate/throttled).

This alone reclaims epoch-superseded garbage that exists on disk today, and
is the sweep half of everything below. Testable headlessly (create objects,
epoch, assert chunk/head/index rows gone, assert queries + replication
unaffected).

### 5.2 Phase 3 — the GC epoch (mark): mechanism

**Not a migration** (§2). The distinction, precisely:

- A _migration_ is a caller-authored transformation of data — arbitrary
  object edits, schema/reference rewrites — defined through
  `MigrationBuilder`, versioned, app-level. The `Migration` enum and that
  authoring surface stay exactly as they are, for that purpose.
- The _GC epoch_ is fixed system behavior: no user code, no parameters, no
  definition to write. It changes **representation** (which documents exist,
  how much history they carry) and never the logical content of any live
  object. Any member can invoke it at any time; invoking it twice converges.

What bare `DataSpace.createEpoch()` does (today it silently returns `null`;
this replaces that no-op):

1. **Quiesce** — take `_epochProcessingMutex` (already exists) and flush the
   database so pending writes are committed to the current docs.
2. **Enumerate** — load the current root; collect its inline `objects`, its
   `links`, and its `branches` registry.
3. **Mark** — evaluate deletion per entity **including the transitive rule**
   (deleted parents' subtrees; relations with a deleted endpoint) → the
   hard-delete set. Everything else is a survivor.
4. **Materialize** — create a fresh root doc (`repo.create()`), carrying
   `access` and `version`. Survivors: inline root objects copied; each
   surviving linked doc re-materialized value-only (`toJS(oldDoc)` →
   `repo.create(...)` — **history dropped**); branch entries carried for
   survivors. The hard-delete set is simply not carried — no tombstone
   record is needed in the new root, absence _is_ the hard delete.
   (These are `compactDocumentsEpochMigration`'s internals, relocated out of
   `sdk/migrations` into the service layer so the operation involves no
   migration-authoring machinery.)
5. **Commit** — write the credential
   `Epoch { number: last + 1, previousId, automergeRoot: newRootUrl }` to
   the space control pipeline. This credential is the _entire_ durable
   artifact of GC — there is no migration record, no request payload beyond
   the call itself.
6. **Apply** — the credential flows through the standard epoch pipeline on
   every peer identically, creator included:
   `AutomergeSpaceState.processCredential` → `_onNewRoot` →
   `EchoHost.updateSpaceRoot` → collection swap (`clearLocalCollectionState`
   for the old root, `updateLocalCollectionState` for the new). The creator
   has no special role after the commit — replication of the credential does
   all the propagation.
7. **Sweep** — Phase 2's `sweepSpace` runs after application (immediately on
   the creating peer; on every other peer via the Phase 4 hook).

Why this shape holds together:

- **Atomic boundary.** A peer is either pre-epoch (old collection, old docs
  still replicate) or post-epoch (new collection); the collection id embeds
  the root docId, so there is no intermediate state in which a purged doc is
  fetchable but unlinked.
- **Absence is the delete marker.** Nothing at the replication layer needs a
  per-doc tombstone; the new root simply doesn't reference the doc, and
  reachability-driven sync does the rest (§4.3).
- **GC and compaction are the same operation.** An epoch created when
  nothing is soft-deleted is pure history compaction; one created after
  deletions also hard-deletes. One invokable, two benefits.

API surface: `CreateEpochRequest.migration` is already optional — absent now
means GC instead of no-op; `SpaceProxy`/`SpacesService` pass through
unchanged; the existing migration variants keep working for real migrations.
Triggers for v1: devtools StoragePanel action and/or recovery-page entry next
to `compactDocumentsInRecovery`, optionally `dx` CLI.

**A keep-set does not belong here.** An earlier draft put
`createEpoch({ keep })` on this operation so that "clear the space" could reuse
the machinery. That breaks the distinction above on both counts: it takes a
caller-supplied argument, and it destroys live, undeleted objects. By this
document's own rule that makes it a migration, so it lives as one —
`clearSpaceEpochMigration` in `@dxos/migrations` (§5.4), a sibling of
`compactDocumentsEpochMigration`. `createEpoch()` stays argument-free and
non-destructive, and because the sweep hangs off _any_ root swap (§5.3),
migrations get storage reclamation for free without going near this path.

RESOLVED (2026-08-10, Josiah): survivor compaction is **opt-in**
(`createEpoch({ compact: true })`), not the default. It reclaims the most disk,
but it also widens the loss window to unsynced edits on documents that were
never deleted — so the default keeps the blast radius equal to what the user
actually deleted.

Sub-questions for design review:

1. Writes racing steps 2–5 land on old docs and are lost with the old root —
   pre-existing epoch semantics; is flush-under-mutex enough for v1, or do we
   want a short write-pause?
2. Scope check: feed/queue-backed objects are excluded from v1 (they live in
   the feed store, not automerge docs).

### 5.3 Phase 4 — every-peer auto-sweep

Hook the sweep to **epoch application** rather than the indexer: on
`spaceDocumentListUpdated` with `previousRootId` set (the exact event that
already fires on every peer when a new epoch root lands, including the
delayed offline case), schedule `sweepSpace` after the new root is applied.
Debounced/idle-scheduled; the indexer's heads/cursor cleanup rides along.

**Unlink-triggered sweep is equally sound** (verified 2026-08-10, correcting
an earlier claim that transient link flicker made it unsafe). The same event
fires when the document list _shrinks_ under an unchanged root — i.e. when a
replicated in-place unlink (the #12529 mechanism) arrives — and sweeping the
departed document ids is safe under the current write patterns:

1. **No flicker from delivery order.** Automerge enforces causal delivery: a
   link-delete change applied before its causally-preceding create is held
   pending and materialized together with it — verified empirically, a peer
   never observes absent→present for the key (`am-atomicity` probe).
2. **The only absent→present transition is a concurrent same-key put** (put
   wins over a concurrent delete — verified empirically), and no live-root
   code path performs one: the sole writer of a `links` key is
   `_createDocumentForObject`, at object creation, always with a fresh
   document url (`mapLinks` runs only on a not-yet-live imported root;
   undelete via `db.add` never touches `links`; re-adding an id creates a
   NEW document). So a departed _document id_ never returns.
3. **A multi-key unlink is one atomic automerge change** (verified), and
   observers only ever sample causally-consistent snapshots.

The genuine non-atomicity found in the audit is elsewhere: **document
creation and its link-write are separate operations across the network** — a
peer can hold a new document's bytes (proactive push) before the root change
linking it arrives. That endangers _orphan-scan_ GC (an unreachable,
attributed doc might be a just-created object whose link is in flight —
wiping it is self-healing via re-fetch but wasteful, and `scanOrphans` should
carry an age threshold), and does not affect the departed-ids trigger at all:
a document that was never in the list cannot depart from it.

Consistency with the no-ambient-hard-deletion rule (§2): the shrink reaction
is _reclamation, not deletion_ — the destructive act (the unlink) was an
explicit invocation on the peer that ran GC, its arrival is the evidence of
that invocation, and the departed documents are already unreachable
space-wide. It is the same class of act as sweeping on epoch application.

Result: any member triggers a GC epoch; every peer cleans its own disk as
the epoch replicates — no coordination, matching the "blob-like epochs
replicate around" model.

### 5.4 Phase 5 — user-facing operations (plugin layer)

Once Phases 2–4 work, surface the mechanism in Composer. This closes out the
dxos-side work; edge (Phase 6) starts only after it lands.

- **`SpaceOperation.CreateEpoch`** (new, plugin-space): wraps bare
  `space.internal.createEpoch()` — the regular GC epoch that promotes
  already-soft-deleted objects to hard-deleted and compacts history. Exposed
  in the debug plugin alongside the clear-space action (the
  `SpaceGenerator` reset panel that invokes `RemoveAllObjects` today).
- **`clearSpaceEpochMigration(space, { keep })`** (new, `@dxos/migrations`):
  the convenience API for "clear this space", a sibling of
  `compactDocumentsEpochMigration`. Destroying live objects on a caller's
  instruction is a migration, not garbage collection (§5.2), so it belongs
  here rather than on `createEpoch`. `MigrationBuilder.keepOnlyObjects`
  derives what to drop from the root document's own `links`/`objects` maps
  and commits via the existing `REPLACE_AUTOMERGE_ROOT` path — **the space's
  contents are never enumerated**, so clearing costs one root read rather
  than a scan. `_buildNewRoot` now also drops deleted ids from inline
  `objects`, which it previously copied wholesale.
- **`SpaceOperation.RemoveAllObjects` reimplemented on top of it**: resolve
  the properties and root collection, empty the root collection so its
  surviving copy is cleared, then one `clearSpaceEpochMigration`. Replaces a
  `Filter.everything()` query plus a per-object `Database.remove` loop.
  - Semantic change to flag: today's implementation is a soft delete
    (recoverable via undo/`db.add`); the epoch version is a hard clear. For
    the debug-plugin reset action that is the point, but the operation's
    description/undo wiring must say so (no `RestoreObjects` undo mapping
    for it).

### 5.5 Phase 6 — edge mark-and-sweep (dxos/edge repo)

Same model, server-side, in `SubductionAutomergeReplicator` (§4.5). Starts
only once every dxos-side phase (2–5) has landed. The mark signal arrives for
free: the client's GC epoch credential replicates over the control feed and
`SpaceStateMachine` already parses it.

1. **Fix `getAutomergeRoot` ordering** — select by `Epoch.number`, not DO-KV
   key order (prerequisite; today it can return an arbitrary epoch's root).
2. **Reachability**: root docId (from the SSM) → materialize the root doc
   (the legacy replicator and the indexer both already decode automerge docs
   server-side) → `links` ∪ branch urls → sedimentree ids (docId ↔ first 16
   bytes of the 32-byte id).
3. **Sweep**: `loadAllSedimentreeIds()` minus reachable →
   `deleteAllCommits` + `deleteAllFragments` + `deleteSedimentreeId` per
   tree (the existing zero-caller primitives), transactional per tree,
   following the compaction template's safety rules; mind the 128 MB isolate
   for oversized trees.
4. **Trigger v1**: a `@devtoolsRpc({ globalDispatch: true })` GC verb on the
   DO (added to the `rpcMethods` whitelist), invokable per space or
   fleet-wide via the existing admin fan-out. Later: automatic on Epoch
   credential processing (SSM notifies the replicator DO), or the existing
   `DurableObjectCronScheduler`.
5. Indexer follow-up: drop index state for swept docs; prune
   `root-candidates` to the current epoch's root.

Out of scope here: hypercore feed truncation (append-only protocol), queue
(`FeedSpace` `data` namespace) retention.

### 5.6 Phase 7 — space purge

Deliberately sequenced **after** Phases 5–6: it is the least recoverable step
and the one with an unresolved semantic prerequisite (below).

**Deletion is not revocation.** A `SpaceDeleted` tombstone is written to your
own HALO and replicates only to _your devices_; it does not revoke your
`SpaceMember` credential, does not affect other members, and does not delete
anything for anyone else. It means "remove this space from my devices", not
"I no longer have access". Until access is actually revoked, you should be
able to get the space back — most naturally by being re-invited.

**Today that is impossible**, and it is a pre-existing bug rather than
something GC introduces: `DataSpaceManager.acceptSpace` asserts
`invariant(!this.isSpaceDeleted(opts.spaceKey), 'Cannot accept a deleted
space.')` (`data-space-manager.ts:438`), so an invitation to a space you
previously deleted is refused outright. `_open` likewise skips tombstoned
spaces permanently. The tombstone currently behaves as an irreversible local
ban.

**Prerequisite for this phase: make the tombstone re-joinable.** The
tombstone must remain a durable _suppression_ — it is what stops a
still-holding device or a replayed `SpaceMember` admission from silently
resurrecting a space you deleted — while an explicit user action (accepting
an invitation, or an explicit restore) clears it and permits a fresh join.
The distinction to preserve: passive resurrection stays blocked; deliberate
re-entry is allowed. Concretely that means `acceptSpace` clearing the
tombstone instead of asserting against it, and `deletedSpaces` gaining a
"cleared" transition.

**Why purge is safe once that holds.** After a purge, re-invitation
re-replicates the space from whoever still has it (another member, another
of your devices that never applied the tombstone, or EDGE — which retains
everything until Phase 5 sweeps it). Local space purge is then a **cache
eviction, not a destruction**, and the strongest argument for eventually
making it automatic. The exception worth stating plainly: if no other
replica exists (sole member, and EDGE purged too), purge is terminal.

**The purge itself** — for spaces in `deletedSpaces`, working from metadata
and storage directly since the space is closed and unloaded:

1. Every doc from every root in the epoch chain (Phase 2 machinery: chunks in
   both key namespaces + `automerge_heads`).
2. `echo_spaces` row (`SpaceStateManager._deleteSpace`, exists).
3. Index rows by spaceId — `objectMeta`/`ftsIndex`/`reverseRef`/`indexCursor`.
4. Feed tables by spaceId — `blocks`/`feeds`/`cursor_tokens`/`sync_state`.
5. `hypercore_files` under the space's feed-key directories (genesis/control/
   data + admitted feeds — resolving that key set from metadata and the
   control pipeline is the fiddliest part).
6. `space_large` blob; drop the `SpaceMetadata` entry from the
   `space_metadata('main')` blob (a read-modify-write of one shared protobuf
   blob, not a row delete).
7. Optionally keyring rows; then `VACUUM`.

The tombstone record itself survives the purge — with the re-joinable
semantics above, it suppresses without banning. Manual trigger for v1
("purge deleted spaces" in devtools / `dx`).

Open questions:

1. Does purge keep a small manifest (space key, timestamp, byte estimate)
   for diagnostics, given the `SpaceMetadata` entry is removed?
2. Should re-invitation to a purged space be distinguishable in the UI from
   joining a brand-new space (it will look identical — empty, then syncing)?

### 5.7 Phase 8 — deferred

- **Epoch policy**: implement `EpochMonitor` per `EpochMonitorConfig`
  (messages/time/inactivity thresholds) to create GC epochs automatically.
- Permissions on epoch creation (currently any member — accepted for v1).
- Feed retention (`Feed.RetentionOptions` → `deleteOldestBlocks`) — adjacent
  but separable; edge trims only the `trace` namespace today.
- Blob GC (`blobs_data` refcounting) — separate track, no space attribution
  today.

## 6. Risks / accepted semantics

1. **Hard delete is final**: undo (`db.add`) and `deleted: 'only'` queries
   stop working for purged objects. Accepted — that is the feature.
2. **Concurrent-edit loss at the boundary**: a peer offline with unsynced
   edits to an old-root doc loses them when it applies the epoch (its changes
   merge into a doc nothing links). Pre-existing epoch semantics, not new to
   GC; acceptable for v1's manual trigger, must be revisited for automatic
   policy (e.g. `min_inactivity_before_epoch`).
3. **Un-deleting a subtree across the boundary**: transitively-deleted
   children are purged with their parent; restoring the parent after the
   epoch restores nothing. Matches intent; worth a release note.
4. **Feed items**: v1 scope is automerge-backed objects; feed block retention
   is Phase 8 (and constrained by the tombstone-visibility rule, §4.1).
5. **EDGE retention**: purged data survives server-side until Phase 6 lands
   (client phases are local-disk reclaim only). The edge sweep depends on the
   `getAutomergeRoot` ordering fix; until then edge must not act on epochs.
6. **Space purge is recoverable only while a replica exists** (§5.6):
   re-invitation restores a purged space from another member, another
   device, or EDGE — but a sole member who purged locally and server-side has
   destroyed the space. Purge must not ship before the tombstone is
   re-joinable.

## 7. References

- Research reports (2026-08-10, this project): soft-delete mechanics,
  storage map, replication/epochs, prior art — condensed into §3/§4; key
  code anchors: `object-core.ts:573,619`, `entity-manager.ts:507,550,555`,
  `document-structure.ts:394`, `sqlite-storage-adapter.ts:150-224`,
  `space-state-manager.ts:167,213`, `automerge-host.ts:280,715,993,1050`,
  `collection-synchronizer.ts:361-425`, `echo-host.ts:282,425`,
  `data-space.ts:494,568,636`, `data-space-manager.ts:465-531`,
  `epoch-migrations.ts:36`, `migration-builder.ts:116-209`,
  `document-compaction.ts:28`, `feed-store.ts:487`,
  `credentials.proto` (`Epoch`, `SpaceDeleted`), `epoch.proto`
  (`EpochMonitorConfig`).
- EDGE (dxos/edge @ 8f6f163e): `db-service/src/worker/subduction/
subduction-automerge-replicator.ts` (DO, compaction template :683-800,
  collection-query :1185), `.../subduction/do-sedimentree-storage.ts`
  (schema + dead delete primitives :132-445), `.../space/
space-state-machine.ts:118` (`getAutomergeRoot`), `db-service/src/
durable-objects.ts:39` (rpcMethods whitelist), `edge/src/data-management/
deletion-queue.ts` (whole-space wipe), `automerge/automerge-sync-protocol.
ts:202` (legacy root-reachability filter).
- Related projects: object-merging (`DESIGN.md` §4.3 proposes reusing the
  compaction epoch for merge-loser docs), feed-live-objects (tombstone
  compaction constraint).
