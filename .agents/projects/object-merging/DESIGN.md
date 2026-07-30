# ECHO-level object merging — feasibility research

- **Status**: research / pre-spike (no implementation)
- **Date**: 2026-07-30
- **Requested by**: Josiah
- **Goal**: allow application state to be initialized into a space independently by
  multiple peers, without coordination, such that objects carrying the same identity
  (meta key + version) deterministically merge into a single object — with all
  references updated to point at the merged object — instead of accumulating
  duplicates.

## Decision log

- **2026-07-30 (Josiah)** — Merge only distinct-id duplicates that share an identity
  key ("collision class 2"). Do **not** derive object ids deterministically from the
  identity key: same-id-different-document collisions ("collision class 1") remain
  an error condition, as today. Consequences are folded into §4 and §6 below; the
  rejected alternative is recorded in §4.5.

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
   peer**, applied to the winner via an `atomicReplaceObject`-style single change —
   NOT a pairwise fold. Pairwise winner-preference is not associative (for ids
   `Z < X < Y` where `Z` lacks field `a`, merging `X` then `Y` into `Z` yields a
   different `a` than `Y` then `X`), so different application orders would diverge.
   Instead, per field: take the value from the **smallest-id candidate that defines
   the field**; `meta.keys`: union deduplicated by `(source, id)` and sorted
   lexicographically. This is permutation-independent for a given candidate set.
   Peers with different candidate sets can still transiently write different
   results — Automerge's field-level conflict resolution keeps the winner document
   convergent in the interim, and the next merge pass (losers are retained as
   tombstones, so their states stay available — step 4) recomputes the canonical
   function once views converge. Duplicates never share Automerge ancestry (§3.1),
   so this function — not an Automerge merge — is the only merge path; lossy at
   field granularity by design (see risk table).
4. **Redirect, don't erase**: write `system.mergedInto: <winnerId>` on the loser and
   tombstone it (`system.deleted = true`). The loser keeps replicating (this is
   essential — late peers must be able to run the same merge and follow the
   redirect). `mergedInto` is **sticky and authoritative**: `db.add` today
   un-deletes a tombstoned object (§3.1), so the un-delete path must special-case
   merged losers — restore/undo of a merged-away object resolves to the winner
   instead of resurrecting the loser, and a stale offline peer that re-adds or
   keeps editing the loser has those changes folded by the next merge pass rather
   than surfaced as a revived duplicate. The ref resolver learns to follow
   `mergedInto` transitively — this makes the system robust to the **same-space**
   rewrite gaps in §3.3 (Markdown links, feed blocks, refs created concurrently
   with the merge). Cross-space inbound refs are explicitly **not** covered:
   cross-space resolution throws "not yet supported" today
   (`hypergraph.ts:571-574`), so a redirect on the loser can't be followed from
   another space; they dangle exactly as they would for any deleted object until
   cross-space resolution exists.
5. **Rewrite inbound references opportunistically**: `Query.referencedBy(loser)` →
   rewrite data refs and `meta.tags`; `objectMeta.queryRelations` → rewrite relation
   endpoints (requires exposing the existing `ObjectCore.setSource/setTarget`
   internally). Rewriting `X→loser` to `X→winner` is idempotent, so concurrent
   rewriters converge. Refs that can't be rewritten still resolve via the redirect.

### 4.2 Convergence under concurrent merging

The key correctness argument, for peers acting on different views:

