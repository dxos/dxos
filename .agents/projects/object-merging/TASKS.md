# object-merging — Tasks

_Resume: merge-on-query is live; next is the load-path hook (§4.7) with the `meta.naturalKey` index, for entities reached by id/ref where no result set exposes the duplicate. Uncommitted: none. Last: `db.mergeDuplicates()`, the straggler fold, and the derived `SCALAR_META_FIELDS` fix; 4 convergence + 10 executor tests green over 3 clean repeats._

Design + feasibility research: [`DESIGN.md`](./DESIGN.md)
(includes the decision log, merge algorithm, convergence argument, test plan, and
the phased rollout this ledger mirrors).

## Phase R: Research

- [x] **Feasibility research** — storage topology, identity metadata, reference
      model, prior art; folded into this project as `DESIGN.md`.
- [x] **Decision: collision classes** — merge distinct-id duplicates only;
      same-id-two-docs stays an error; no deterministic object ids (DESIGN.md §4.5).
- [x] **Decision: merge direction** — deterministic ordering; winner = minimum
      `EntityId` (keys are equal among duplicates, so ids are the tiebreaker).
- [x] **Design review** — 4 of the 5 questions in DESIGN.md §7 settled:
  - Identity field: **a new dedicated `EntityMeta` field** (not `meta.key`/`version`,
    not a `ForeignKey`); the derived-key namespacing sub-question is moot as a result.
  - Version matching: **exact**.
  - Where the merge runs: every client — **on entity load**, revised from "on space
    open" after the scan proved to hydrate the whole space (DESIGN.md §4.7).
  - Scope: **all entity kinds** (object, relation, type), phased — relations are
    merge subjects eventually, not just endpoints.
  - Merge-policy pluggability: left open, non-blocking; fixed semantics first.
- [x] **Shape the identity field** — a **single opaque string**, not a
      `{ key, version }` struct; callers encode generations in the string.
- [x] **Name the identity field** — **`meta.naturalKey`** (§4.4). Names the caller's
      assertion rather than the mechanism, so it stays true in Phase 1 where the
      field is inert and in Phase 3 where the indexer triggers the merge.

## Phase 0: Spike — SUBSUMED

Planned as throwaway code to prove convergence. Skipped: the design review settled
the questions the spike existed to answer, so the work went straight into shippable
form under Phases 1–2. Convergence is demonstrated by `convergence.test.ts` rather
than by a spike.

- [x] **Minimal end-to-end merge** — two peers, duplicate keyed objects, min-id
      winner, `mergedInto` redirect, ref rewrite, and the partial-view chain case.
- [ ] **Merge-function shape on real types** — still only exercised on `TestSchema`;
      run it against `Collection` / `Feed` / an Expando before Phase 4 adoption.

## Phase 1: Foundations (no merge engine)

- [x] Dedicated identity field on `EntityMeta` — `meta.naturalKey`, a single optional
      string, with `Merge.get/setNaturalKey`, `groupByNaturalKey`, `findDuplicates`.
      Two hand-maintained meta field lists had to learn about it (see below).
- [x] Pure merge core (`echo/src/Merge.ts`) — `selectWinner` (min id),
      set-wise `merge` (permutation-independent, not a pairwise fold),
      `resolveRedirect` (transitive, terminates on cycles and forward refs).
      39 unit tests + 4 DB round-trip tests.
- [ ] `system.mergedInto` / `system.mergedAtHeads` — schema fields landed; resolver
      redirect-following and the proto-guard snapshot still to do.
- [ ] Internal relation-endpoint mutation (plumb `ObjectCore.setSource/setTarget`).
- [ ] Creation-side API for declaring an identity key (+ `db.ensure`-style helper).

## Phase 2: Merge engine

- [x] Duplicate detection (query post-filter), deterministic merge executor,
      tombstone+redirect, opportunistic ref rewrite — `echo-client/src/merge/`.
      `mergeDuplicates` writes per-field, records `mergedInto` + heads, tombstones;
      `rewriteReferences` repoints refs (idempotent); `resolveMerged` follows chains.
