# M0 Migration Research — Expectations Report

_2026-08-01 · Feeding forward into implementation planning. Verdicts on the five stated
expectations, each proven or disproven by a clean, isolated vitest bench:
`packages/core/echo/echo-client-e2e/src/migration-bench/` (run:
`moon run echo-client-e2e:test -- src/migration-bench`). The bench is self-contained and
authoritative; the exploratory evidence behind it lives in
`echo-client-e2e/src/migration-research*.test.ts` (15 tests, 12 claims) and the analytical
writeups in [DESIGN.md](./DESIGN.md) §10.3 ("M0 Track A/B findings") and §10.5 ("What flows back
to object-merging"). Related: PR #12412 (natural-key merging, not landed)._

## Verdict summary

| #   | Expectation (as stated)                                                            | Verdict                                                     |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Single object is obviously solved already                                          | **Proven** (with constraints)                               |
| 2   | Multi-object works the same way as long as N→N                                     | **Proven** (with constraints)                               |
| 3   | Fan-in fine given a deterministic choice of removed object                         | **Qualified** — necessary, not sufficient                   |
| 4   | Fan-out: meta-key merging, loss only on conflicts, inspect/revert                  | **Proven**                                                  |
| 5   | Multi-object not atomic → vulnerable to corruption until cross-object transactions | **Qualified** — window real, but repairable, not corruption |

Every constraint listed below is demonstrated by a passing bench test, not argued from theory.

## E1 · Single object — PROVEN, with the constraint set implementation must carry

Suite: `migration-bench/single-object.test.ts` (4 tests).

Fold-forward works end to end: a migration records heads and a per-object marker, keeps source
properties, and any late old-shape write — made by a partitioned peer, before or after arbitrary
sync rounds — folds into the new shape without loss; chains (A→B→C) fold through composition;
independent folds on multiple peers converge. Genuine conflicts (late source write vs. direct
target edit) are invisible to Automerge (different keys, no CRDT conflict) but are detected by the
fold and recorded as data, losing neither side.

The constraints ("solved" is true only with all of these — each has a test that fails without it):

1. **Keep source properties.** The fold reads them; deletion forfeits recoverability. (Deletes
   don't destroy concurrent late writes — verified — but the rule stands for the fold's sake.)
2. **Two head-marks per migration event**: pre-migration heads (late-source-write detection) and
   post-migration heads (direct-target-edit / conflict detection, excluding the migration's own
   writes).
3. **Ancestry-check stored heads before diffing.** `A.diff` against heads a doc has never seen
   silently returns a full "everything is new" diff — an epoch re-root would make the fold re-apply
   the world. (Real epoch machinery remains unexercised; this is the observed failure shape.)
4. **Value-compare before every write.** Automerge emits patches for equal-value writes (strings:
   `put ''` + `splice` unconditionally), so a heads-driven fold loop that doesn't compare values
   never settles — values converge, writes ping-pong forever.
5. **Equal values never conflict.** Another peer's identical fold write is indistinguishable from a
   direct edit by heads alone; conflict classification must compare values before recording, or
   racing identical folds mint spurious `{mine: X, theirs: X}` records. (Found live, as a race in
   the bench itself.)
6. **A composed chain fold is one `Obj.update`.** Split across updates there is an observable,
   replicating window where the object is half-folded through the chain.
7. **Per-object migration state, not a space scalar.** A marker via `Annotation.set` on
   `EntityMeta.annotations` works and replicates today; `EntityMeta.version` itself is fixed at
   creation.

## E2 · Multi-object N→N — PROVEN: same machinery, per object, plus one cross-object rule

Suite: `migration-bench/multi-object.test.ts` (2 tests).

Independently migrated objects fold independently under one partition — each object's heads,
marker, folds, and conflicts are its own; one object's conflict does not perturb another's clean
fold. A cross-object **move** (`person.employerName` → `company.industry`) also works: the fold
diffs the source object's heads but writes the _target_ object, guarded and conflict-aware against
the target's own post-migration heads, and independent folds on both peers converge.

The one addition over E1: the fold's read-set and write-set span objects, so every E1 constraint
applies per object _pair_ (heads recorded on both ends), and the pair write is subject to E5's
non-atomicity — an accepted, repairable window, not a correctness loss.

## E3 · Fan-in — QUALIFIED: the stated condition is necessary but not sufficient

Suite: `migration-bench/fan-in.test.ts` (4 tests). The expectation as stated ("fine as long as
there's a deterministic way to choose the object being removed") holds only for the trivial case;
the proven, complete condition is:

> Fan-in is fine with (1) a deterministic removal choice **and** (2) a declared property-collision
> resolution **and** (3) a query-based late-child path.

All three qualifiers are independently load-bearing:

- **(1) alone suffices only for a single child.** Deterministic absorption of one child converges
  on both peers, tombstones idempotently, and re-absorbs as a zero-write no-op.
- **(2) is forced by property collision.** Two children absorbing into one parent property: with a
  declared resolution (min-child-id), both peers converge deterministically, the displaced value is
  recorded `{mine, theirs, loserId}`, and the losing child remains intact under its tombstone.
  Without one, the register still converges — but the winner is actor-id-randomized per run (there
  is not even an accidental "first/last writer wins" to lean on), and the displaced value vanishes
  from the property with no record. Removal choice does not touch this failure mode at all.
- **(3) is forced by late entity creation.** A child created (by an old-schema partitioned peer)
  _after_ the fan-in completed has no migration heads by construction — heads-based detection
  categorically cannot see it. A query-based path (`Filter.type(child) ∧ Filter.props({ownerId})`,
  tombstones excluded by default) detects it; the same declared resolution absorbs it; re-detection
  converges to empty. Verified across two rounds with both peers detecting and absorbing
  independently.

Late writes to an already-absorbed (tombstoned) child also fold forward: the clean path reaches the
parent property; the conflict path (parent directly edited since absorption) preserves the direct
edit and records the late value as displaced — nothing silently lost, child tombstoned throughout.

Note for E5: absorption is two operations (parent update, child tombstone) — its torn intermediate
state is covered by the E5 verdict, not re-tested here.

## E4 · Fan-out — PROVEN: meta-key merging with loss only on genuine conflicts, inspectable and revertible

Suite: `migration-bench/fan-out.test.ts` (3 tests). Builds on PR #12412's shape (natural-key
duplicates, min-id winner, tombstoned losers) and improves its merge semantics.

- **The defect in plain per-field winner-preference, quantified**: for migration-minted duplicates
  the deterministic transform wrote every field on both copies, so "the winner defines it" is
  vacuously true and a loser-side edit loses to the winner's untouched baseline value — exactly one
  unconflicted field lost in the bench scenario, with the genuinely contested field also dropped
  silently.
- **Baseline-aware three-way merge fixes it**: classify each field against the shared baseline
  (for migration duplicates a free, pure recomputation of the transform). Winner-at-baseline +
  loser-edited → take the loser's; equal or loser-at-baseline → keep, no write; both diverged and
  disagree → genuine conflict: keep the winner's value, record
  `conflicts[field] = { mine, theirs, loserId }`. Both disjoint edits survive; loss occurs only
  where two peers actually contradict each other.
- **Inspect and revert**: the conflict record is keyed per property (concurrent identical merges
  converge; multiple conflicting fields compose), and the tombstoned loser remains fully readable
  under `deleted: 'include'`, agreeing with the record — a UI can flip to "theirs" from either
  source, and the flip converges.
- **Convergent and idempotent**: independent merges on both peers produce identical state
  _including_ the conflict record; re-merge on the converged state is zero writes.

Implementation requirements this imposes: the migration transform must be **deterministic and
re-derivable** (the baseline is recomputed, not stored) — for non-migration duplicates a stored
baseline (creation heads or fork snapshot) is the unbuilt extension path; duplicates must be
created with a **derived meta key** (`<lensId>:<sourceId>:<role>` format) — and never with derived
object ids: same-id creation makes peers diverge permanently (each client caches the first
`links[id]` URL it binds and never re-observes; verified, flows back to #12412's never-see-two
reasoning).

## E5 · Multi-object atomicity — QUALIFIED: the window is real, but it is repairable inconsistency, not corruption

Suite: `migration-bench/atomicity.test.ts` (3 tests).

- **The window is real and replicates.** Applying half a two-object write set ("crash" after step
  one) leaves an observable inconsistent state locally, and per-doc replication propagates the half
  to other peers as-is.
- **A resumable, idempotent runner always closes it.** Re-running the _full_ write set — every step
  value-compare guarded — from a _different_ peer than the one that crashed completes exactly the
  missing half; a third run from yet another peer performs zero writes. So the correct statement
  is: multi-object migrations are subject to temporary, observable, replicating inconsistency
  windows until cross-object transactions land — but with effects-as-data write sets and guarded
  idempotent application, any peer can complete an interrupted migration and no state is corrupted.
  ("Effects as data" — DESIGN.md §10.5 — is what makes the re-run possible; a callback-shaped
  migration cannot be resumed.)
- **Relations are the one free mitigation.** A relation whose endpoints haven't arrived is
  strong-deps-gated: excluded from queries, never an error, self-surfacing when resolvable. Plain
  refs and properties get no such protection. Worth exploring: whether other cross-object writes
  can be modeled to get strong-deps-style gating during their window.

Note also that a step whose write primitive isn't naturally idempotent (e.g. `Annotation.set`,
`db.remove`) needs its own guard (`isDeleted()` check, marker check) — idempotence is a property
the runner must enforce per step, not assume.

