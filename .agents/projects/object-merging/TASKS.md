# object-merging — Tasks

_Resume: index `meta.naturalKey` so detection stops scanning — that is what blocks automatic merge on space open (see Blocker below). Uncommitted: none. Last: `db.mergeDuplicates()`, the straggler fold, and the derived `SCALAR_META_FIELDS` fix; 4 convergence + 10 executor tests green over 3 clean repeats._

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
  - Where the merge runs: **every client, on space open**; Phase 0 measures cost.
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
- [x] Straggler fold (`foldLateEdits`) — asks automerge which data fields moved since
      `mergedAtHeads` and carries exactly those to the winner, then advances the
      watermark so the same edit is never folded twice.
- [ ] **Run it automatically on space open — BLOCKED, see below.**
- [ ] `plugin-doctor` duplicates diagnostic + "merge now" repair action; surface
      class-1 (same-id-two-docs) anomalies as an explicit diagnostic.
- [ ] Property-based determinism over randomized op schedules (§5.3).
- [ ] Relation endpoints rewritten when an endpoint is merged away (needs
      `ObjectCore.setSource/setTarget` plumbed).

## Phase 3: Indexing & automation

- [ ] **`meta.naturalKey` index column** — unblocks automatic merge on space open
      (see Blocker). Migration, populate, and a duplicate-groups query.
- [ ] Meta-key columns + planner pushdown for `Filter.key` / `Filter.foreignKeys`.
- [ ] Indexer key-collision events trigger the merge automatically.

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

### Blocker: automatic merge on space open needs the index first

Wiring `mergeDuplicates()` into `DatabaseImpl._open` / `setSpaceRoot` was tried and
**reverted**. Detection has no way to ask "which entities declare a natural key", so
it scans `Filter.everything()`, which hydrates the entire space into the working set.
That is not a test artifact — it broke three existing tests that assert lazy loading
(`entity-manager.test.ts` "pending links are loaded" and "linked objects are loaded
on update only if they were loaded before"; `query-api-stall.test.ts`), and at scale
it is the working-set explosion this codebase has been fighting elsewhere.

The fix is Phase 3 brought forward, and it is a **feature, not a patch**:

- `meta.naturalKey` needs a column on the `objectMeta` index
  (`index-core/src/indexes/entity-meta-index.ts` — migration, populate, query).
- A `Filter` cannot express the query detection needs ("has _any_ natural key",
  grouped), so this is a dedicated index query plus a service method, not
  query-planner pushdown. Note `metaKey` is post-filter only today
  (`echo-host/src/filter/filter-match.ts`) — nothing pushes meta fields to the index,
  so this would be the first.

Until then `db.mergeDuplicates()` is an explicit call: the caller opts into the scan.

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