- [x] Multi-peer convergence tests (`convergence.test.ts`) over
      `TestReplicationNetwork`: two peers seeding the same state converge; both
      peers merging independently agree on the winner; a partial-view merge builds
      a chain that still resolves to the global minimum.
- [x] `db.mergeDuplicates()` — detection, merge, and reference rewriting in one call.
- [x] `system.mergedFrom` on the winner — the reverse edge of `mergedInto`, stored
      because deriving it means an unindexed reverse scan; transitively closed so a
      collapsing chain carries absorbed ids forward. Read via `getMergedFrom`.
- [x] Straggler fold (`foldLateEdits`) — asks automerge which data fields moved since
      `mergedAtHeads` and carries exactly those to the winner, then advances the
      watermark so the same edit is never folded twice.
- [x] **Collapse duplicates during query evaluation** (DESIGN.md §4.8) — a caller
      never sees two. No index needed; covers every §2 failure. Landed in the client's
      `_presentResults`, not as a `QueryPlan` step: the plan runs host-side over raw
      documents, while merging needs live entities.
- [ ] **Merge on entity load** (DESIGN.md §4.7) — for entities reached by id/ref.
- [ ] `plugin-doctor` duplicates diagnostic + "merge now" repair action; surface
      class-1 (same-id-two-docs) anomalies as an explicit diagnostic.
- [ ] **Decide the collaborative-text policy before adoption widens** (§4.6 risk).
      Min-id-wins discards the loser's entire text, and unrelated automerge documents
      cannot have changes applied across them, so there is no cheap fix. Academic for
      init-state objects; serious the moment documents are in scope.
- [ ] Property-based determinism over randomized op schedules (§5.3).
- [ ] Relation endpoints rewritten when an endpoint is merged away (needs
      `ObjectCore.setSource/setTarget` plumbed).

## Phase 3: Indexing & automation

- [ ] **`meta.naturalKey` index column + `Filter.naturalKey` equality pushdown** —
      for the load path only; the query pipeline needs no index. Point lookup.
- [ ] Meta-key columns + planner pushdown for `Filter.key` / `Filter.foreignKeys`.
- [ ] Indexer key-collision events trigger the merge automatically.
- [ ] Optional: a background/worker merge pass (§4.9). Composes with the lazy path —
      the merge is idempotent, so a worker racing a querying client converges. Buys a
      smaller divergence window, not throughput.

## Phase 3b: Relations and types as merge subjects

Scope decision 2026-07-30: every entity kind that can be stored is in scope, phased.

- [ ] `EntityKind.Relation` as a merge subject — duplicate relations sharing an
      identity key merge; reconcile endpoints that may themselves be mid-merge.
- [ ] `EntityKind.Type` as a merge subject (§7 Q7) — needs its own convergence
      argument: schema identity feeds the type registry and object `system.type`
      refs, so a type merge is not just a data merge.

## Phase 4: Adoption & generalization

- [ ] Convert hot spots: trace feed, `db.addType`, `SHARED` expando,
      `SpaceProperties` + root collection.
- [ ] Restore plugin default-content provisioning (`OnCreateSpace`).
- [ ] Generalize to `meta.keys` foreign keys; migrate `syncObjects` /
      `getOrCreate` / plugin-ibkr alias folding; delete divergent dedup impls.

## Phase 5: GC (optional)

- [ ] Epoch-based compaction of merged-away tombstones.

### Next: merge on entity load (decision 2026-07-30, DESIGN.md §4.7)