- Peer A sees duplicates `{X, Y}` (winner X); peer B sees `{X, Y, Z}` with
  `Z < X` (winner Z). A writes `Y.mergedInto = X`; B writes `Y.mergedInto = Z` and
  `X.mergedInto = Z`. LWW on `Y.mergedInto` picks either — both terminate at Z by
  transitive redirect, because **every redirect edge points to a smaller id**, so
  chains are finite, acyclic, and end at the global minimum. Re-running the merge
  (it must be idempotent and cheap when there's nothing to do) collapses chains and
  re-rewrites refs to the final winner.
- Merges of data are re-runnable: if the loser receives further changes after a
  peer merged it (offline straggler), the next merge pass folds them in — eventual
  consistency at the granularity of the merge function.

### 4.3 GC (later)

Merged-away tombstones accumulate. An epoch-based compaction
(`compactDocumentsEpochMigration` precedent) can eventually drop loser documents
and inline redirect stubs into the root doc. Not needed for correctness.

### 4.4 Which "meta key" is the identity?

Two candidates already exist; recommendation is to support the semantics on **one**
and map the other onto it later:

1. **`meta.key` + `meta.version`** (FQN + semver) — matches the user-stated model
   ("meta key and version") literally; already paired; already has a semver-aware
   filter (`Filter.key`); already stamped on persisted schemas. **Recommended for
   the app-state-initialization use case.** Semantics: same `(key, version)` in the
   same space ⇒ same object. Different `version` ⇒ different object (allows
   generational evolution of seeded state).
2. **`meta.keys: ForeignKey[]`** — the sync-pipeline identity (multi-alias,
   source-scoped, no version). Merging on foreign keys is the Phase-4+
   generalization (it subsumes `syncObjects`, `getOrCreate`, plugin-ibkr's alias
   folding), but multi-key alias identity makes winner selection and key-union
   semantics subtler (key sets can _become_ overlapping later). Defer.

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

### 4.6 Principal risks

| Risk                                                                         | Severity     | Mitigation                                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redirect-following in the resolver adds a hop to every unresolved load       | Low          | Only consulted on miss/tombstone; measured in spike.                                                                                                |
| Ref-rewrite misses (markdown, feeds, side maps)                              | Medium       | Redirects make misses non-fatal; doctor diagnostic extended to report them; opportunistic rewrite passes.                                           |
| Concurrent merge + user edit on the loser loses the edit (field granularity) | Medium       | Re-runnable merges shrink the window; scope early adoption to init-state objects where the concurrent-edit window is empty in practice.             |
| Proxy identity: live proxies holding the loser                               | Medium       | Loser stays resolvable (tombstone+redirect); optionally rebind cores (`_rebindObjects` precedent) in a later phase.                                 |
| Merge function semantics disputed per type (arrays: union vs winner)         | Medium       | Ship fixed field-wise semantics first; revisit pluggability (open question 3) only with evidence.                                                   |
| Mixed client versions: old clients can't follow `mergedInto` redirects       | Medium       | Ref rewriting is the compat path; flag stays off until a min-client-version gate; mixed-version tests (§5.7).                                       |
| Feed-backed objects                                                          | Out of scope | Feeds already collapse by id at the index (`echo-feed-codec.ts:20-24`); feed-object dedup rides on the same identity-key mechanism if needed later. |

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
   - Relations: duplicates as relation endpoints → endpoints rewritten, no
     transitive-deletion misfires (`object-core.ts:573-617` semantics preserved).
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
   ref dangles. Consequences to design in and test: reference **rewriting** (not the
   redirect) is the compatibility path old clients benefit from, so rewrite must not
   be treated as optional where mixed fleets exist; automatic merging stays behind
   the feature flag until a minimum-client-version gate is agreed; test old/new
   client pairs replicating the same space (old client reads during and after a
   merge performed by a new client).

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
  plumbed to an internal API, not public).
- Bless a creation-side API for declaring an identity key, e.g.
  `Obj.make(T, { [Obj.Meta]: { key, version }, ...props })` plus a `db.ensure`-style
  helper that creates keyed state immediately (no check-then-create) and relies on
  the merge engine to repair races.
- Feature flag: config-gated, default off outside tests.

### Phase 2 — Merge engine, flagged

- Duplicate detection (query-based post-filter is fine at this scale).
- Deterministic merge executor: winner selection, set-based deterministic data
  merge, tombstone+redirect, opportunistic ref rewrite. Runs on space open + on
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

## 7. Open questions (for design review before the spike)

1. **Identity field**: confirm `meta.key` + `meta.version` (recommended) vs a
   designated `ForeignKey` source vs a new dedicated field.
2. **Version matching**: exact-match identity (recommended) or semver-range
   (e.g. merge `1.0.1` into `1.0.0` state)? Exact is simpler and deterministic;
   ranges reintroduce ambiguity about the winner.
3. **Merge policy pluggability**: is field-wise winner-preference enough, or do
   types need to declare a merge annotation (e.g. arrays: union vs winner)?
   Recommend shipping fixed semantics first.
4. **Where the merge runs**: every client on space open (deterministic ⇒ safe, but
   redundant work) vs host-side maintenance vs indexer-triggered. Spike measures.
5. **Scope**: objects only in Phases 1–3; relations as merge _subjects_ (not just
   endpoints) deferred?
