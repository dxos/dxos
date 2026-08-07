# M0 Migration Research — Final Report

_2026-08-02 · The definitive record of the migration research: the final design, the evidence that
proves it, and the alternatives ruled out along the way. DESIGN.md §10 states outcomes and points
here for detail. Evidence:
`packages/core/echo/echo-client-e2e/src/migration-bench/` — the minimal proving suite (6 files,
22 tests; run `moon run echo-client-e2e:test -- src/migration-bench`). Related: PR #12412
(natural-key merging, not landed)._

## The final design

**A migration is a lens-backed standing rule, not a one-shot script.** It records per-object state
(pre/post heads + a done-marker on `EntityMeta.annotations`), keeps source properties, applies
minimal guarded writes, and can be re-run by any peer at any time — re-running is both crash
recovery and fold-forward for late old-schema data. Concretely, per shape:

1. **Single object (incl. chains).** Fold-forward: `A.diff` from recorded pre-migration heads
   names late source writes exactly; folds apply value-compare-guarded minimal writes; chains
   compose in one `Obj.update`. Constraints (each has a test that fails without it): keep source
   properties; record pre- AND post-heads; ancestry-check stored heads before diffing (`A.diff`
   with foreign heads silently returns "everything is new"); value-compare before every write
   (equal-value writes still emit patches — unguarded fold loops never settle); equal values never
   conflict (racing identical folds are indistinguishable from direct edits by heads alone);
   per-object markers, never a space scalar.
