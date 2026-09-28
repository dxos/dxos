# Lens-Backed Migrations — Implementation Plan

_2026-09-25, starting point (committed 2026-09-27). Turns [M0-REPORT.md](./M0-REPORT.md) and the decisions in [DESIGN.md](./DESIGN.md) §10.7
into shippable phases. Supersedes the M1/M2 task lists in [TASKS.md](./TASKS.md) where they
disagree (those predate the research). Every phase ships on its own and leaves the system strictly
better than before._

## Status (2026-09-27): all phases implemented on this branch

| Phase  | Commit                                         | What landed                                                                                                                      |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A1     | `1ea37277`                                     | `Lens` promoted into `@dxos/echo`; `echo-panproto` keeps engine + hooks                                                          |
| A2     | `c150dd00`                                     | Merge engine replays a loser's pre-merge edits at the winner's creation heads (text only on equal baselines)                     |
| A3     | `70cf198f`                                     | Type switch = internal `ObjectCore.setType`, used by the runner                                                                  |
| A4     | `42ff5f66`                                     | Stale nested `id` on record refresh (array element reused by a remote reorder)                                                   |
| B (M1) | `70cf198f`, `44cf023f`, `b779cd04`, `3bfe18bd` | Minimal-write single-change migrations, retired props in the marker, `Migration.fromLens`, crash resume (live-type guard)        |
| C1/C4  | `773bae1f`, `79b5df3b`                         | `ObjectCore.foldAt` (fresh actor per fold), `Obj.getConflict` (user-wins; equal values are no conflict)                          |
| C2/C3  | `69c4100e`                                     | `db.foldForward` / `db.watchFoldForward`: pending work derived from marker + history, character-wise text renames                |
| C5     | `8cae3897`                                     | Cost: ~0.6 ms per migrated object per idle pass, 11–18 ms scoped pass, ~15 ms per late write                                     |
| D      | `b3af6336`, `0c110911`                         | `ensure`/`assign`, `defineFanIn`, `defineStampElementIds`, `defineArrayFanOut` (+ raced-stamp reconcile), `findOrphanedChildren` |
| E1     | `1191627c`                                     | `Lens.compose`, `Lens.invert` (safe subset), version-aware `Lens.findPath` / `resolveView`                                       |
| E2     | `1f759c03`                                     | Fold-forward also carries late overlay writes into promoted properties                                                           |