## Consolidated obligations for the implementation plan

1. Migrations keep source properties; retirement is a separate compaction concern (with the
   fold-forward window policy still an open question).
2. Per migration event, per object: pre- and post-heads + a marker on `EntityMeta.annotations`;
   heads must be ancestry-checked before use (epoch interaction).
3. Every fold/merge/runner write: value-compare first; equal values never conflict.
4. Composed chain folds and per-object write batches: single `Obj.update`.
5. Late-created entities: a query-based detection path ("old-shaped and unmarked"), structurally
   separate from the heads-based property fold.
6. Migration-created objects: random id + derived meta key, mandatory; never derived object ids.
7. Duplicate collapse: baseline-aware three-way merge with per-property conflict records and
   tombstoned (never erased) losers; transforms must be deterministic/re-derivable.
8. Fan-in: declared removal choice AND declared property-collision resolution (no defensible or
   even accidental default exists) — plus the E3 items pending below.
9. Cross-object migrations: effects-as-data write sets, per-step idempotence guards, resumable
   from any peer; document the inconsistency window until cross-object transactions land.
10. 1→N splits: durable per-element key must be stamped into elements (automerge list identity is
    convergent but destroyed by any reorder).

## Out of scope / open

- Real epoch/compaction behavior against stored heads (only the foreign-heads failure shape is
  characterized).
- The collapse engine itself (PR #12412) — the bench proves the substrate and the improved merge
  semantics, not the worker-integrated engine.
- Non-`Ref` back-reference gaps for the fan-in cardinality check (markdown links, feed blocks,
  side maps, bare-EID relation endpoints).
- The fold-forward trigger and its runtime cost (DESIGN.md §10.7 q6).
- Collaborative-text merge policy (a text baseline would extend only-on-conflict discipline to
  text; unexplored).