2. **N→N multi-object.** Same machinery per object, including cross-object moves (diff the source
   object, write the target object, conflict-aware against the target's post-heads). The pair
   write is subject to the non-atomicity window (7).
3. **Fan-in (N→1).** Requires all three, each independently load-bearing: a deterministic removal
   choice; a **declared** property-collision resolution (the concurrent-write winner is
   actor-id-randomized — there is no accidental default, and the displaced value vanishes without
   one); a query-based late-child path (a child created after the fan-in has no heads by
   construction — heads-based detection categorically cannot see it). Late writes to tombstoned
   children fold forward; tombstones never erase.
4. **Fan-out (1→N objects).** Migration-created objects get a random object id + a derived meta
   key (`<lensId>:<sourceId>:<role>`); duplicates from independent peers collapse **passively**
   via the merge engine (#12412). Duplicate collapse uses the **baseline-aware three-way merge**:
   classify each field against the recomputable baseline (the deterministic transform re-run);
   take unconflicted loser edits; genuine conflicts keep the winner's value and are recorded;
   losers are tombstoned, never erased. This is the proposed improvement to #12412's per-field
   winner-preference, which loses unconflicted loser edits for migration-minted duplicates.
5. **Array fan-out (1→N from a collection).** RATIFIED: a define-time precondition + two-step
   composition. Fanning an array out requires each element to carry a **pre-existing stable id**,
   used in the meta key (`<lensId>:<parentId>:<elementId>`); declaring an array fan-out over an
   id-less element schema is a definition error. Id-less arrays compose two ordinary migrations:
   **step 1** stamps a random id per element (`element.id ??= randomId()` — presence-guarded,
   idempotent, purely schema-level; concurrent stampers' register conflicts settle by LWW);
   **step 2**, shipped after step 1 has reconciled, splits by element id — peers split
   independently and duplicates collapse passively via merge keys. The temporal gate carries the
   correctness; no id determinism, baseline agreement, or cleanup process is needed. Residual: a
   peer partitioned across the entire step-1 rollout that also reorder-recreated an element can
   race the id; this degrades to reviewable duplicates in the existing dedup machinery.
6. **Conflicts are history-native.** No app-level conflict records. The fold writes via `changeAt`
   at the recorded migration heads, re-keying the late value into the concurrent past — a real
   CRDT conflict on the target key, replicating identically, inspectable via `A.getConflicts` now
   and at historical frontiers (clone before viewing — a live-doc view's conflicts are emptied by
   later writes), discoverable by an unmodified history walker (conflict-flagged patches), and
   attributable via change `message`/`time` (plumbed, surfaced by `getEditHistoryWithDiffs`). The
   winner is a deterministic **policy**: plain live-handle `changeAt` → the fold wins by Lamport-
   counter dominance; fork a view at the migration heads with a sentinel all-zeros actor and merge
   back via `docHandle.update(doc => A.merge(doc, clone))` → counters tie and the fold
   deterministically loses (**user wins — recommended default**). Same-key concurrent writes are
   history-native for free.
7. **Multi-object non-atomicity is a repairable window, not corruption.** The half-applied state
   of a cross-object write set is observable and replicates — but with effects-as-data write sets
   and per-step idempotence guards, **any** peer completes an interrupted migration by re-running
   it, and a further run is zero writes. Relations get strong-deps gating for free (an incomplete
   relation subgraph never surfaces, never errors); plain refs/properties expose the window.
   Cross-object transactions, when Automerge ships them, absorb the same write sets unchanged.
8. **Epochs are a last resort, platform-owned, and deliberately erase history.** Migration never
   depends on them. When one runs: live history-native conflicts are dropped and the fold-forward
   window closes at the boundary — owned consequences; the heads ancestry check makes the boundary
   safe (folds stop on foreign heads instead of re-applying the world), and its failure doubles as
   the app-consumable "you missed an epoch, review your changes" signal. Epoch timing IS the
   fold-forward window policy. Epoch management is not exposed at the app level.

### Proposed API embodiment: `Migration.declare` + a guarded `Write` vocabulary

A migration declares a `match` query and a **pure, synchronous** `migrate()` returning the complete
intended write set as data — `Write.assign` (value-compare guarded), `Write.ensure` (create-by-meta-
key, never by caller-chosen object id), `Write.relate`, `Write.stamp` (marker + heads), plus
`Write.report` for rejected partial transforms (leave source, report, never half-create). The
vocabulary cannot express an unguarded or destructive write; the runner groups writes per target
object into one `Obj.update`, and recovery is re-execution: guards make completed work vanish, so a
crash anywhere is healed by any peer re-running the whole set. The same declaration is the M2
fold-forward standing rule, with conflicting `assign`s downgraded to the history-native conflict
representation (6). The lens supplies determinism, coverage reporting, `checkLaws` verification,
and bidirectionality (rollback / fan-in derived from fan-out's `put`).

## Evidence map

`migration-bench/` — self-contained; `harness.ts` carries the shared idioms (transport-level
partition/heal, heads/diff helpers, guarded writers, `writesSince` — conflict-marker patches are
metadata, not writes).

| Suite                       | Proves                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `single-object.test.ts` (4) | Design 1 end-to-end: lifecycle with conflict detection + iterated folds, composed chains, independent-fold convergence, the foreign-heads ancestry caveat                                                                                              |
| `multi-object.test.ts` (2)  | Design 2: independent per-object folds; the guarded cross-object move, clean and conflicting paths                                                                                                                                                     |
| `fan-in.test.ts` (4)        | Design 3: all three conditions independently load-bearing; late writes to tombstoned children; two-round late-child detection/absorption                                                                                                               |
| `fan-out.test.ts` (3)       | Design 4: winner-preference's unconflicted loss quantified; three-way merge preserves it; inspect/revert via record + tombstone; independent merges converge, re-merge zero-write                                                                      |
| `atomicity.test.ts` (3)     | Design 7: the window is real and replicates; any-peer idempotent resume; zero-write third run; strong-deps gating for relations                                                                                                                        |
| `conflicts.test.ts` (6)     | Design 6: fold-at-heads materializes a rename conflict; historical inspection (clone caveat); history-walk discovery; message attribution; winner-policy determinism both ways (counter dominance vs sentinel-actor tie loss); same-key conflicts free |

Not separately benched (proven in since-pruned exploratory suites; retained here as findings):
concurrent map-key delete-vs-write survival; identity-key duplicates replicating addressably;
`Annotation.set` markers replicating; late-created entities replicating and queryable;
`referencedBy` cardinality; tombstoned objects readable under `deleted: 'include'` and
resurrectable by re-add. Design 5's two-step composition is a composition of proven pieces
(guarded stamping = design 1 machinery; split-by-key = design 4) and has no dedicated bench test;
one is optional.

## Ruled out, and why

- **Derived object ids for convergent creation** — two peers minting the same object id **diverge
  permanently**: each client caches the first `links[id]` URL it binds and never re-observes the
  map, so the peers disagree forever, silently. (Stronger than the object-merging research's
  "silent orphaning" framing; flowed back.) Identity lives in meta keys; object ids stay random.
- **App-level conflict records** — worked (originally proven in the bench), but ruled out by
  directive: all history must be browsable via automerge history, and a shadow record duplicates
  what the op DAG can carry. Superseded by history-native conflicts (design 6).
- **Per-field winner-preference merge without a baseline** (#12412's current semantics) — for
  migration-minted duplicates the transform wrote every field on both copies, so "the winner
  defines it" is vacuously true and a loser's unconflicted edit loses to the winner's untouched
  baseline value. Quantified in `fan-out.test.ts`; fixed by the three-way merge.
- **Embedded element stamps written by migration-time backfill (without the temporal gate)** — a
  concurrent reorder is remove+insert and recreates the element from a snapshot that may not
  include the stamp yet; orphan-keyed split objects follow. Also: cloning an element duplicates
  its stamp (false merge). The two-step design keeps the stamp-in-data idea but the gate ("step 2
  ships after step 1 reconciles") removes the race; the clone hazard remains a known caveat of
  array elements generally.
- **Automerge ObjID as a durable element key** — convergent across peers, stable under in-place
  edits, distinct under concurrent inserts (all verified), but any splice-based reorder mints a
  new ObjID and automerge has no list-move — normal app usage destroys it. Demoted to optional
  noise reduction for stamping. The same verdict applies to rich-text block identity: blocks need
  stamped ids, not bare list identity.
- **Content-hash element keys** — survive reorders but falsely merge legitimately identical
  elements (two equal addresses in one list). Disqualified.
- **Baseline-position element keys** (`baselineIndex` inside `A.view` at migration heads) —
  verified reorder-immune and byte-identical across peers _given a shared baseline_, but
  independently-started conversions stamp different baselines; the marker race then mints keys
  only the losing baseline derives — orphans with no passive collapse.
- **The derivability sweep** (active cleanup for those orphans) — designed and rejected on
  principle: if array fan-out cannot reduce to object-merging keys, it degrades into active
  tracking and loose-end chasing. The stable-id precondition + two-step composition achieves the
  reduction instead.
- **Whole-`Record` assignment as a map-write idiom** — `obj.rec = { ...prev, [k]: v }` replaces
  the container object; two concurrent writers hit container-level LWW and one peer's entire map
  is discarded (convergence only by content coincidence). Platform rule: pre-seed the container at
  creation, write per-key. (Even per-key, same-key concurrent equal writes leave a real conflict
  marker until superseded.)
- **Heads-driven folds without value comparison** — automerge emits full patch pairs for
  equal-value string writes, so a fold loop keyed on "heads moved" re-writes forever: values
  converge, writes ping-pong. Value-compare is mandatory; equal values never conflict.
- **Epochs as a migration mechanism** — retired; migration correctness never depends on one
  (design 8). Coordination (leader/lease) retired as a default — retained only as an opt-in for
  genuinely effectful migrations.
- **Automerge Table / list cursors** — Table is vestigial in automerge 3 (no API); cursors are
  text-only. Neither serves element identity.

## Open items

- The fold-forward trigger and its runtime cost (DESIGN.md §10.7 q6) — the one unpriced element.
- Collaborative-text: schema-declared text fields route through `splice` writes (vocabulary
  exists); the duplicate-merge case needs an app-level three-way text diff against the recomputed
  baseline — unbuilt, also answers #12412's open text policy.
- Real epoch machinery against stored heads (only the foreign-heads failure shape is
  characterized).
- A first-class fold-at-heads primitive (the user-wins path is a four-step dance today).
- Optional composition spikes: the two-step array fan-out under partition/reorder; step-1 rollout
  race surfacing as reviewable duplicates.
- #12412 adoption: baseline-aware merge; the permanent-divergence finding; winner-side heads for
  conflict detection; minimal writes in the executor.

## Sequencing

M1 (lens-backed single-object, shippable, documents its residual loss) gates on Phase 5 (Lens into
`@dxos/echo`); fan-out collapse gates on #12412 landing; M2 (fold-forward standing rule — what
meets the losslessness bar) integrates this report. Every load-bearing mechanism above has a
passing test; the remaining work is engineering with known shape, not feasibility research.