**Limit fixes (decided 2026-09-27, all to implement):** (1) a per-peer, per-document derived fold
actor with folds forked from the migration heads plus that actor's previous fold — deterministic,
bounded actor growth; (2) the migration marker becomes a list of steps so chained migrations fold in
order; (3) fan-in marks absorbed children and folds late edits to them into the parent (with the type
switch); (4) array fan-out folds late array writes per element (edits into existing children, new
id'd elements ensured, removals left to the orphan diagnostic).

Limit fixes landed 2026-09-28: `564ed5ee` (scoped deterministic fold actor per peer/document/object/step;
chained marker steps), `2e9cbef2` (fan-in type switch + fold of late child edits, collision policy bypassed
only for keys taken from the child), `ca86f3b8` (array fan-out: atomic split, per-property marker, per-element
fold, ref dedup, durable async `ensure`). Remaining limits: two peers creating the migration marker container
for the first time can still race (both record the same migration); equal-valued folds from independent peers
are reported as no conflict by design; the ref-dedup test builds the merged state on one peer rather than via
two replicating peers.

## Where things live

| Piece                                                                | Package                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Lens`; the existing `Migration` module grows the `Write` vocabulary | `@dxos/echo` (after Phase 5 promotes `Lens`)                       |
| `db.runMigrations` (today: `atomicReplaceObject`)                    | `@dxos/echo-client` `proxy-db/database.ts`                         |
| `foldAt` (write at recorded heads, own actor, change `message`)      | `@dxos/echo-client` `ObjectCore` (internal)                        |
| Fold-forward runner                                                  | `@dxos/echo-host`, off the worker indexing stream                  |
| Creation-heads replay for convergence-key duplicates                 | `@dxos/echo-host` `ConvergenceKeyMerger` (object-merging project)  |
| Legacy space-level `Migrations`                                      | `@dxos/migrations`; callers `AppMigrations`, `plugin-space`, `cli` |

## Phase A — prerequisites (parallel)

1. **Promote `Lens` into `@dxos/echo`** (lenses Phase 5): beside `Type`/`Annotation`, `Obj.lens` entry
   point, every call site updated, no re-exports. Engine, hooks and coded lenses stay outside core.
2. **Engine adoption** (object-merging project): record `system.creationHeads` at creation; in
   `#mergeCandidates` replay each loser's edits since its creation at the winner's creation heads
   for loser-edited fields; skip text replay when creation text differs. Proven in
   `fan-out-engine.test.ts` / `text.test.ts`.
3. **Type-switch primitive**: the only one today is the internal `ObjectCore.setType`
   (`validation.test.ts` V1); expose it to the migration runner rather than building a new one.
4. **Stale live proxy after a remote reorder** (ECHO bug from `array-fan-out.test.ts` A2b): file and
   fix independently; migrations re-query per run meanwhile.

## Phase B — M1: single-object, lens-backed, per-object state

The migrations we support today (one object, one type, in place), made safe. Does not yet catch
late old-schema writes; says so in the docs.

1. **DONE (`Migration.fromLens`):** Extend the existing `Migration` module (`Migration.define` / `defineRename` in `@dxos/echo`)
   rather than adding a parallel API: `migrate()` returns a write set as data (pure, synchronous);
   `Migration.fromLens(L)` for mapping-expressible steps. `transform`-style definitions keep
   working and are compiled to a write set.
2. `Write` vocabulary, guarded by construction: `assign` (value-compare), `assignText`
   (`updateText` once the target exists, plain create otherwise), `report` (leave source, flag).
3. Define-time checks: lens coverage (`dropped` surfaced as a reviewable diff) and `checkLaws` over
   generated instances.
4. Apply per object in **one change**: minimal writes + type switch + per-object marker
   (`Annotation.set` on `EntityMeta.annotations`) + pre/post heads. Whole write set validated
   against the target version first (§10.7 q5).
5. Keep source properties, recorded as **retired** in the migration marker. Writes to them from
   target-type code stay rejected (`validation.test.ts` V4c), which is correct: only old clients
   write them, and their replicated ops are not validated. **Done** (marker `retired`).
6. ~~Replace the space-level `MigrationVersionAnnotation` scalar~~ — **dropped:** object
   migrations already select per object by type (`Filter.type(fromType)`); the space-level
   `@dxos/migrations` registry is a separate app-wide mechanism (composer's entries are 2024 no-ops)
   and stays as is. The runner additionally skips any object whose live type is no longer `from`,
   because the type query reads the index, which can lag a migration just applied (found by the
   crash-resume test; without the guard a re-run migrated objects twice).
7. Migrations are kept indefinitely; retirement is a designed-in but unused path (§10.7 q3).

**B1 — first slice (no API change), DONE:** rewrite `EchoDatabase#runObjectMigration`
(`echo-client/src/proxy-db/database.ts`) to stop using `atomicReplaceObject`, which replaces the
whole entity struct and so clobbers any concurrent edit. Keep `Migration.define`'s async `transform`
contract. Per object, in **one automerge change** (`ObjectCore.change`, change `message` naming the
migration): validate the transform output against `toSchema`; write only data keys whose encoded
value differs (value-compare); leave keys absent from the output in place (retired); merge the meta
patch per key; `setType(toType)`; set a per-object marker annotation holding the migration's
`from`/`to` and the pre-migration heads (post-migration heads are the migration change itself,
found by its message, so no second write is needed). `onMigration` still runs after. Real
migrations that intentionally drop fields (`sdk/types` `TaskMigration` `parentTask`,
`compute` `Operation` `key`/`version`) keep them as retired properties — verify nothing strictly
decodes whole objects. Tests: a concurrent edit to an untouched property survives; the change count
is exactly one per object; re-running is a no-op; existing migration suites stay green.

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
5. **Measure the runner's cost** — **done (2026-09-27)**, `fold-forward.bench.test.ts` (`DX_BENCH=1`),
   4-core sandbox, 20 edits of history per object: an idle full pass costs ~0.6 ms per migrated
   object (50 → 35 ms, 200 → 113 ms), an update-scoped pass 11–18 ms, and each late write ~15 ms to
   fold. Linear, and small enough that no worker-side detector is needed.

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

## Package scope

| Package                                                                          | Phases       | Change                                                                                   |
| -------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `@dxos/echo`                                                                     | A1, B, C, E  | Receives `Lens`; `Migration` grows the `Write` vocabulary; conflict read API; lens paths |
| `@dxos/echo-client`                                                              | A3, A4, B, C | `runMigrations` minimal writes + `setType` + per-object state; `ObjectCore.foldAt`       |
| `@dxos/echo-host`                                                                | A2, C, D     | Merge-engine replay; fold-forward runner on the indexing stream                          |
| `@dxos/index-core`                                                               | C            | Only if the runner needs durable intents / a column                                      |
| `@dxos/echo-panproto`                                                            | A1           | Keeps engine, hooks, coded lenses; `Lens` module moves out                               |
| `@dxos/echo-client-e2e`                                                          | all          | Bench becomes acceptance tests                                                           |
| `sdk/schema`, `plugin-atproto`, `plugin-library`, `stories-lens`, `composer-app` | A1           | `Lens` import path                                                                       |
| `plugin-illustrator`, `plugin-client`, `compute`                                 | B            | `Migration.define` / `runMigrations` callers; check for whole-object-replace reliance    |
| `sdk/app-toolkit`, `plugin-space`, `composer-app`, `sdk/migrations`              | B            | Space-level version scalar → per-object queries (scalar deprecated, not removed)         |

## Working agreement

Implementation continues on the research branch (`claude/m0-migrations-research-zw15ml`, PR
#12439), starting with A1. Defaults taken 2026-09-27 (overridable): M1's runner stays client-side
(`runMigrations`), because migrations are plugin code the worker cannot load; fold-forward is split
— the worker indexing stream detects and records durable intents, the client executes them (this
refines §10.7 q6); A2 is implemented on this branch. **Refined again while building C2:** no separate
durable intent is needed at all — the migration marker plus the document history always say which
retired properties were written after the migration, so the client runner re-derives "behind"
objects from document state (at startup, after a run, on replicated updates) and checkpoints with
`foldedAt`. A worker-side detector is an optimisation to add only if C5's cost measurement calls for
it. C1 (`ObjectCore.foldAt`) and C4 (`Obj.getConflict`) are done.

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
