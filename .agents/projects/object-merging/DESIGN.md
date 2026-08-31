# ECHO-level object merging — feasibility research

- **Status**: core merge + worker automation (§4.8) implemented and hardened through
  three adversarial review rounds (decision log 2026-08-02, 2026-08-03 ×2). Not yet
  implemented: relation-endpoint and `meta.tags` rewriting (§4.1 step 5), the doctor
  diagnostic, property-based determinism tests, mixed-version tests, proto-guard
  snapshot, creation-side `db.ensure` API — backlog in TASKS.md
- **Date**: 2026-07-30, revised 2026-08-03
- **Requested by**: Josiah
- **Goal**: allow application state to be initialized into a space independently by
  multiple peers, without coordination, such that objects carrying the same identity
  (meta key + version) deterministically merge into a single object — with all
  references updated to point at the merged object — instead of accumulating
  duplicates.
- **Consumers**: (1) app-state initialization (this doc's primary case); (2) schema
  migrations that split objects (`.agents/projects/lenses/`) will stamp derived
  identity keys on fan-out-created objects and rely on this engine to collapse
  concurrent duplicates — their requirements are folded into §4.1/§4.2, Phase 1,
  and open questions 1/3 below.

## Decision log

- **2026-07-30 (Josiah)** — Merge only distinct-id duplicates that share an identity
  key ("collision class 2"). Do **not** derive object ids deterministically from the
  identity key: same-id-different-document collisions ("collision class 1") remain
  an error condition, as today. Consequences are folded into §4 and §6 below; the
  rejected alternative is recorded in §4.5.
- **2026-07-30 (Josiah)** — Merge direction is deterministic ordering; the winner is
  the minimum `EntityId` among the candidate set (§4.1).
- **2026-07-30 (Josiah)** — Design review of §7. Four of the five questions settled:
  - **Identity field**: a **new dedicated field** on `EntityMeta`, not `meta.key` +
    `meta.version` and not a designated `ForeignKey`. Rationale: `meta.key`/`version`
    mean "the registry entry this instance was created from", which is a provenance
    claim, not an identity assertion — overloading it would make every
    registry-stamped object a merge candidate. The field is **a single opaque
    string**, not a `{ key, version }` struct — exact matching makes the two
    equivalent for matching, and derived keys mean a `version` component could not
    be validated anyway (§4.4). Its name is recorded in §4.4 once ratified.
  - **Version matching**: **exact**. A different version is a different entity,
    which is what allows generational evolution of seeded state. Semver ranges are
    rejected: range membership is not symmetric, which breaks the §4.2 convergence
    argument.
  - **Where the merge runs**: **every client, on space open**. Determinism makes
    redundant execution across peers safe by construction; Phase 0 measures the
    cost and the indexer-triggered variant (§6 Phase 3) remains the end state.
  - **Scope**: **every entity kind that can be stored in the database** —
    `EntityKind.Object`, `.Relation`, and `.Type` (`echo/src/internal/common/types/entity.ts:124-128`)
    — delivered in phases, not restricted to objects. Relations are therefore merge
    _subjects_ eventually, not merely endpoints to be rewritten; the phasing is in §6.
- **2026-07-30 (Josiah)** — **Revises "where the merge runs": on entity load, not on
  space open.** Merging on open has to ask for every entity declaring a convergence key,
  which is unbounded and hydrates all of them just to discover that almost none are
  duplicated — a working-set bloat paid on every open for objects the session may
  never touch. Merging when an entity is hydrated instead makes the cost proportional
  to use, and reduces detection to a **point lookup** (`convergenceKey = X`, normally one
  row) rather than a scan. See §4.7.
- **2026-07-30 (Josiah)** — ~~Merge inside query evaluation~~ — implemented in the
  client's result presentation, then **superseded the next day** (below): writes
  during query evaluation, per-query-instance work, and blindness to id/ref loads
  made it the wrong home.
- **2026-07-31 (Josiah)** — **Merge in the worker, triggered by the indexing
  stream** (option A of the review; §4.8 rewritten). `EchoHost._runUpdateIndexes`
  processes every document change — local writes and replication arrivals, and
  replication is the moment duplicates come into existence on a device. Each batch
  reports the convergence keys it saw (almost always none); a point lookup on the new
  `objectMeta.convergenceKey` column finds collisions; the merge runs on the raw
  automerge documents via the storage-independent core. The client query path keeps
  only a **read-only** filter dropping already-redirected losers. Accepted trade-off:
  the never-see-two guarantee is eventual (~one indexing cycle) rather than
  synchronous — a query racing the merge can briefly see the un-merged pair.
- **2026-08-02 (Josiah)** — **Hardening after an adversarial review of the shipped
  worker path.** The review found the automation had shipped without three
  mechanisms this document declares load-bearing; all are now implemented:
  1. **The straggler fold runs automatically.** Detection includes tombstoned
     rows; a redirected entity that re-indexes (late edits replicating in, or a
     `db.add` restore) has its post-watermark data fields folded into the winner
     and its tombstone re-asserted — which is also what makes `mergedInto`
     sticky without touching the `db.add` path (§4.1 step 4, §4.2).
  2. **The resolver follows `mergedInto`** (sync and async ref resolution), so an
     un-rewritten reference reaches the survivor instead of dangling; reference
     rewriting is an optimization and the old-client compatibility path, as
     designed. `rewriteReferences` also now recurses into arrays and nested
     records (a collection's members live in an array).
  3. **Objects only, enforced.** The then-extant setter rejected relations/types
     and empty keys (accessors dropped 2026-08-31 — engine-layer guards are the
     enforcement); detection filters `entityKind`; the worker re-verifies
     `system.kind` — previously a keyed relation would have been merged with its
     endpoints unreconciled.
     Also fixed: worker `_clone` flattened `RawString` (>300k-char strings) into
     `{val}` maps; the client executor's write guard compared by reference, so
     container-valued winner fields were rewritten (and concurrent nested edits
     clobbered) on every pass; `mergedFrom` was assigned as a whole list, which
     loses ids under concurrent merges (now append-in-place, dedup on read — same
     for `meta.keys`); index rows created before the `convergenceKey` column existed
     were permanently invisible to detection (index-name versioning: the driving cursors were renamed, purging pre-`convergenceKey` progress on upgrade);
     the detection lookup is chunked under SQLite's bound-variable cap; and `@meta`
     no longer leaks into full-text search matching or the reverse-ref index for
     document objects (it briefly made `Query.incoming()` on a Tag return everything
     tagged with it). The query-path filter now keys on the deleted flag rather than
     `mergedInto`, so a restored loser is visible until re-tombstoned instead of
     becoming a live-but-unqueryable zombie.
- **2026-08-03 (Josiah)** — **Second hardening pass, after a fresh adversarial
  review of the hardened code.** Every major finding resolved:
  1. **Worker reads and writes belong to one synchronous block.** The previous
     code snapshotted entities during the awaited doc loads but took diffs,
     watermarks, and redirect chains from the current docs — three distinct ways
     for an edit landing in the load window to fall below `mergedAtHeads` and be
     permanently stranded (including a deterministic single-pass case: a fold
     whose winner was redirected moments earlier in the same batch aborted its
     write yet still advanced the watermark). Now: classification, merge
     computation, watermark heads, and the winner write share one tick;
     `_foldRedirected` re-reads everything fresh and advances the watermark
     **only when the fold write actually applied**; loser callbacks re-verify
     the convergence key (a concurrently re-keyed entity is a new identity, not a
     loser) and deletion (respected, not converted into a redirect); a winner
     deleted during the flush stops the tombstones.
  2. **The trigger is a durable intent log, not a fire-and-forget set.** Natural
     keys are recorded in `convergenceKeyIntents` in the same SQLite transaction as
     the index rows and cursors, and cleared only after the merge pass services
     the key; one throwing group is contained per-group and retried on the next
     pass; a crash between the cursor commit and the merge is recovered at the
     next pass (one runs at every startup). Previously a fault or crash there
     silently dropped detection until an unrelated write touched the same key —
     the actual weakest link in the §4.2 convergence argument.
  3. **Cross-document durability is ordered.** The winner's folded data is
     flushed to storage before any loser tombstone is written, so a crash can no
     longer persist a watermark whose fold never landed.
  4. **The client executor respects deletion** (a user-deleted duplicate is not
     a candidate — previously `db.mergeDuplicates()` could crown a deleted twin
     the winner and vanish every copy, or resurrect deleted data) and skips
     empty-string keys, matching the worker.
  5. **`rewriteReferences` never writes to a merged-away referrer** — such a
     write lands above the tombstone's fold watermark and the worker would carry
     the mechanical rewrite into the winner as if it were a straggler's edit.
     `foldLateEdits` also skips a deleted winner, matching the worker.
  6. **The convergence claim is corrected from canonicity to agreement**
     (§4.1 step 3, §4.2): once an entity is tombstoned it never re-enters the
     field-wise merge; reconvergence happens through watermark folds, which make
     every peer agree but can produce a field value the full-set merge would not
     have chosen. The false "field-wise recompute remains the fallback when
     recorded heads are unavailable" claim is deleted — no such fallback exists.
  7. **Flag story reconciled**: automatic merging runs **unflagged** — the
     Phase 1/2 flag bullets below are the historical plan, superseded by
     shipping unflagged with the worker automation (the earlier §4.6/§5.7
     citations to a dated "no flag" decision pointed at a log entry that did
     not exist; this entry is now that record).
  8. **Natural-key mutation semantics documented** (§4.10): treat the key as
     write-once; what actually happens on re-key/un-key, live and tombstoned.
- **2026-08-03, later (third adversarial review)** — Four majors found and fixed:
  1. **Transitive deletion follows redirects** (§4.1 step 4): `ObjectCore.isDeleted()`
     treats a relation as deleted when an endpoint is, and a child when its parent
     is — and that walk resolved the raw id, never the redirect, so relations and
     children anchored at a merge loser vanished from queries on **new** clients,
     permanently (the previous §4.1/§5.7 framing misfiled endpoint rewriting as an
     old-client compatibility concern; `@parent` was in the same category and
     undeclared). Fixed: the deletion walk follows `mergedInto` chains
     (strictly-decreasing edges, unresolvable hop = live) and judges the survivor.
  2. **Prototype-safe merge accumulation** (`mergeCandidates`/`toMergeCandidate`): the
     field union used `field in data` on a plain object, so field names colliding
     with `Object.prototype` members (`toString`, `constructor`, …) were silently
     dropped from every candidate, and an own `__proto__` key polluted the
     accumulator's prototype. Fixed with Map accumulation.
  3. **The durability rule's dual** (§4.2, §4.8): loser tombstones were written but
     not flushed when the group reported serviced, and the orchestrator then
     synchronously cleared the durable intent — a crash in that window could strand
     live, un-redirected duplicates with no intent left to retry them. Fixed: every
     loser document (and the fold's watermark advance) is flushed before the group
     reports serviced. An intent must never die before the tombstone it claims exists.
  4. **Conflict-aware fold watermark** (§4.2): peers merging the same group
     concurrently each record their own `mergedAtHeads`; automerge keeps one as the
     register value, and a fold diffing from a stale survivor re-presented edits the
     other peer had already folded — overwriting newer winner edits with the loser's
     old value. Fixed: the fold diffs from the **union** of the stored watermark and
     all its register conflicts (`A.getConflicts`), in both engines. Residual,
     accepted: the concurrent folds' _value_ writes on the winner still race as
     ordinary register writes — sequential straggler edits observed by different
     folders can deterministically resolve to the earlier value (agreement holds;
     the later value remains on the tombstone under `deleted: 'include'`).
- **2026-08-13 (dmaretskyi PR review; Josiah ratified)** — Structural review of
  PR #12412; no semantic findings ("the approach with `mergedInto` seems right").
  Four restructurings, all behavior-preserving:
  1. **The public `Merge` namespace is dissolved.** Users declare identity with
     `Entity.setConvergenceKey` / `Entity.getConvergenceKey` (beside the other meta
     accessors); the machinery moved to `@dxos/echo/internal` as `mergeCandidates`,
     `toMergeCandidate`, `findMergeDuplicates`, `resolveMergeRedirect`
     (`src/internal/Merge/`). `selectWinner` was deleted (its min-id semantics live
     inside `mergeCandidates`); `groupByConvergenceKey` became a private helper.
  2. **Index-name versioning replaced the cursor wipe.** The driving cursor names
     bumped (`fts5` → `fts6`, `reverseRef` → `reverseRef2`) and the old names purge
     via `DEPRECATED_INDEX_NAMES` — the tracker's existing declarative mechanism —
     retiring the `pragma_table_info` probe, the `DELETE FROM indexCursor`, and its
     wipe-before-ALTER ordering subtlety.
  3. **The intent log moved out of the indexer** into `ConvergenceKeyIntentStore`
     (index-core), joining the same `SqlTransaction` in `IndexEngine.#update` — the
     coupling was transactional, never conceptual.
  4. **`convergence-key-merge.ts` became a class.** `ConvergenceKeyMerger` takes the
     narrow `loadDoc`/`flushDoc`/`queryByConvergenceKeys` seam as constructor deps
     (tests keep driving it with plain fakes); `EchoHost` constructs it once.
     Also proposed in review, **declined (Josiah)**: renaming the field to
     `singletonKey` plus `Database.querySingleton`/`ensureSingleton` APIs — the name
     reads as a write-time uniqueness guarantee the engine deliberately does not make
     (§4.4); the API sketch is noted against the Phase-2 `db.ensure` item.
- **2026-08-13, later (Josiah)** — **The field is renamed `naturalKey` →
  `meta.convergenceKey`** (§4.4), resolving the review's naming thread with a
  different name than the reviewer's proposal. `convergenceKey` names exactly the
  guarantee the engine makes — entities sharing the key converge to one,
  _eventually_ (convergence is a process word, so the eventual-ness that made
  `singletonKey` dishonest is built in) — and it is house vocabulary in a
  local-first codebase, where "natural key" required relational-database
  background the reviewer flagged as meaningless to him. It also retires
  `naturalKey`'s recorded accepted cost: the new name does hint that stamping it
  opts the entity into active behavior. Accepted in exchange: it names the
  consequence rather than the caller's assertion, and it is long — tolerable for
  an advanced, mostly-internal feature. Everything renamed in one pass
  (accessors, index column, intent store, merger class, migrations) — safe while
  nothing has shipped.
- **2026-08-31 (dmaretskyi second review round; Josiah ratified the API change)** —
  Structural follow-ups, all landed:
  1. **The `Entity.get/setConvergenceKey` accessors are dropped.** The setter
     wrapped `Entity.update`, which defeats batching (house rule: the consumer
     owns the update callback), and its validation was advisory, not
     load-bearing — detection, the worker, and the client executor each ignore
     keyed relations and empty strings, because the field replicates from peers
     that cannot be trusted to have validated it. The API is the meta field
     itself: `Entity.update(x, (x) => { Entity.getMeta(x).convergenceKey = '…' })`.
     Accepted cost: no fail-fast throw on a mistaken key; the schema field's doc
     comment carries the contract.
  2. **`internal/Merge/` → `internal/common/merge.ts`** — the directory implied a
     `Merge` API module that no longer exists.
  3. **Merge/convergence suites moved to `echo-client-e2e`**, beside the other
     integration suites; the merge executor is exported from `@dxos/echo-client`
     for them.
  4. **Worker success-path logging**: merged groups (key/winner/losers), serviced
     redirects (folded fields, tombstone re-assertion), intent take/clear.
  5. **`_queryIncludesDeleted` walks the typed `QueryAST`** via its visitor.
  6. Intent semantics documented at the reviewer's request (an intent means
     "check this group", not "duplicates exist").
     **Open from the same round**: `db.mergeDuplicates()`'s `Filter.everything()`
     scan (Josiah: a footgun to design away — see §4.11) and, contingent on that,
     moving the shared merge core host-side (blocked today by the client executor's
     use of it; the resolver's `resolveMergeRedirect` is the only load-bearing
     client dependency).

---

## 1. Problem statement

Two peers (or two devices of one identity) open a space and each runs "ensure my
plugin's state exists". Today every such site is check-then-create, which is only
safe within one process. Across peers, both checks miss, both create, and after
replication the space permanently holds duplicates.

Desired semantics:

1. An object may declare an **identity key** (meta key + version).
2. If two objects in the same space have the same identity key and version, they
   are **merged deterministically** — every peer that performs the merge (possibly
   concurrently, possibly on different snapshots) converges to the same final state.
3. All references to the merged-away object are updated to point at the survivor.
4. This makes uncoordinated, per-peer initialization of application state safe.

## 2. Evidence that the problem is real (observed in-tree)

| Site                                                                                          | Failure mode                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/plugins/plugin-assistant/src/hooks/useTraceMessages.ts:24-32`                       | **Observed in production**: trace-feed creation races (indexer lookup misses a not-yet-indexed feed), so a space holds several trace feeds; the hook works around it by querying across _all_ of them. |
| `packages/sdk/client/src/echo/space-proxy.ts:448-470`                                         | `space.properties` resolves only when `query.results.length === 1` — a duplicate `SpaceProperties` makes `waitUntilReady()` **hang forever**.                                                          |
| `packages/sdk/app-toolkit/src/types/CollectionModel.ts:58-61`                                 | Duplicate `SpaceProperties` → thrown invariant ("more than one is corruption").                                                                                                                        |
| `packages/sdk/app-toolkit/src/types/CollectionModel.ts:72-90`                                 | Lazy root-collection creation: two peers filing into an un-scaffolded space each mint a `Collection`; LWW on the annotation orphans one collection's contents.                                         |
| `packages/plugins/plugin-space/src/capabilities/spaces-ready.ts:73-95`                        | `SHARED` space-order Expando: textbook check-then-create, guarded only within one peer.                                                                                                                |
| `packages/plugins/plugin-github/src/operations/sync.ts:552-571`                               | Semaphore serializing Person upserts — fixes the **intra**-peer race only; the identical inter-peer race is unaddressed.                                                                               |
| `packages/core/echo/echo-client/src/proxy-db/database.ts:510-526`                             | `db.addType` check-then-create: two peers persisting the same schema produce two `PersistentSchema` objects.                                                                                           |
| Plugin default content (`plugin-table`, `plugin-thread`, `plugin-assistant` PLUGIN.mdl files) | "Create default Task Table / General channel / assistant objects on space create" was **removed** — plausibly because it duplicated. This is exactly the feature the merge is meant to re-enable.      |

Dedup-by-key logic is currently re-implemented at least four times with divergent
semantics (`echo/src/internal/common/types/meta.ts:105-109`,
`echo-client/src/echo-handler/util.ts:19-27`, `link/src/Cursor.ts` dedup set,
`plugin-ibkr/src/services/instrument.ts`), plus the generic
`assistant-toolkit/src/sync/sync.ts:20-109` (`syncObjects`/`copyObjectData`) and
`extractor/src/getOrCreate.ts` — all per-peer, post-hoc, non-atomic.

## 3. Current architecture facts that constrain the design

### 3.1 Storage topology

- One Automerge document per object by default (`placeIn: 'linked-doc'`); the space
  root doc (`DatabaseDirectory`) maps `links[objectId] → docUrl`, or holds the object
  inline under `objects[objectId]` (`echo-protocol/src/document-structure.ts:29-80`,
  `echo-client/src/core-db/entity-manager.ts:502-543`).
- Object identity = `EntityId` (ULID, time-prefixed, lexicographically sortable),
  read-only through the proxy (`echo-handler.ts:349-352`). The id is the map key —
  it is not stored inside the entity structure.
- **Concurrent creation of distinct ids is conflict-free**: different map keys, both
  survive. The pathological case is _same key, different documents_: `links[id]` is
  LWW, the losing document is orphaned (client warns:
  `entity-manager.ts:1340-1346`). Per the decision log, this stays an error
  condition — the design below never routes normal operation through it.
- Convergence is guaranteed by Automerge **per document only**. Two documents
  without shared ancestry cannot be CRDT-merged (the "two-roots" problem —
  `echo-client/docs/VERSIONING.md`). Duplicates created independently by two peers
  therefore never share ancestry, so the merge must be a deterministic function of
  the two states, not an Automerge merge.
- Deletion is a tombstone (`system.deleted`, `entity-manager.ts:545-548`); the doc
  keeps replicating; `db.add` un-deletes; real unlinking exists
  (`unlinkObjects`, `entity-manager.ts:550-571`) but is not wired to `remove`. No GC.
- `atomicReplaceObject(id, {data, type, meta})` replaces an object's content
  in-place, id-preserving, in one change (`entity-manager.ts:573-609`).
- Epochs replace the root document (`REPLACE_AUTOMERGE_ROOT`) and are the existing
  vehicle for offline compaction/rewrites (`sdk/migrations/src/migration-builder.ts`).
  Epochs are _not_ CRDT operations; concurrent unconverged edits are lost.

### 3.2 Identity metadata

- `EntityMeta` (`echo/src/internal/common/types/meta.ts:47-85`) already carries
  **both** candidate identity fields:
  - `keys: ForeignKey[]` where `ForeignKey = { source, id }` — **no version field**
    (`echo-protocol/src/foreign-key.ts:8-28`);
  - `key?: string` (FQN registry key) **paired with `version?: string` (semver)** —
    already used to address functions/scripts/types, already queryable with semver
    ranges via `Filter.key(key, { version })` (`echo/src/Filter.ts:165-194`).
- `Filter.foreignKeys(type, keys)` exists (`Filter.ts:230-241`) but **requires a
  typename** and is **not index-backed**: the planner refuses the index fast path
  (`echo-host/src/query/query-planner.ts:1164-1172`); the `objectMeta` SQLite table
  has no key columns (`index-core/src/indexes/entity-meta-index.ts:119-153`).
  Every key lookup today is a type scan + linear post-filter — this is _why_ the
  trace-feed race happens (lookup can miss a not-yet-indexed object).
- `EntityId.deterministic(...seed)` exists (`common/keys/src/entity-id.ts:37-140`)
  but is used only for **in-memory** `Type.Type` declarations — chiefly to avoid
  RNG calls at module top-level under workerd (`echo/src/internal/Entity/entity.ts:233-241`).
  The persisted copy discards the deterministic id and mints a random one
  (`proxy-db/database.ts:423-427`). No persisted, replicated object uses
  deterministic ids today, and per the decision log none will as part of this work.

### 3.3 Reference model

- Refs are `{'/': uri}` (`EncodedReference`) holding an `echo://…` EID
  (`echo-protocol/src/reference.ts:14-37`; `common/keys/src/EID.ts`). Cross-space
  refs are encodable but resolution throws "not yet supported"
  (`echo-client/src/hypergraph.ts:571-574`).
- **A backlink index already exists**: SQLite `reverseRef(recordId, targetDXN,
propPath)` (`index-core/src/indexes/reverse-ref-index.ts`), surfaced as
  `Query.referencedBy()` (`echo/src/Query.ts:101-106`). Relation endpoints and
  `parent` are queryable via `objectMeta.source/target/parent`
  (`entity-meta-index.ts:267-290`).
- Rewriting gaps (the places a naive "update all refs" would miss):
  1. Relation `source`/`target` have **no public mutation API** (getters only,
     `Relation.ts:252-302`) — though `ObjectCore.setSource/setTarget` exist
     internally (`object-core.ts:465-519`).
  2. `system.type` / `@parent` / relation endpoints serialize as bare EID strings in
     JSON, so `EncodedReference`-walking traversals miss them.
  3. Feed/queue items are append-only whole-object blocks — a rewrite re-appends
     the object (last-flush-wins).
  4. Id-keyed side maps (`sdk/schema/src/TagIndex.ts`, `StateMap.ts`) and markdown
     body links (`[label](echo:/<id>)`) are invisible to the reverse-ref index.
  5. `reverseRef` has no `spaceId` column (scoping requires the `objectMeta` join).
- Dangling refs degrade unevenly: `ref.target` → `undefined`; `ref.load()` throws a
  bare `Error`; strong-dependency gating leaves dependents permanently unsurfaced;
  UI mostly silently drops. `plugin-doctor` has a read-only dangling-ref diagnostic.

### 3.4 Existing prior art in-tree

- **Feed index collapse-by-id**: two peers appending the same-id object to a feed
  converge to one visible item (`echo-protocol/src/echo-feed-codec.ts:20-24`) — an
  existing precedent for id-keyed convergence, with an open TODO asking for
  field-level merge.
- **`copyObjectData`** (`assistant-toolkit/src/sync/sync.ts:72-109`): field copy +
  foreign-key union — the merge semantics we want, at the wrong layer.
- **`Migrations`/epochs**: id-preserving offline rewrite with full control over the
  new root (`sdk/migrations/`).

---

## 4. Feasibility assessment

**Verdict: feasible.** The mechanism is a single **convergent merge engine**:
duplicates are detected by identity key, merged by a deterministic algorithm, and
the merged-away object becomes a replicated redirect. Object id semantics are
untouched — ids stay random, and the same-id-two-documents anomaly (collision
class 1) remains an error, exactly as today.

### 4.1 The merge algorithm

For objects in the same space sharing an identity key + version:

1. **Detect**: query objects grouped by identity key (+ version). Spike: type scan +
   post-filter (what `Filter.foreignKeys` does today). Later: index-backed (§6
   Phase 3).
2. **Choose the winner deterministically**: minimum `EntityId` (ULID sort — also the
   earliest-created, a nice semantic). Pure function of the candidate id set.
3. **Merge data deterministically, over the whole candidate set**: the merged
   state is a pure function of the **complete set of duplicates visible to the
   peer**, applied to the winner as **one Automerge change that writes only the
   fields whose values differ** from the computed result — per-field writes, not a
   whole-object replace (an `atomicReplaceObject`-style replace rewrites every
   field, so a concurrent user edit to a property the merge never touched would
   lose the LWW; empty window for init-state objects, but Phase 4 generalizes to
   user data). And NOT a pairwise fold. Pairwise winner-preference is not associative (for ids
   `Z < X < Y` where `Z` lacks field `a`, merging `X` then `Y` into `Z` yields a
   different `a` than `Y` then `X`), so different application orders would diverge.
   Instead, per field: take the value from the **smallest-id candidate that defines
   the field**; `meta.keys`: union deduplicated by `(source, id)` and sorted
   lexicographically. This is permutation-independent for a given candidate set.
   Peers with different candidate sets can still transiently write different
   results — Automerge's field-level conflict resolution keeps the winner document
   convergent in the interim, and losers are retained as tombstones (step 4) so
   their states stay reachable. Note the guarantee is **agreement, not
   canonicity**: once an entity is tombstoned it never re-enters the field-wise
   merge — later passes reconcile through the watermark fold (§4.2), which carries
   a tombstone's post-merge state onto the survivor. Every peer converges to the
   same final state, but a field folded after tombstoning can land on a winner
   that had defined it, so that final value may differ from what the field-wise
   function would return over the union of all candidates. Duplicates never share
   Automerge ancestry (§3.1), so this function — not an Automerge merge — is the
   only merge path; lossy at field granularity by design (see risk table).
4. **Redirect, don't erase**: write `system.mergedInto: <winnerId>` (plus
   `system.mergedAtHeads` — the loser's heads at merge time, used by the straggler
   fold in §4.2) on the loser and tombstone it (`system.deleted = true`). The loser keeps replicating (this is
   essential — late peers must be able to run the same merge and follow the
   redirect). `mergedInto` is **sticky and authoritative** — implemented in the
   worker rather than by special-casing `db.add`: a restore un-deletes the loser
   (§3.1), which re-indexes it, and the worker folds any edits made since the
   watermark into the winner and re-asserts the tombstone. A stale offline peer
   that re-adds or keeps editing the loser converges the same way, never a
   revived duplicate. The ref resolver **follows `mergedInto` transitively**
   (implemented 2026-08-02, sync and async paths) — this makes the system robust
   to the **same-space** rewrite gaps in §3.3 (Markdown links, feed blocks, refs
   created concurrently with the merge). **Transitive deletion follows the
   redirect too** (implemented 2026-08-03): a relation whose endpoint — or a child
   whose `@parent` — is a merge loser is judged at the chain's survivor, so it
   stays visible while the survivor lives; deleting the survivor hides it, as
   deleting the loser would have before the merge. Cross-space inbound refs are
   explicitly **not** covered: cross-space resolution throws "not yet supported"
   today (`hypergraph.ts:571-574`), so a redirect on the loser can't be followed
   from another space; they dangle exactly as they would for any deleted object
   until cross-space resolution exists.
5. **Rewrite inbound references opportunistically** — _partially implemented_:
   data-ref rewriting (including refs nested in arrays and records) exists in the
   client executor behind `db.mergeDuplicates()`, and never writes to a
   merged-away referrer (a tombstone write lands above its fold watermark and
   would be carried into the winner as a fake straggler edit). Still open:
   `meta.tags`, relation endpoints, and `@parent` (`objectMeta.queryRelations` →
   the existing `ObjectCore.setSource/setTarget`, to be exposed as a named
   internal API). Since 2026-08-03 these gaps are **visibility-safe on new
   clients** — the deletion walk and the resolver both follow redirects (step 4) —
   so what un-rewritten system refs still cost is: index-based traversal
   (`Query.relationsOf(winner)` misses relations whose stored endpoint is the
   loser id) and the old-client compatibility posture (§5.7). Rewriting
   `X→loser` to `X→winner` is idempotent, so concurrent rewriters converge; refs
   that are never rewritten still resolve via the redirect for new clients.

### 4.2 Convergence under concurrent merging

The key correctness argument, for peers acting on different views:

- Peer A sees duplicates `{X, Y}` (winner X); peer B sees `{X, Y, Z}` with
  `Z < X` (winner Z). A writes `Y.mergedInto = X`; B writes `Y.mergedInto = Z` and
  `X.mergedInto = Z`. LWW on `Y.mergedInto` picks either — both terminate at Z by
  transitive redirect, because **every redirect edge points to a smaller id**, so
  chains are finite, acyclic, and end at the global minimum. Re-running the merge
  (it must be idempotent and cheap when there's nothing to do) collapses chains;
  a manual `db.mergeDuplicates()` pass additionally re-rewrites refs to the final
  winner (the worker never rewrites refs — resolution follows the redirect).
- Merges of data are re-runnable, and **stragglers keep their edits**: the merge
  records the loser's heads at merge time (`system.mergedAtHeads`, written in the
  same change as `mergedInto`). A later pass diffs the loser from those heads
  (`A.getHeads`/`A.diff` — precedent in `echo-handler/edit-history.ts:76-77`) and
  folds **exactly the late edits** into the winner as per-property writes, instead
  of re-running the field-wise merge (which would prefer the smallest-id candidate
  and could discard the straggler's change). There is **no fallback** when the
  watermark is missing: the pair is written atomically, so a redirect without a
  watermark indicates corrupt data, and the fold declines rather than guessing.
  The fold's own discipline (2026-08-03): value, diff, and watermark are read from
  one document state in one synchronous block, the redirect chain is resolved over
  current state (a chain collapsed earlier in the same pass is followed to its
  live end), and the watermark advances **only when the fold write applied** —
  otherwise the edits stay above it for a later pass. The winner's folded data is
  flushed durably before the watermark is written, since the two live in different
  documents with no cross-document write ordering. The watermark is read as the
  **union of the stored register value and all its conflicts** (2026-08-03, both
  engines): concurrent merges each record their own `mergedAtHeads`, and diffing
  from a stale LWW survivor would re-present edits the other peer already folded —
  writing the loser's old value over newer winner edits. Residual, accepted: the
  concurrent folds' value writes on the winner race as ordinary register writes,
  so sequential straggler edits observed by different folders can resolve to the
  earlier value — deterministically, on every peer (agreement holds; the later
  value stays readable on the tombstone).
- **The "later pass" is the worker itself, not an optional cleanup** (2026-08-02):
  a straggler's edit replicates onto the tombstone and re-indexes it, detection
  includes tombstoned rows, and the worker folds the changed fields into the
  resolved winner and advances the watermark. Without this, the reconvergence
  argument above would be vacuous — the original trigger only examined live rows,
  so a tombstoned loser was never revisited and late edits (including data folded
  onto an entity that a concurrent merge then tombstoned) were stranded forever.
- **Every detected duplicate is eventually serviced** (2026-08-03): the trigger is
  a durable intent log written in the same transaction as the index cursors, so a
  crash, a faulted merge pass, or one bad group cannot silently drop detection —
  unserviced keys are retried on the next indexing pass, and one pass runs at
  every startup. The clear side honors the dual of the fold's durability rule
  (2026-08-03, later): every loser document — tombstones and watermark advances —
  is flushed before the group reports serviced, because the orchestrator clears
  the intent synchronously on that report; an intent must never die before the
  tombstone it claims exists. An unloadable member document is the one deliberate
  exception: the subset merge is safe, and the document's eventual arrival is
  itself an indexed write that re-presents the key.

### 4.3 GC (later)

Merged-away tombstones accumulate. An epoch-based compaction
(`compactDocumentsEpochMigration` precedent) can eventually drop loser documents
and inline redirect stubs into the root doc. Not needed for correctness.

### 4.4 The identity field

**Decided (2026-07-30): a new dedicated field on `EntityMeta`.** The two existing
candidates were both rejected as the identity carrier:

1. **`meta.key` + `meta.version`** (FQN + semver, `meta.ts:55-65`) — the closest fit,
   and it already has a semver-aware filter (`Filter.key`). Rejected because its
   documented meaning is provenance ("the canonical registry entry the object
   instance was created from"), not identity. Overloading it would silently make
   every registry-stamped object in a space a merge candidate, and would couple the
   merge engine to registry semantics that evolve for unrelated reasons.
2. **`meta.keys: ForeignKey[]`** (`foreign-key.ts:8-28`) — the sync-pipeline
   identity: multi-alias, source-scoped, **no version field**. Merging on foreign
   keys is the Phase-4+ generalization (it subsumes `syncObjects`, `getOrCreate`,
   plugin-ibkr's alias folding), but multi-key alias identity makes winner selection
   and key-union semantics subtler — alias sets can _become_ overlapping later,
   which retroactively merges entities that were previously distinct. Defer, then
   map onto the dedicated field.

**Shape: a single opaque string** (decided 2026-07-30), not a `{ key, version }`
struct. The version is encoded by the caller inside the string if it wants
generations (`com.example.seed@2`), and gets distinct-entity semantics for free
because the strings differ. Rationale:

- Since matching is exact, struct equality is **identical** to string equality on a
  composed key — the split buys the engine nothing.
- Derived, non-registry keys are admissible (see below), so a `version` component
  could not be validated as semver either. A struct whose second component is an
  arbitrary optional string is a two-part string with extra ceremony.
- It keeps the engine un-opinionated about the key's internal structure, which is
  the property that lets unrelated consumers (seeding, migrations) share one field.
- Phase 3 indexing is cheaper: one column and a plain equality lookup, rather than a
  composite key.

The consequence accepted: nothing can group by "the same key across versions"
generically — e.g. a diagnostic that wants to find a previous generation to migrate
from. That requires a convention the caller owns, not engine machinery.

The field is independent of `meta.version`, so identity and provenance may disagree:
an entity can be seeded from registry entry `1.2.0` while its identity string names
generation `2`, or names no generation at all.

**Name: `meta.convergenceKey`** (renamed 2026-08-13; originally `meta.naturalKey`,
ratified 2026-07-30). The current name states the guarantee the engine makes:
entities sharing the key converge to one — eventually, because convergence is a
process, which is exactly the invariant's strength (no write-time enforcement is
implied). It is native vocabulary in a local-first codebase — §4.2's argument is
literally a convergence argument — and it self-documents that stamping the key
opts the entity into active behavior.

The original name, `naturalKey`, named what the caller asserts rather than what
the system does — the relational natural-key-beside-surrogate distinction
(`EntityId` being the surrogate) — but review feedback (2026-08-13) flagged that
reading it requires relational-database background, and its recorded accepted
cost was that nothing about it hinted at the merge consequence. The rename trades
that for the opposite cost: `convergenceKey` names the consequence rather than
the assertion, and it is long — tolerable for an advanced, mostly-internal
feature.

The alternatives each misdescribed something: `canonicalKey` is wrong on the
entities that matter (both duplicates carry the key, including the loser — only one
is canonical); `singletonKey` implies write-time uniqueness enforcement, which was
rejected along with deterministic ids (before the merge runs there genuinely _are_
two entities with the key, so the invariant is eventual); `mergeKey` names the
mechanism narrowly, reads oddly on an entity that never has a duplicate, and
shades toward destruction — losers persist as redirects rather than being merged
away. `identity`/`identityKey` were excluded outright — `IdentityKey` is the HALO
identity public key across 17 files, so the collision would be actively misleading.

The candidates weighed, for the record (`naturalKey` was chosen 2026-07-30;
`convergenceKey` superseded it 2026-08-13):

| Candidate        | Reads as                                                                                                     | Against                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `convergenceKey` | The guarantee itself: entities sharing the key converge to one, eventually.                                  | Names the consequence, not the assertion; long.                                             |
| `naturalKey`     | Standard relational term: the natural key beside the surrogate key (`EntityId`). Precise about what it _is_. | Assumes DB vocabulary; understates the merge consequence.                                   |
| `singletonKey`   | States the invariant exactly: at most one live entity per `(space, key)`.                                    | Reads as write-time enforcement; "singleton" carries OO baggage.                            |
| `mergeKey`       | Most obvious at the call site: same `mergeKey` ⇒ merged.                                                     | Names the mechanism, not the property; reads oddly on an entity that never has a duplicate. |
| `canonicalKey`   | Pairs with the winner/redirect vocabulary (`mergedInto`).                                                    | "Canonical" describes the winning entity, not the key.                                      |

### 4.5 Rejected alternative: deterministic object ids

Deriving the object id from the identity key (`EntityId.deterministic(key,
version)`) would prevent duplication by construction and avoid all reference
rewriting. **Rejected (decision log)**: it converts key collisions into
same-id-different-document collisions, which the storage layer treats as an
anomaly (LWW on `links[id]`, losing document silently orphaned,
`entity-manager.ts:1340-1346`) — routing normal operation through an error-recovery
path. Making that path safe would require additional machinery (e.g. shared-ancestry
bootstrap changes) whose complexity is not justified when the merge engine handles
the distinct-id case anyway. Class-1 collisions therefore remain errors; optionally,
Phase 2's doctor diagnostic can surface them explicitly instead of a log warning.

### 4.7 Where the merge runs: on load, not on open — SUPERSEDED by §4.8

**Decided 2026-07-30, revising "client on space open"; superseded 2026-07-31.** The
load-path hook was never built: the worker/indexing trigger (§4.8) is write-driven,
so it covers entities reached by id or reference without any per-load hook, and the
`meta.convergenceKey` index this section called for shipped as part of §4.8. Kept for
the reasoning about why space-open scanning was wrong.

Merging on space open was implemented and reverted (see the ledger). Detection had to
enumerate every entity declaring a convergence key, so it scanned and hydrated the whole
space — which broke three tests asserting lazy loading, and is bloat paid on every
open for objects the session may never touch.

The trigger is **entity hydration** instead. When an entity carrying a convergence key is
loaded, look for others with the same key; merge only if more than one exists.

Why this is the better shape:

- **Cost is proportional to use.** An entity never loaded never costs anything.
- **Detection becomes a point lookup.** `convergenceKey = X` returns one row in the
  common case and hydrates nothing extra, versus "every row with a convergence key",
  which hydrates everything to discover that almost none are duplicated.
- **It fits the existing planner.** An equality filter on an indexed column is the
  same shape as the typename fast path, rather than a novel "all non-null, grouped"
  query needing its own selector.
- **A duplicate cannot be observed without triggering the merge**, because anything
  that would surface it — a query returning both, a reference resolving to one — must
  hydrate it first. So laziness does not let unmerged duplicates leak somewhere that
  eager merging would have caught.

Consequences to design for:

- **Re-entrancy.** The merge hydrates the other candidates, which would re-trigger the
  merge; needs an in-flight guard keyed by convergence key.
- **Convergence is unaffected.** The merge function is deterministic and idempotent,
  so _when_ it runs does not change what it computes — only how soon peers converge.

### 4.8 The merge runs in the worker, off the indexing stream

**Decided 2026-07-31, superseding both "on space open" (§4.7's revision target) and
"inside query evaluation" (implemented for a day, then moved).**

`EchoHost._runUpdateIndexes` — in the worker — processes every document change:
local writes and remote replication arrivals. Replication is the moment a duplicate
comes into existence on a device, so this is the earliest possible trigger, and it
fires exactly once per device regardless of how many tabs or clients are open.

Mechanism:

1. Convergence keys seen in an indexing batch are recorded as **durable intents**
   (`convergenceKeyIntents` table) in the same SQLite transaction that commits the
   index rows and cursors — almost always none. The intent, not an in-memory set,
   is the trigger: it is cleared only after the merge pass services the key, so a
   crash or a faulted pass leaves it in place and the next pass (one runs at
   every startup) retries. One throwing group is contained per-group; the rest of
   the batch proceeds.
2. A point lookup on the `objectMeta.convergenceKey` column (new, indexed on
   `(spaceId, convergenceKey)`) returns the rows sharing the pending keys; a key with
   more than one row is a duplicate group. Cost is proportional to writes that
   carry a convergence key — nil for everything else.
3. The merge runs on the **raw automerge documents** (`db-host/convergence-key-merge.ts`)
   via the storage-independent `Merge` core — no live proxies exist host-side.
   Documents are loaded first (the only await); then classification, the merge
   computation, the losers' watermark heads, and the winner write happen **in one
   synchronous block**, so nothing replicated can interleave between a read and
   the write derived from it — index rows are derived state and every member is
   re-verified against its document in that block.
4. The winner's folded data is **flushed durably before the loser tombstones are
   written**: winner and losers live in different documents with no cross-document
   write ordering, and a crash that persisted a watermark without its fold would
   strand the loser's state below a watermark nothing re-reads. The loser
   callbacks re-verify after the flush (an existing redirect, a changed key, or a
   deletion that landed during it wins), and a winner deleted during the flush
   stops the tombstones entirely.
5. The merge's own writes fire `documentsSaved`, which re-indexes the tombstones and
   invalidates queries — the indexer is already the sole query-invalidation source,
   so losers leave query results everywhere with no new plumbing.
6. **Redirected entities are serviced, not ignored** (2026-08-02): detection
   includes tombstoned rows, and a loser that re-indexes — a straggler's late
   edits, or a `db.add` restore — has its post-watermark data fields folded into
   the resolved winner and its tombstone re-asserted. This is the automatic
   straggler fold of §4.2 and the sticky-tombstone rule of §4.1 step 4, in one
   mechanism; the fold's read/watermark discipline is in §4.2.

The client keeps a **read-only** presentation filter (`query-result.ts`) that drops
entities the index still reports live — keyed on the **deleted flag** (written in
the same change as the redirect), not on `mergedInto`, so a restored loser stays
visible until the worker re-tombstones it rather than becoming live-but-unqueryable.
No write happens on any read path.

Trade-off accepted with the decision: the never-see-two guarantee is **eventual**
(~one indexing cycle) rather than synchronous. A query racing the merge can briefly
return the un-merged pair; reactive queries re-emit and settle, one-shot callers see
the same state a slightly earlier call would have.

Rules the implementation had to learn (each one a bug first):

- **`objectStructureToJson` omitted `@meta` entirely**, so the indexer could never
  see a convergence key — the whole trigger was silently inert. It now includes the meta
  section, matching the feed path, whose blocks always carried it.
- **Query results are not unique** — the same entity can appear twice before
  presentation dedupes. Merging a repeat treated it as a duplicate of itself and
  tombstoned the winner; `mergeCandidates` now deduplicates by id.
- **A query asking for tombstones must not filter.** `deleted: 'include'` exists to
  show what was merged away; the option can sit at any AST depth because scoping
  wraps it.
- **Objects only, and only automerge-backed ones** — enforced, not assumed:
  keyed relations and types are ignored at every engine layer, detection filters on
  `entityKind`, and the worker re-verifies `system.kind` against the document.
  (An earlier draft claimed reading meta off a relation throws — it does not;
  without the explicit guards a keyed relation was merged with its endpoints
  unreconciled.) Feed entities have no document to merge (out of scope, §4.6).
- **`@meta` in the serialized JSON must not reach the other indexes.** Emitting it
  (the fix above) fed the same payload to full-text search and the reverse-ref
  index: FTS matched on identity strings the visible content never contains, and
  `meta.tags` refs made `Query.incoming()` on a Tag return everything tagged with
  it. Both now strip `@meta` for document objects; queue blocks always carried it
  and are unchanged.
- **Index rows from before the column exist see nothing.** Re-indexing is
  per-object, so an unchanged object never repopulates its row — a duplicate whose
  other copy predates the upgrade would be missed forever. The migration resets
  the index cursors once when it detects the column being added to an existing
  table, forcing a full re-index. The reset runs **before** the `ALTER TABLE`:
  migration statements auto-commit individually, and a crash between them must
  re-run the wipe on the next startup rather than see the column and skip it.
- **A snapshot taken across an `await` is a different state than the doc.**
  Entities read during the doc-load loop went stale by write time — the diff and
  watermark came from the current doc while the folded values and redirect chain
  came from the load-time snapshots, which is how straggler edits could fall below
  the watermark and be permanently stranded (three distinct variants, one of them
  deterministic within a single batch). The rule: read, compute, and write in one
  synchronous block, and gate every watermark advance on the fold write actually
  applying.
- **Tests that stage a partial-view merge must do it in the same tick as the adds**
  — once the documents save, the worker sees them, and any client-staged
  intermediate state races it. Both engines compute the same pure function, so
  final-state assertions are engine-agnostic; only order-dependent intermediate
  assertions need the same-tick staging.

### 4.9 Proactive merging composes with the lazy path

Nothing here forecloses a background process (worker-side, or an indexer hook per §6
Phase 3) that merges duplicates before anyone asks for them. Because the merge is a
pure function of the candidate set and idempotent, it does not matter _who_ runs it
or _when_: a worker and a querying client racing on the same duplicates converge, and
whichever runs second finds nothing to do.

The reason to want one is not throughput but **divergence exposure**. Duplicates that
stay unmerged accumulate independent edits, and the merge function is lossy at field
granularity (§4.1 step 3) — for a field both copies define, the smaller-id value wins
and the other is dropped. The straggler fold (§4.2) cannot help, because it diffs from
`mergedAtHeads`, which only exists once a merge has happened; divergence _predating_
the merge has no watermark to recover from.

So the sequencing is lazy-first for correctness, proactive-later to shrink the window
in which divergence can accumulate — not either/or.

### 4.10 Mutating the convergence key (decided 2026-08-03: treat as write-once)

The key is an identity assertion, and identity assertions are not meant to be
revised — the guidance is **set it at creation and never change it**. The engine
does not hard-enforce this (the field is an ordinary meta property any peer can
write), so the semantics of a mutation are pinned down here rather than left to
whatever the code happens to do:

- **Re-keying a live entity declares a new identity.** It leaves its old merge
  group and joins the new key's group from its next indexed write. A merge in
  flight aborts against it: both the winner-side and loser-side change callbacks
  re-verify the key, so a concurrently re-keyed entity is neither folded nor
  tombstoned (regression-tested).
- **Redirects are by id, not key** — `system.mergedInto` resolution is unaffected
  by any key change on any participant. Nothing dangles.
- **Re-keying a tombstoned loser strands its straggler edits, not its identity.**
  The tombstone stays sticky (the loser is serviced under whatever key it now
  carries, and `deleted` is re-asserted), but the fold is key-scoped: the winner
  is not in the new key's group, so post-watermark edits wait — they fold if the
  key is restored. **Un-keying** a tombstoned loser removes it from servicing
  entirely: the redirect still resolves, but a `db.add` restore of it would stick
  (no re-assert) as a live object that happens to carry a stale `mergedInto`.
- **Re-keying or un-keying a winner** leaves its tombstones redirecting to it (by
  id), while their folds decline until a key groups them together again. A new
  entity claiming the winner's old key coexists with the old winner: the "at most
  one live entity per key" invariant is over entities _currently carrying_ the
  key, not over the key's history.

None of these corrupts data or breaks resolution — the failure mode is stranded
late edits on a tombstone whose group no longer contains its winner. If key
mutation ever becomes a real workflow, the candidate hard guard is
a write-time guard throwing on a merged-away entity — which would first require
reintroducing a setter (accessors dropped 2026-08-31) and `mergedInto` visibility
at the `Obj` layer, neither currently exposed.

### 4.6 Principal risks

| Risk                                                                                                                                                                                            | Severity                       | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Redirect-following in the resolver adds a hop to every unresolved load                                                                                                                          | Low                            | Only consulted on miss/tombstone — but the failed-resolve path is the common dangling-ref path, and the async follow adds a tombstone-inclusive query to it. **Unmeasured** (Phase 0 was skipped); measure before Phase 4 adoption.                                                                                                                                                                                                                                                                                                                                            |
| Natural-key mutation after a merge strands straggler edits (§4.10)                                                                                                                              | Medium                         | Treat the key as write-once (§4.10); redirects keep resolving either way, so nothing dangles — only late edits on a re-keyed tombstone wait until the key is restored.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Crash between the winner fold and the loser tombstone (different documents)                                                                                                                     | Low (was Medium)               | Winner doc flushed durably before any tombstone is written; loser docs flushed before the group reports serviced and its intent is cleared (2026-08-03 ×2). A crash at any point leaves either the group live with the intent pending (next pass re-merges) or everything durable.                                                                                                                                                                                                                                                                                             |
| Ref-rewrite misses (markdown, feeds, side maps)                                                                                                                                                 | Medium                         | Redirects make misses non-fatal; doctor diagnostic extended to report them; opportunistic rewrite passes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Concurrent merge + user edit on the loser loses the edit (field granularity)                                                                                                                    | Medium                         | Heads-diff straggler fold (§4.2) preserves late edits per-property; per-field writes (§4.1 step 3) protect untouched winner fields; the fold diffs from the union of all recorded watermarks so a concurrent merge's stale watermark never re-folds over newer winner edits (2026-08-03). Residual: concurrent folds' value writes race as register writes (§4.2). Scope early adoption to init-state objects.                                                                                                                                                                 |
| Proxy identity: live proxies holding the loser                                                                                                                                                  | Medium                         | Loser stays resolvable (tombstone+redirect); optionally rebind cores (`_rebindObjects` precedent) in a later phase.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Merge function semantics disputed per type (arrays: union vs winner)                                                                                                                            | Medium                         | Ship fixed field-wise semantics first; revisit pluggability (open question 3) only with evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Collaborative text fields are discarded wholesale** — min-id-wins drops the loser's entire text, not just a conflicting edit, and unrelated documents cannot have changes applied across them | **High, once past init-state** | Academic while adoption is limited to seeded init-state objects (§6 Phase 4). Before generalizing to documents, choose: keep the loser's text reachable rather than dropping it; refuse to merge entities whose text diverged and surface them via the doctor diagnostic; or an explicit text-merge policy (§7 Q3).                                                                                                                                                                                                                                                            |
| Mixed client versions: old clients can't follow `mergedInto` redirects                                                                                                                          | Medium — **open, accepted**    | New clients follow redirects in the resolver (2026-08-02) and in the transitive-deletion walk (2026-08-03), so refs, relations, and children survive merges there. Old clients see losers as deleted (relations/children at a loser vanish for them) and un-rewritten refs dangle; ref rewriting (`db.mergeDuplicates`) is their compat path — and it is only partially built (data refs yes; relation endpoints, `meta.tags`, `@parent` no, §4.1 step 5). Automatic merging runs unflagged (decision log 2026-08-03 item 7); mixed-version tests (§5.7) remain to be written. |
| Feed-backed objects                                                                                                                                                                             | Out of scope                   | Feeds already collapse by id at the index (`echo-feed-codec.ts:20-24`); feed-object dedup rides on the same identity-key mechanism if needed later.                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 4.11 Index-driven reference rewriting — replace the `Filter.everything()` pass (PROPOSED 2026-08-31)

**Problem (Josiah, ratifying dmaretskyi's review):** `db.mergeDuplicates()` hydrates
the entire space (`Filter.everything()` + tombstones) to do its two jobs, and both
jobs have cheaper homes. Its _merging_ is redundant — the worker already merges off
the indexing stream with point lookups. Its _reference rewriting_ scans every
entity to find referrers of merged-away losers — but the reverse-ref index already
answers exactly that question: `reverseRef` rows are `(recordId → referrer,
targetDXN, propPath)`, so the referrers of a loser, and the precise property
holding each ref, are one indexed lookup away.

**Proposal: the worker rewrites references, index-driven; the client executor and
`db.mergeDuplicates()` are deleted.**

1. **Where**: `ConvergenceKeyMerger`, immediately after a merge's loser tombstones
   are written (and again when `#foldRedirected` services a re-indexed loser, which
   re-covers any referrers that arrived late). It already has `loadDoc`; it gains a
   `queryReferrers(targetEid)` dep backed by `IndexEngine.queryReverseRef` joined to
   `objectMeta` for the referrer's `documentId`.
2. **How**: for each loser, look up its referrers; for each referrer, load its
   document (point load), and rewrite the `EncodedReference` at the indexed
   `propPath` to the merge winner — the chain-resolved live end, which the worker
   just computed. Per-value writes only (the same LWW discipline as everywhere
   else); a tombstoned or merged-away referrer is skipped, as the client rewriter
   already does. Raw `EncodedReference` replacement needs no client Ref machinery.
3. **Durability**: none needed. Rewriting is an optimization plus the old-client
   compat path — resolution follows the redirect regardless — so it is deliberately
   OUTSIDE the intent log's guarantee: best-effort at merge time, re-attempted
   whenever the loser re-indexes. A crash between tombstone and rewrite loses
   nothing.
4. **Freshness residual (accepted)**: a referrer written concurrently with the
   merge indexes later and is not re-presented by the loser's key (referrers do
   not carry it), so its ref stays un-rewritten until the loser next re-indexes —
   during which it resolves correctly via the redirect on new clients and dangles
   on old ones, exactly the pre-existing mixed-version posture (§4.6).
5. **Fallout**:
   - `db.mergeDuplicates()` and the client merge executor (`merge-executor.ts`
     `mergeDuplicates`/`rewriteReferences`/`foldLateEdits`) are **deleted** — the
     last `Filter.everything()` goes with them.
   - The shared merge core (`mergeCandidates`, `toMergeCandidate`,
     `findMergeDuplicates`) moves **into echo-host**; the client keeps only
     `resolveMergeRedirect` (resolver + transitive-deletion walks) in
     `@dxos/echo/internal` — which also settles the reviewer's layering concern.
   - Relation endpoints and `@parent` (§4.1 step 5 backlog) become the same shape
     of work later: `objectMeta.source/target/parent` are indexed columns, so
     finding relations/children anchored at a loser is equally a point lookup.
   - The e2e merge suites re-target the worker path: staging that used the client
     executor writes redirects through cores instead (the worker tests' `redirect`
     fixture pattern), and rewrite assertions observe the worker's writes.
6. **Alternative considered — targeted client pass** (keep `db.mergeDuplicates()`
   but detect losers via the index and find referrers via `Query.incoming`):
   avoids the raw-document rewriter but keeps the client surface, the manual-call
   footgun, and per-loser client hydration; rejected unless the worker rewriter
   hits an unforeseen wall.

---

## 5. Test plan

Determinism and convergence are the product; the tests are the spec.

1. **Unit (echo / echo-client)**
   - Winner selection: pure, total order, stable under permutation and subsets.
   - Redirect chains: transitive resolution, cycle impossibility (property: every
     edge decreases the id), chain collapse on re-run.
   - Deterministic merge function: defined over the candidate **set** —
     idempotent, deterministic across isolates, and **permutation/order
     independent** (same candidate set in any enumeration or pairwise-application
     order yields identical results; property-based over random field layouts);
     `meta.keys` union deduplicated and deterministically ordered.
2. **Multi-peer convergence (echo-client-e2e, using the existing `EchoTestPeer` +
   replication test harness, cf. `integration.test.ts:290-311`)**
   - k peers (2–4) each create the same keyed object, edit fields concurrently,
     sync in randomized order/topology, all run the merge → assert: exactly one
     non-deleted object, identical heads/state everywhere, all refs resolve to it,
     `plugin-doctor` dangling-ref diagnostic clean.
   - Partial-view merges: peers merge different duplicate subsets concurrently →
     final state converges to global-minimum winner via chains.
   - Straggler: peer offline during merge keeps editing the loser; on reconnect the
     re-run folds its edits at merge-function granularity.
   - Relations: duplicates as relation endpoints → no transitive-deletion misfires
     (written 2026-08-03: relation-at-loser and child-of-loser stay visible, judged
     at the survivor); endpoint _rewriting_ remains open (§4.1 step 5).
3. **Property-based determinism**: randomized op schedules (fast-check style, seeded)
   asserting final-state equality across peers — the CI-friendly distillation of the
   simulation.
4. **Proxy/UX behavior**: live proxy on a loser keeps working; `useQuery` /
   `space.properties` observe exactly one object during and after merge; undo/restore
   of a merged-away object does not resurrect a duplicate (`mergedInto` is sticky —
   restore resolves to the winner); a stale offline peer that re-adds/edits the
   loser has its changes folded on reconnect, never a revived duplicate.
5. **E2E (composer-app Playwright)**: two clients join a fresh space concurrently,
   both trigger default-content provisioning → exactly one root collection / trace
   feed / README.
6. **Perf**: detection cost pre/post index; resolver redirect overhead; merge pass on
   a space with N objects (target: no-op pass is O(index lookup)).
7. **Mixed-version compatibility** — behavioral, not just schema tolerance:
   proto-guard snapshot for the new `system.mergedInto` field; old clients tolerate
   the field (unknown `system` fields are already ignored) but **cannot follow the
   redirect** — to them a merged loser is simply deleted, and any not-yet-rewritten
   ref dangles. New clients follow the redirect in the resolver (2026-08-02), so
   the exposure is old clients only. Reference **rewriting** (not the redirect) is
   the compatibility path they benefit from, so rewrite must not be treated as
   optional where mixed fleets exist — note it is only partially built (§4.1
   step 5: relation endpoints and `meta.tags` are open). Automatic merging runs
   **unflagged** (decision log 2026-08-03 item 7, superseding the Phase 1/2 flag
   plan); the residual risk is recorded in §4.6. Still to test: old/new client
   pairs replicating the same space (old client reads during and after a merge
   performed by a new client).

## 6. Phased rollout plan

### Phase 0 — Spike (time-boxed ~1–2 weeks, throwaway code, tests only)

Goal: prove convergence end-to-end and settle the open questions. All work in
`echo-client`/`echo-host` test files behind no flag (never shipped).

1. **Minimal end-to-end merge**: 3 `EchoTestPeer`s, duplicate keyed objects,
   min-id winner, `mergedInto` redirect (as a plain `system` field), resolver
   redirect hook, ref rewrite via `Query.referencedBy` — assert convergence under
   randomized sync orders, including the partial-view chain case.
2. **Merge-function shape**: prototype field-wise winner-preference on 2–3 real
   types (Collection, Feed, an Expando) and check the semantics are acceptable.
3. **Decision memo**: identity field (`meta.key+version` recommendation confirmed
   or revised); where the merge runs (client on space open vs host maintenance job
   vs indexer-triggered — spike should measure); merge-function semantics.

Exit criteria: convergence demonstrated in tests; go/no-go with chosen shape.

### Phase 1 — Foundations (no merge engine yet)

- `system.mergedInto` schema field + resolver redirect-following (inert until
  Phase 2 writes it) + proto-guard snapshot.
- Expose internal relation-endpoint mutation (`ObjectCore.setSource/setTarget`
  plumbed to a small **named** internal API, not inlined into the merge executor —
  it has a second consumer: migration relation rewiring (lenses project).
- Bless a creation-side API for declaring an identity key, e.g.
  `Obj.make(T, { [Obj.Meta]: { key, version }, ...props })` plus a `db.ensure`-style
  helper that creates keyed state immediately (no check-then-create) and relies on
  the merge engine to repair races. Keep `db.ensure` generic — it is also the
  migration fan-out primitive, not an app-init special case.
- ~~Feature flag: config-gated, default off outside tests.~~ **Superseded**:
  shipped unflagged (decision log 2026-08-03 item 7).

### Phase 2 — Merge engine (planned "flagged"; shipped unflagged — decision log 2026-08-03 item 7)

- Duplicate detection (query-based post-filter is fine at this scale).
- Deterministic merge executor: winner selection, set-based deterministic data
  merge applied as per-field writes, tombstone+redirect (+ `mergedAtHeads`),
  heads-diff straggler fold, opportunistic ref rewrite. Runs on space open + on
  demand (`space.internal` / doctor action).
- Sticky-tombstone guard: `db.add` / restore of an entity with `system.mergedInto`
  set resolves to the winner instead of un-deleting the loser (§4.1 step 4).
- Extend `plugin-doctor` with a duplicates diagnostic + "merge now" repair action —
  the manual escape hatch ships before the automatic path. Also surface class-1
  (same-id-two-documents) anomalies as an explicit diagnostic instead of a log
  warning.
- Full multi-peer convergence + property test suite (§5.2–5.4).

### Phase 3 — Indexing & automation

- Add key columns (`metaKey`, `metaVersion`, and a `foreignKeys` join table) to the
  index (`entity-meta-index.ts`), planner pushdown for `Filter.key` /
  `Filter.foreignKeys` (removes the standing TODO at
  `echo-client/src/echo-handler/util.ts:18` and the trace-feed race's root cause).
- Indexer emits key-collision events → merge runs automatically on collision
  instead of on space open. Flag default-on for internal/dev.

### Phase 4 — Adoption & generalization

- Convert the known hot spots to keyed creation + merge: trace feed
  (`FeedTraceSink`), persisted schema (`db.addType`), `SHARED` space-order Expando,
  `SpaceProperties` + root collection. For the latter two, sequence carefully:
  first a migration **backfills identity keys** onto existing `SpaceProperties` /
  root-collection objects, then the merge engine demonstrably repairs keyed
  duplicates, and only then are the `=== 1` resolution rule and the
  `CollectionModel` invariant relaxed — and they are **converted into diagnostics,
  not dropped**: duplicates the engine cannot merge (no identity key, mismatched
  key/version, class-1 same-id collisions) must keep surfacing as explicit errors
  rather than becoming silently incorrect state.
- Restore plugin default-content provisioning (`OnCreateSpace` for table/thread/
  assistant) on top of keyed objects — the original motivating feature.
- Generalize the merge key to `meta.keys` foreign keys; migrate `syncObjects`,
  `extractor/getOrCreate`, plugin-ibkr alias folding onto the engine; delete the
  four divergent dedup implementations.
- Default-on; changeset + docs (`echo` skill update).

### Phase 5 — GC (optional, later)

- Epoch-based compaction of merged-away tombstones; redirect stubs inlined into the
  root doc; storage reclamation.

## 7. Open questions

Design review held 2026-07-30; see the decision log. Four of the original five are
settled, and the derived-key sub-question dissolved with them.

1. ~~**Identity field**~~ — **settled**: a new dedicated field on `EntityMeta`
   (§4.4). The sub-question about **derived, non-registry strings** (e.g.
   `<migrationId>:<sourceId>:<role>`) and whether they need namespacing to stay
   clear of registry FQNs is **moot**: the dedicated field is not the registry
   namespace, so derived keys and registry FQNs cannot collide by construction.
   The migrations consumer stamps whatever string it likes.
2. ~~**Version matching**~~ — **settled**: exact.
3. **Merge policy pluggability** — **still open**, but not blocking: is field-wise
   winner-preference enough, or do types need to declare a merge annotation (e.g.
   arrays: union vs winner)? Ship fixed semantics first; Phase 0's second task
   tests the semantics against real types and is where evidence for pluggability
   would surface. If/when pluggability is wanted, the lens mapping vocabulary
   (typed, bidirectional, law-checked — lenses project) is a candidate merge-policy
   surface rather than inventing a new one.
4. ~~**Where the merge runs**~~ — **settled**: **in the worker, off the indexing
   stream** (§4.8). The path here ran on-space-open → on-entity-load (§4.7) →
   in-query-evaluation → worker; each revision and its reason is in the decision
   log.
5. ~~**Scope**~~ — **settled**: all three entity kinds (object, relation, type),
   phased.

### Newly open, from the review

6. ~~**Identity field name**~~ — **settled**: `meta.convergenceKey`, ratified
   2026-07-30 (§4.4), shipped.
7. **Merging `EntityKind.Type`** — types are entities and are now in scope, but a
   duplicate _type_ is not just a data merge: schema identity feeds the type
   registry and object `system.type` refs. Needs its own phase and probably its own
   convergence argument. Sequenced after object and relation merging.
