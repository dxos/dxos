# object-merging — Tasks

_Resume: worker-side merging is live and hardened through three review rounds (§4.8; 2026-08-02, 2026-08-03 ×2); next per TASKS backlog — doctor diagnostic, property-based determinism, relation endpoints as rewrite targets, collaborative-text policy, mixed-version tests. Uncommitted: none. Last: third-review fixes — transitive deletion follows redirects (relations/children at a loser stay visible), prototype-safe merge accumulation, loser docs flushed before intent clear, conflict-union fold watermark in both engines; all suites green._

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
  - Where the merge runs: **in the worker, off the indexing stream** — the final
    answer after three homes: on space open (reverted: hydrated the whole space),
    inside query evaluation (superseded: writes on the read path), on entity load
    (subsumed: detection is write-driven now). DESIGN.md §4.8.
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
- [x] `system.mergedInto` / `system.mergedAtHeads` schema fields + **resolver
      redirect-following** (sync + async ref resolution, 2026-08-02): an
      un-rewritten ref to a merged-away loser resolves to the survivor.
- [ ] Proto-guard snapshot for the new `system` fields.
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
- [x] **Merge in the worker, off the indexing stream** (DESIGN.md §4.8, option A of
      the 2026-07-31 review; supersedes the one-day query-evaluation implementation).
      `IndexingResult.naturalKeys` trigger set → `objectMeta.naturalKey` point lookup
      → raw-document merge in `echo-host/db-host/natural-key-merge.ts`. Client query
      path keeps a read-only filter dropping already-redirected losers. Covers
      entities reached by id/ref too — detection is write-driven, not result-set
      driven — which retires the separate merge-on-load item.
- [x] **2026-08-02 hardening** (adversarial review of the shipped path; DESIGN
      decision log has the full list): automatic straggler fold + sticky tombstone
      (worker services redirected entities on re-index — restore converges back,
      late edits reach the winner); objects-only enforced at API, detection, and
      worker; RawString-safe clone; structural (not reference) write guard in the
      client executor; `mergedFrom`/`meta.keys` append-in-place + dedup-on-read;
      ref rewrite recurses into arrays/nested records; query filter keys on the
      deleted flag (no restored-zombie); one-time cursor reset backfills the
      `naturalKey` column; chunked detection lookup; `@meta` stripped from FTS and
      reverse-ref content for document objects.
- [x] **2026-08-03 hardening** (second adversarial review; DESIGN decision log has
      the full list): worker reads/computes/writes in one synchronous block —
      load-time snapshots could put mid-merge edits below the fold watermark,
      permanently (one variant deterministic in a single pass); watermark advances
      only when the fold write applied; loser callbacks re-verify the natural key
      and deletion; winner deleted mid-flush stops the tombstones; **durable
      natural-key intent log** (`naturalKeyIntents`, written transactionally with
      the index cursors, cleared per serviced key, per-group error containment) —
      no detected duplicate is ever silently dropped; winner doc flushed before
      loser tombstones (cross-document crash ordering); client executor skips
      user-deleted candidates and empty-string keys; `rewriteReferences` and
      `foldLateEdits` never write to / fold into tombstoned or deleted parties;
      migration cursor wipe moved before the ALTER; DESIGN §4.10 (key mutation),
      canonicity→agreement, flag story, and stale claims reconciled. New unit
      suite `echo-host/db-host/natural-key-merge.test.ts` drives the group merge
      against real repo handles with injected mid-load/mid-flush mutations.
- [x] **2026-08-03 hardening, later** (third adversarial review; DESIGN decision
      log "2026-08-03, later" has the full list): transitive deletion follows
      `mergedInto` redirects — relations and children anchored at a merge loser
      stay visible, judged at the survivor (was: silent permanent disappearance
      on new clients, `@parent` included and previously undeclared);
      prototype-safe field accumulation in `Merge.merge`/`candidateOf` (`field in
    data` dropped `toString`/`constructor`/… fields; `__proto__` polluted the
      accumulator); loser documents flushed before a group reports serviced — the
      durability rule's dual, since the orchestrator clears the durable intent on
      that report; fold watermark read as the union of the stored register and
      its automerge conflicts in both engines, so a concurrent merge's stale
      surviving watermark never re-folds already-folded edits over newer winner
      state (residual value-register race documented in DESIGN §4.2 and
      `Merge.merge`'s doc). Regression tests in `Merge.test.ts` (prototype
      fields), `merge.test.ts` (relation/child at loser), and
      `natural-key-merge.test.ts` (flush ordering ×2, concurrent-merge watermark
      conflict via forked-and-merged doc states).
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

- [x] **`meta.naturalKey` index column** — `objectMeta.naturalKey` + migration +
      `(spaceId, naturalKey)` index + `queryByNaturalKeys` point lookup; populated
      from `@meta` on index update (`objectStructureToJson` now emits the meta
      section, which it previously omitted entirely).
- [ ] `Filter.naturalKey` equality pushdown for app-level lookups (optional; the
      merge itself no longer needs it).
- [x] Indexer key-collisions trigger the merge automatically — this is the shipped
      §4.8 mechanism, which also serves as the §4.9 proactive worker pass (event
      driven rather than a sweep).
- [ ] Meta-key columns + planner pushdown for `Filter.key` / `Filter.foreignKeys`.

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
- **`x ??= y` inside an automerge `change` callback returns the plain right-hand
  value, not the proxy the document wraps it in.** Mutating the alias
  (`(system.mergedFrom ??= []).push(id)`) writes into a detached array and the
  document never sees it — silently. Assign, then re-read through the parent.
- **The serialized object JSON fans out to three indexes.** Adding `@meta` for the
  entity-meta column also fed full-text search and the reverse-ref index; both had
  to learn to strip it for document objects (queue blocks always carried it).
- **Re-indexing is per-object, so a new column never backfills by itself.** Rows
  written before `naturalKey` existed stay NULL until the object itself changes;
  the migration resets index cursors once when it adds the column to an existing
  table.
- **A snapshot read before an `await` is not the document.** `handle.doc()` returns
  an immutable value; changes replicating in during a doc load leave old references
  stale. Mixing a stale snapshot (values, redirect chain) with the current doc
  (diff, heads) is how edits vanished below the fold watermark. Read, compute, and
  write in one synchronous block, and gate watermark advances on the write applying.
- **An index cursor is not a durable trigger.** The cursor commits before the merge
  runs, so anything derived from the batch in memory dies with a crash or a throw.
  Intent rows written in the same transaction as the cursor, cleared after
  servicing, are; `id <= maxId`-bounded deletes keep a concurrent pass's intents.
- **`new Repo({ network: [] })` in echo-host tests needs `await initSubduction()`**
  (beforeAll) — the subduction fork constructs a WASM `MemorySigner` in the
  constructor.

### References

- `DESIGN.md` — design doc (source of truth).
- Branch: `claude/echo-object-merging-research-dqtjx1` (research only, no PR by request).