Merging on space open was implemented and **reverted**: detection had to enumerate
every entity declaring a natural key, so it scanned `Filter.everything()` and
hydrated the whole space. Not a test artifact — it broke three tests asserting lazy
loading (`entity-manager.test.ts` "pending links are loaded" and "linked objects are
loaded on update only if they were loaded before"; `query-api-stall.test.ts`).

**Do the query-pipeline step first (DESIGN.md §4.8).** A `MergeStep` in the query
plan collapses duplicates in the working set before results are returned, so a caller
never observes two. It needs **no index** — the working set is already hydrated, so
grouping by natural key is one in-memory pass — and it covers every failure in §2,
all of which are query-shaped. Pieces:

- `echo-host/src/query/plan.ts` — add `MergeStep` to the `Step` union, beside
  `FilterDeletedStep`.
- `echo-host/src/query/query-executor.ts` — the dispatch branch: group the working
  set by natural key, merge groups of more than one, drop the losers.
- `echo-host/src/query/query-planner.ts` — emit the step.
- Guard the reactive path: the step writes during query evaluation, which
  invalidates queries. Bounded and idempotent, but it must not loop.

**Then the load-path hook**, for entities reached by id or reference, which have no
siblings in a result set to compare against. This is where the index earns its keep,
and it is now completeness rather than a blocker — `resolveRedirect` already covers
an entity once merged, and any query that surfaces it performs the merge. Pieces:

1. `index-core/src/indexes/entity-meta-index.ts` — `naturalKey TEXT` column, the
   `ALTER TABLE` migration (same pattern as `parent`/`createdAt`), populate from
   `castData[ATTR_META]?.naturalKey` in both the INSERT and UPDATE branches, and an
   index on `(spaceId, naturalKey)`.
2. `echo-protocol/src/query/ast.ts` — a `metaNaturalKey` filter field beside the
   existing `metaKey`.
3. `echo/src/Filter.ts` — `Filter.naturalKey(key)`, mirroring `Filter.key`.
4. `echo-host/src/filter/filter-match.ts` — the post-filter branch, so the filter is
   correct whether or not the fast path is taken.
5. `echo-host/src/query/query-planner.ts` — index fast path for the equality case.
   Same shape as the typename fast path, so likely no new `QueryPlan.Selector` —
   this is where the on-load design is materially cheaper than merging on open,
   which would have needed a novel "all non-null, grouped" selector.
6. `echo-client/src/core-db/entity-manager.ts` — the hook. `loadObjectCoreById` /
   `_loadObjectDocument` and the `_updateEvent` path are the seam.

Needs **no new RPC**: `execQuery` already carries a `QueryAST`.

Open questions before implementing:

- **Transient double-result** — a query's result set is computed from the index
  before hydration completes, so a query spanning both duplicates can return two and
  settle to one. Reactive queries re-emit; a one-shot `run()` may see the pair.
  Acceptable, or does the query path need a merge barrier?
- **Re-entrancy** — the merge hydrates the other candidates, which would re-trigger
  it. Needs an in-flight guard keyed by natural key.

Until this lands, `db.mergeDuplicates()` is an explicit call: the caller opts into
the scan.

### Gotchas found while implementing

- **Adding a field to `EntityMeta` is not one change.** Two hand-maintained field
  lists silently drop anything they do not enumerate, and neither fails loudly:
  `getSnapshot` (`echo/src/internal/Obj/snapshot.ts`) rebuilds meta from an explicit
  allowlist, so the field vanished from every snapshot; and `metaNotEmpty`
  (`echo-client/src/echo-handler/echo-handler.ts`) decides whether meta is persisted
  at all, so an object whose _only_ meta was a natural key never wrote its meta
  section. **Fixed at the root**: both now enumerate `SCALAR_META_FIELDS`, derived
  from `EntityMetaSchema.fields`, so the next meta field needs one change.
- **ECHO brand keys are strings, not symbols** (`~@dxos/echo/Kind` and friends), so
  `Object.entries` on a snapshot sweeps them into what looks like user data.
  `Merge.candidateOf` filters them by prefix.
- **`waitUntilHeadsReplicated` is not a query barrier.** It covers document
  replication, but queries read through the index, which settles a tick later — a
  merge run immediately after it can see one object short. The convergence tests wait
  on the observable result instead.

### References

- `DESIGN.md` — design doc (source of truth).
- Branch: `claude/echo-object-merging-research-dqtjx1` (research only, no PR by request).
