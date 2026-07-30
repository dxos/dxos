# object-merging — Tasks

_Resume: ratify the identity field's name + shape (DESIGN.md §4.4 / §7 Q6), then start the Phase 0 spike. Uncommitted: none. Last: design review settled 4 of the 5 §7 questions._

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

## Phase 0: Spike (throwaway, tests only)

Prove convergence end-to-end; time-boxed ~1–2 weeks. See DESIGN.md §6 Phase 0.

- [ ] **Minimal end-to-end merge** — 3 `EchoTestPeer`s, duplicate keyed objects,
      min-id winner, `mergedInto` redirect, resolver hook, ref rewrite via
      `Query.referencedBy`; convergence under randomized sync orders incl. the
      partial-view chain case.
- [ ] **Merge-function shape** — prototype field-wise winner-preference on 2–3
      real types (Collection, Feed, Expando); check semantics are acceptable.
- [ ] **Decision memo** — confirm identity field, merge-run location, and
      merge-function semantics; go/no-go.

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
- [ ] Feature flag, default off outside tests.

## Phase 2: Merge engine (flagged)

- [ ] Duplicate detection (query post-filter), deterministic merge executor,
      tombstone+redirect, opportunistic ref rewrite. Runs on every client at space
      open (decision 2026-07-30); measure against the Phase 0 numbers.
- [ ] `EntityKind.Object` as merge subject; relation endpoints rewritten when an
      endpoint is merged away.
- [ ] `plugin-doctor` duplicates diagnostic + "merge now" repair action; surface
      class-1 (same-id-two-docs) anomalies as an explicit diagnostic.
- [ ] Multi-peer convergence + property test suite (DESIGN.md §5.2–5.4).

## Phase 3: Indexing & automation

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

### Gotchas found while implementing

- **Adding a field to `EntityMeta` is not one change.** Two hand-maintained field
  lists silently drop anything they do not enumerate, and neither fails loudly:
  `getSnapshot` (`echo/src/internal/Obj/snapshot.ts`) rebuilds meta from an explicit
  allowlist, so the field vanished from every snapshot; and `metaNotEmpty`
  (`echo-client/src/echo-handler/echo-handler.ts`) decides whether meta is persisted
  at all, so an object whose _only_ meta was a natural key never wrote its meta
  section. Both are now updated. Worth collapsing into one derived list.

### References

- `DESIGN.md` — design doc (source of truth).
- Branch: `claude/echo-object-merging-research-dqtjx1` (research only, no PR by request).
