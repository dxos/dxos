# ECHO-level object merging — feasibility research

- **Status**: research / pre-spike (no implementation)
- **Date**: 2026-07-30
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
  space open.** Merging on open has to ask for every entity declaring a natural key,
  which is unbounded and hydrates all of them just to discover that almost none are
  duplicated — a working-set bloat paid on every open for objects the session may
  never touch. Merging when an entity is hydrated instead makes the cost proportional
  to use, and reduces detection to a **point lookup** (`naturalKey = X`, normally one
  row) rather than a scan. See §4.7.
- **2026-07-30 (Josiah)** — **Merge inside query evaluation**, so a caller never sees
  two entities where there should be one. A `MergeStep` in the query plan collapses
  duplicates in the working set before results are returned. Needs no index (the
  working set is already hydrated) and covers every failure in §2, which are all
  query-shaped — so the index and the load-path hook become completeness work rather
  than blockers. See §4.8.

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
   convergent in the interim, and the next merge pass (losers are retained as
   tombstones, so their states stay available — step 4) recomputes the canonical
   function once views converge. Duplicates never share Automerge ancestry (§3.1),
   so this function — not an Automerge merge — is the only merge path; lossy at
   field granularity by design (see risk table).
4. **Redirect, don't erase**: write `system.mergedInto: <winnerId>` (plus
   `system.mergedAtHeads` — the loser's heads at merge time, used by the straggler
   fold in §4.2) on the loser and tombstone it (`system.deleted = true`). The loser keeps replicating (this is
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
- Merges of data are re-runnable, and **stragglers can keep their edits**: the
  merge records the loser's heads at merge time (e.g. `system.mergedAtHeads`
  alongside `mergedInto`). A later pass diffs the loser from those heads
  (`A.getHeads`/`A.diff` — precedent in `echo-handler/edit-history.ts:76-77`) and
  folds **exactly the late edits** into the winner as per-property writes, instead
  of re-running the field-wise merge (which would prefer the smallest-id candidate
  and could discard the straggler's change). Field-wise recompute remains the
  fallback when recorded heads are unavailable.

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

**Name: `meta.naturalKey`** (ratified 2026-07-30). It names what the caller asserts
rather than what the system does with it — setting it is a claim about what the
entity _is_, and merging is the consequence of two entities making the same claim.
That keeps it honest across the phases: Phase 1 ships the field with no merge engine
at all, where a name like `mergeKey` would be a lie, and Phase 3 moves the trigger
into the indexer without invalidating it. It also imports the relational
surrogate-vs-natural distinction exactly: `EntityId` is the surrogate (system-minted,
random, meaningless outside the database), and §1's problem is that ECHO has only
surrogates, so two peers creating "the same" entity mint two with no way to recognize
the sameness.

The alternatives each misdescribed something: `canonicalKey` is wrong on the
entities that matter (both duplicates carry the key, including the loser — only one
is canonical); `singletonKey` implies write-time uniqueness enforcement, which was
rejected along with deterministic ids (before the merge runs there genuinely _are_
two entities with the key, so the invariant is eventual); `mergeKey` names the
mechanism, reads oddly on an entity that never has a duplicate, and invites the
mental model of opting into a behavior rather than asserting an identity.
`identity`/`identityKey` were excluded outright — `IdentityKey` is the HALO identity
public key across 17 files, so the collision would be actively misleading.

Accepted cost: the name carries no hint that stamping it opts the entity into
merging, so that consequence belongs in the field's doc comment.

Rejected candidates, for the record:

| Candidate      | Reads as                                                                                                     | Against                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `naturalKey`   | Standard relational term: the natural key beside the surrogate key (`EntityId`). Precise about what it _is_. | Assumes DB vocabulary; understates the merge consequence.                                   |
| `singletonKey` | States the invariant exactly: at most one live entity per `(space, key)`.                                    | "Singleton" carries OO baggage.                                                             |
| `mergeKey`     | Most obvious at the call site: same `mergeKey` ⇒ merged.                                                     | Names the mechanism, not the property; reads oddly on an entity that never has a duplicate. |
| `canonicalKey` | Pairs with the winner/redirect vocabulary (`mergedInto`).                                                    | "Canonical" describes the winning entity, not the key.                                      |

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

### 4.7 Where the merge runs: on load, not on open

**Decided 2026-07-30, revising the earlier "client on space open".**

Merging on space open was implemented and reverted (see the ledger). Detection had to
enumerate every entity declaring a natural key, so it scanned and hydrated the whole
space — which broke three tests asserting lazy loading, and is bloat paid on every
open for objects the session may never touch.

The trigger is **entity hydration** instead. When an entity carrying a natural key is
loaded, look for others with the same key; merge only if more than one exists.

Why this is the better shape:

- **Cost is proportional to use.** An entity never loaded never costs anything.
- **Detection becomes a point lookup.** `naturalKey = X` returns one row in the
  common case and hydrates nothing extra, versus "every row with a natural key",
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
  merge; needs an in-flight guard keyed by natural key.
- **Convergence is unaffected.** The merge function is deterministic and idempotent,
  so _when_ it runs does not change what it computes — only how soon peers converge.

### 4.8 The merge belongs in the query pipeline

A query's result set is materialized before it is returned, so a query spanning both
duplicates would hand back two entities and settle to one only as the merge landed.
Rather than accept that transient, **merge during query evaluation**: a `MergeStep`
in the plan, alongside the existing `FilterDeletedStep`, grouping the working set by
natural key, merging any group of more than one, and dropping the losers before
results are returned. A caller then never observes two.

The plan is already a step sequence with a `_tag` union and executor dispatch
(`echo-host/src/query/plan.ts`, `query-executor.ts`), so this is an ordinary addition
rather than new machinery.

**This needs no index.** The working set is already hydrated by the time a step runs,
so grouping it by natural key is one in-memory pass over objects already in hand —
nothing extra to load, nothing to look up. The cost is nil for result sets that
declare no natural keys, and real only where a duplicate group actually exists.

It is also sufficient for every failure in §2, all of which are query-shaped:
`space.properties` (`results.length === 1`), `CollectionModel`'s
duplicate-`SpaceProperties` invariant, `useTraceMessages` querying across trace feeds,
the `SHARED` expando check-then-create, and `db.addType`.

That demotes the index and the load-path hook from blocker to completeness: an entity
reached by id or by reference has no siblings in a result set to compare against, but
`resolveRedirect` already covers it once merged, and any query that surfaces it
performs the merge.

Risk to weigh in review: this **writes during query evaluation**. The write is bounded
and idempotent (a second pass finds nothing), but it invalidates queries, so the
reactive path must not loop.

### 4.6 Principal risks

| Risk                                                                         | Severity     | Mitigation                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redirect-following in the resolver adds a hop to every unresolved load       | Low          | Only consulted on miss/tombstone; measured in spike.                                                                                                                            |
| Ref-rewrite misses (markdown, feeds, side maps)                              | Medium       | Redirects make misses non-fatal; doctor diagnostic extended to report them; opportunistic rewrite passes.                                                                       |
| Concurrent merge + user edit on the loser loses the edit (field granularity) | Medium       | Heads-diff straggler fold (§4.2) preserves late edits per-property; per-field writes (§4.1 step 3) protect untouched winner fields; scope early adoption to init-state objects. |
| Proxy identity: live proxies holding the loser                               | Medium       | Loser stays resolvable (tombstone+redirect); optionally rebind cores (`_rebindObjects` precedent) in a later phase.                                                             |
| Merge function semantics disputed per type (arrays: union vs winner)         | Medium       | Ship fixed field-wise semantics first; revisit pluggability (open question 3) only with evidence.                                                                               |
| Mixed client versions: old clients can't follow `mergedInto` redirects       | Medium       | Ref rewriting is the compat path; flag stays off until a min-client-version gate; mixed-version tests (§5.7).                                                                   |
| Feed-backed objects                                                          | Out of scope | Feeds already collapse by id at the index (`echo-feed-codec.ts:20-24`); feed-object dedup rides on the same identity-key mechanism if needed later.                             |

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
  plumbed to a small **named** internal API, not inlined into the merge executor —
  it has a second consumer: migration relation rewiring (lenses project).
- Bless a creation-side API for declaring an identity key, e.g.
  `Obj.make(T, { [Obj.Meta]: { key, version }, ...props })` plus a `db.ensure`-style
  helper that creates keyed state immediately (no check-then-create) and relies on
  the merge engine to repair races. Keep `db.ensure` generic — it is also the
  migration fan-out primitive, not an app-init special case.
- Feature flag: config-gated, default off outside tests.

### Phase 2 — Merge engine, flagged

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
4. ~~**Where the merge runs**~~ — **settled**: every client, **on entity load**.
   Revised from "on space open" once that proved to hydrate the whole space; see
   §4.7 for why the load trigger is both cheaper and a smaller change.
5. ~~**Scope**~~ — **settled**: all three entity kinds (object, relation, type),
   phased.

### Newly open, from the review

6. **Identity field name** (§4.4) — `naturalKey` / `singletonKey` / `mergeKey` /
   `canonicalKey`. The shape question is settled: a single opaque string. Blocks
   Phase 1's schema change, not the Phase 0 spike.
7. **Merging `EntityKind.Type`** — types are entities and are now in scope, but a
   duplicate _type_ is not just a data merge: schema identity feeds the type
   registry and object `system.type` refs. Needs its own phase and probably its own
   convergence argument. Sequenced after object and relation merging.
