# Lens-Backed Migrations — Implementation Plan

_2026-09-25. Turns [M0-REPORT.md](./M0-REPORT.md) and the decisions in [DESIGN.md](./DESIGN.md) §10.7
into shippable phases. Supersedes the M1/M2 task lists in [TASKS.md](./TASKS.md) where they
disagree (those predate the research). Every phase ships on its own and leaves the system strictly
better than before._

## Where things live

| Piece                                                           | Package                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Lens`, `Migration.declare`, the `Write` vocabulary             | `@dxos/echo` (after Phase 5 promotes `Lens`)                       |
| `foldAt` (write at recorded heads, own actor, change `message`) | `@dxos/echo-client` `ObjectCore` (internal)                        |
| Fold-forward runner                                             | `@dxos/echo-host`, off the worker indexing stream                  |
| Creation-heads replay for convergence-key duplicates            | `@dxos/echo-host` `ConvergenceKeyMerger` (object-merging project)  |
| Legacy space-level `Migrations`                                 | `@dxos/migrations`; callers `AppMigrations`, `plugin-space`, `cli` |

## Phase A — prerequisites (parallel)

1. **Promote `Lens` into `@dxos/echo`** (lenses Phase 5): beside `Type`/`Annotation`, `Obj.lens` entry
   point, every call site updated, no re-exports. Engine, hooks and coded lenses stay outside core.
2. **Engine adoption** (object-merging project): record `system.creationHeads` at creation; in
   `#mergeCandidates` replay each loser's edits since its creation at the winner's creation heads
   for loser-edited fields; skip text replay when creation text differs. Proven in
   `fan-out-engine.test.ts` / `text.test.ts`.
3. **Type-switch primitive**: whatever the validation spike finds for moving an object from
   `@1` to `@2` in one change with its data (`validation.test.ts`, in progress).
4. **Stale live proxy after a remote reorder** (ECHO bug from `array-fan-out.test.ts` A2b): file and
   fix independently; migrations re-query per run meanwhile.

## Phase B — M1: single-object, lens-backed, per-object state

The migrations we support today (one object, one type, in place), made safe. Does not yet catch
late old-schema writes; says so in the docs.

1. `Migration.declare({ from: 'T@1', to: 'T@2', lens | migrate })` — pure, synchronous; `migrate()`
   returns a write set as data. `Migration.fromLens(L)` for mapping-expressible steps.
2. `Write` vocabulary, guarded by construction: `assign` (value-compare), `assignText`
   (`updateText` once the target exists, plain create otherwise), `report` (leave source, flag).
3. Define-time checks: lens coverage (`dropped` surfaced as a reviewable diff) and `checkLaws` over
   generated instances.
4. Apply per object in **one change**: minimal writes + type switch + per-object marker
   (`Annotation.set` on `EntityMeta.annotations`) + pre/post heads. Whole write set validated
   against the target version first (§10.7 q5).
5. Keep source properties; the target schema accepts them as retired.
6. "What is left to migrate" becomes a query on type version, replacing the space-level
   `MigrationVersionAnnotation` scalar. Port `AppMigrations`, `plugin-space`, `cli`.
7. Migrations are kept indefinitely; retirement is a designed-in but unused path (§10.7 q3).

**Done when**: bench single-object suite passes against the real API; a concurrent edit to an
untouched property survives a migration; a crash mid-space resumes from any peer.

## Phase C — M2a: fold-forward as a standing rule

1. `ObjectCore.foldAt(heads, mutate, { message })` — `changeAt` at recorded heads under the peer's
   own actor. **Winner policy** is resolved by readers from `A.getConflicts` using change `message`
   (user wins by default); no shared sentinel actor.
2. Runner in the worker indexing stream (§10.7 q6): on a re-indexed object carrying a migration
   marker, ancestry-check its stored heads, `A.diff` from post-heads, fold source-property writes
   with value-compare guards; equal values never conflict. Durable intents in the indexing
   transaction, like the convergence-key merger.
3. Text folds: splice replay with two markers per property (source checkpoint + target fork
   frontier).
4. Conflict read API: presented value by policy + the alternatives, for a review UI.
5. **Measure the runner's cost** on the indexing hot path (the one unpriced element).

**Done when**: every late-write case in `single-object`, `conflicts`, `text` passes through the
real runner with no test-side folding.

## Phase D — M2b: multi-object

1. N→N and cross-object moves: effects-as-data write sets, per-step guards, any-peer idempotent
   resume (`atomicity.test.ts` shape). Relations stay hidden until complete via strong deps.
2. Fan-out: `Write.ensure` = create with random id + `meta.convergenceKey`
   (`<lensId>:<sourceId>:<role>`); collapse and ref redirects come from the engine (Phase A2).
3. Fan-in: requires a declared removal choice, a declared collision resolution, and a query-based
   late-child pass; definition error without them.
4. Array fan-out: definition error without a stable element id; ship the id-stamping migration
   first, the split later. Doctor diagnostic for reviewable duplicates (child `elementId` absent
   from the parent's array). Gate: id present + no id conflicts + reconcile write.

## Phase E — views and versioning

1. Registry resolves a view as the shortest lens path between type versions, deterministic
   tie-break; migrations never use discovered paths (§10.7 q4).
2. Overlay promotion as an ordinary migration; fold-forward also diffs the annotations path
   (§10.7 q1).

## Not in scope

Epochs and retirement tooling; the unified lens/branch/migration model (recorded long-term target,
§10.7 q7); branch-based migration preview.

## Sequencing

```
A1 (Lens → @dxos/echo) ──► B (M1) ──► C (fold-forward) ──► D (multi-object) ──► E (views)
A2 (engine replay) ─────────────────────────────────────────► D fan-out
A3 (type switch) ─────► B
A4 (proxy bug) ─────────────────────────────────────────────► D array fan-out
```

B, C and D each land as their own PR stack; the bench suites in
`echo-client-e2e/src/migration-bench/` become the acceptance tests, rewritten against the real API
as each phase lands.
