# object-merging — Tasks

_Resume: design review of DESIGN.md §7 open questions, then Phase 0 spike. Uncommitted: none. Last: research reworked per decision (no deterministic ids; merge engine only)._

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
- [ ] **Design review** — settle the 5 open questions in DESIGN.md §7:
  - Identity field: `meta.key` + `meta.version` (recommended) vs designated
    `ForeignKey` source vs new field.
  - Version matching: exact (recommended) vs semver-range.
  - Merge-policy pluggability vs fixed field-wise semantics.
  - Where the merge runs: client on space open vs host job vs indexer-triggered.
  - Scope: objects only first; relations as merge subjects deferred?

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

- [ ] `system.mergedInto` schema field + resolver redirect-following (inert) +
      proto-guard snapshot.
- [ ] Internal relation-endpoint mutation (plumb `ObjectCore.setSource/setTarget`).
- [ ] Creation-side API for declaring an identity key (+ `db.ensure`-style helper).
- [ ] Feature flag, default off outside tests.

## Phase 2: Merge engine (flagged)

- [ ] Duplicate detection (query post-filter), deterministic merge executor,
      tombstone+redirect, opportunistic ref rewrite.
- [ ] `plugin-doctor` duplicates diagnostic + "merge now" repair action; surface
      class-1 (same-id-two-docs) anomalies as an explicit diagnostic.
- [ ] Multi-peer convergence + property test suite (DESIGN.md §5.2–5.4).

## Phase 3: Indexing & automation

- [ ] Meta-key columns + planner pushdown for `Filter.key` / `Filter.foreignKeys`.
- [ ] Indexer key-collision events trigger the merge automatically.

## Phase 4: Adoption & generalization

- [ ] Convert hot spots: trace feed, `db.addType`, `SHARED` expando,
      `SpaceProperties` + root collection.
- [ ] Restore plugin default-content provisioning (`OnCreateSpace`).
- [ ] Generalize to `meta.keys` foreign keys; migrate `syncObjects` /
      `getOrCreate` / plugin-ibkr alias folding; delete divergent dedup impls.

## Phase 5: GC (optional)

- [ ] Epoch-based compaction of merged-away tombstones.

### References

- `DESIGN.md` — design doc (source of truth).
- Branch: `claude/echo-object-merging-research-dqtjx1` (research only, no PR by request).
