# Lens-Backed Migrations — Implementation Plan

_2026-09-25, starting point (committed 2026-09-27). Turns [M0-REPORT.md](./M0-REPORT.md) and the decisions in [DESIGN.md](./DESIGN.md) §10.7
into shippable phases. Supersedes the M1/M2 task lists in [TASKS.md](./TASKS.md) where they
disagree (those predate the research). Every phase ships on its own and leaves the system strictly
better than before._

## Direction (decided 2026-09-30): version documents

Supersedes in-place migration as the way to support peers on older versions. Everything below this
section describes the in-place work, which remains the source of the pieces carried over.

**Why.** In-place migration keeps both shapes in one document. Old peers lose the object (the type
switches) and never see new-shape edits; every broadening of what a migration can express surfaced a
new conflict case (three converge rounds, one thrash), because old and new shapes share containers.
Keeping each version in its own document removes the shared containers, and with them most of the
machinery: retired properties, the type switch, the kept-key rule, the two fold channels, the
checkpoint rules and replaying a losing concurrent migration. It is one body of work with the rest of
the migrations effort, not a separate project.

**Model.**

- One logical object (one id), one Automerge document per schema version. Each document holds one shape.
- Phase 1 (the plan): every version, everywhere. A device holds a document for every version in its
  lens chain, created up front for every object (including objects created after an upgrade, derived
  back through the chain so older peers see them), plus newer versions it received but cannot read.
  Creating versions only when some device reports needing them was considered and rejected for now: it
  needs a space-level record of which versions are in use, with its own failure modes.
- Future, not planned: devices drop versions older than the one they use; EDGE keeps every version and
  translates between any pair, indefinitely. Nothing in the translation rules depends on which documents
  a device holds, so this changes storage policy, not the rules.

**Translation rules** (prototype: `echo-client/src/proxy-db/version-documents/`, item 12 below).

1. A version document's root is derived from the object's origin root through the lens chain, authored
   with a content-derived actor and time 0, so every device creates the same root. A device then edits
   under its own actor.
2. Only original edits are translated, never translations, each directly from the document it was made
   in through the composed lens chain. Cost per edit: one translation per other version held.
3. A translation forks at the target's images of the edit's ancestors (waiting until they exist; an
   ancestor that moves nothing in the target is transparent) and is authored with an actor derived from
   its ops (`sharedChangeAt`), so every device that translates an edit writes the same bytes.
4. A device translates only with the lens build the space designates for a version pair.

Every device that holds two versions translates between them. Redundant work, identical bytes, so no
election or server is needed for correctness in phase 1.

**Lenses are code and data, like types.** They start as code; data lenses (objects in the graph, as
schema objects are) follow, which lets a lens be designated, identified by content hash, and run by a peer
that does not have the app's code. Declarative lenses are the ones data can express.

**Migration steps, each shipped only once its cases converge under test.**

1. Declarative lenses: rename, add with a default, remove with a backward default. All reversible;
   every translation is a field-level edit. Old and new peers both keep working.
2. Lists, maps and text inside those lenses: element-wise list mapping and text through renames, using
   the rebasing in `fold-edit.ts`.
3. Opaque one-way transforms (concatenation, splitting a field): forward only; older peers keep the
   object read-only.
4. Multi-object migrations (fan-out, fan-in, array split) on convergence keys.

**Step 1 status (2026-09-30): implemented on this branch.**

| Piece                                                                                                                                                                              | Where                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Declarative lenses (`rename`, `add`, `remove`), keyed by their definition                                                                                                          | `@dxos/echo` `VersionLens.ts`                                         |
| Reserved `@v<version>` branch entries, hidden from `listBranches`, with the version's type URI                                                                                     | `echo-protocol` `document-structure.ts`, `entity-manager.ts`          |
| Roots derived from the object's creation in its origin document; translation of data (through the lenses), meta and deletion; designation by the lens digest recorded in each root | `echo-client` `version-documents/version-translation.ts`              |
| `db.syncVersions` / `db.watchVersions`: create missing versions, merge duplicate documents into the registry's winner, translate; `links` names the oldest version                 | `version-documents/version-runner.ts`, `database.ts`                  |
| Routing: an object reads at the newest version whose type the client's lenses know; the update listener moves with it; index hits from its other versions are dropped quietly      | `entity-manager.ts`, `echo-client.ts`                                 |
| Host resolution: `QueryOptions.versions` adds a `ResolveVersionsStep` after every selection (SQL and in memory) and blocks limit pushdown past it                                  | `echo-host` `query-planner.ts`, `sql/compile.ts`, `query-executor.ts` |

Tests: `version-translation.test.ts` (12, pure), `version-documents.test.ts` (6, one database), e2e
`version-documents.test.ts` (concurrent creation while partitioned; an old peer and a new peer editing one
object), planner test for the step. Red-checked: designation, the wait for missing ancestor images, the
loser merge, the listener move, and host resolution on both executor paths.

Queries and references (item 1, 2026-09-30): a query's result type is part of the query. A selection
returns rows of the version it names; one naming several versions of a type returns each object once, at
the newest of them; one naming no version returns the newest the client knows. The host resolves this once
over the query's own matches, before ordering and limits. The client returns a row of a version the object
does not read as a version binding (one per object and version, typed at that version, edits translated),
also returned by `db.version(obj, Type)`. A reference resolves to the version its schema declares, and a
query traversing it returns that version.

Branches (item 2, 2026-09-30): a branch of a versioned object carries every version. `BranchRecord.versions`
holds each member's version documents beside `members`, which keeps naming the version released apps
read. `createBranch` forks every version at matching points (`imageHeads` maps a past frontier across
versions); the runner derives versions a branch lacks, from the object's origin, so a branch opened before
an upgrade gains them with main's roots; translation runs within each branch; switching reads the
branch's newest known version; merge and sync pair each version with main's. Released hosts replicate
only `members`, so a branch's other versions reach peers on hosts that know `versions`.

Replication heads (item 3, 2026-10-01): `getDocumentHeads` and `reIndexHeads` cover every document the
branch registry references, so waiting for replicated heads covers version and branch documents.

Derivation cost (item 4, 2026-10-01): translation keeps its graphs and images current, walks ancestry only
to the nearest translated ancestors, authors a chain of translations on one probe mirror re-encoded under
each derived actor, and applies them together, with byte-identical output (`version-translation.bench.test.ts`
fixture). Deriving 1000 edits takes 2s (from 76s), 2000 take 7s; the remaining cost is one historical read
of the source per edit, which the public Automerge API makes proportional to history length.

Lens chains start at the version current when lenses are introduced for a type (item 6, 2026-10-01), so
released apps never migrate the version `links` names in place; a type with lenses gets no new in-place
migrations.

Known versions travel with each query as `QueryOptions.versions` (item 7, 2026-10-01; DESIGN.md §12.5
decision 2 revised): exact for the requesting client and free of the registry push's timing, so version
resolution does not depend on #13284.

One lens (decided 2026-10-01, DESIGN.md §12.7), built on this branch in order:

- **A.** Record the decisions.
- **B. Merge.** `Lens` gains schema defaults with `add`/`remove`, endpoint names, a digest of the resolved
  mapping and the subset check; `VersionLens` folds into it, with one `findPath`; the version runner takes a
  `Lens`.
- **C. Entity kind.** `EntityKind.Lens`, `db.addLens`, a registry index by endpoints; the static
  `Lens.register` goes; plain targets carry an identifier.
- **D. Host runner.** Translation moves into the host's indexing pass with an intent log; the host reads
  lenses from the space; a client stores the lenses it registers; the conflict rule applies;
  `syncVersions`/`watchVersions` go and routing takes its versions from the registry.

Not yet done:

- Deferred (2026-10-01) pending evaluation: plugin contributions of lenses (the app stays unwired until a
  plugin registers one). Lenses are meant to replace in-place migrations once steps 2–4 cover what
  migrations express (lists/maps/text, opaque one-way transforms, multi-object); until then the in-place
  runner stays.
- Later: code-only lenses in the client, traversals through lenses in the query DSL, typename renames.

**Carried over from the in-place work:** per-edit translation and list/text rebasing (`fold-edit.ts`),
byte-identical authoring (`ObjectCore.sharedChangeAt`), originals-only folding and ancestor-image forks,
convergence keys and the convergence-key merger, `Lens` (compose, invert, path finding), and the lessons
in the converge ledgers below.

**Open questions.**

- The space directory maps an object id to one document, and apps released before version documents
  only follow that entry. It must keep pointing at the version those apps read; newer versions hang off
  a field they ignore.
- Deterministic document ids for version documents (import with a chosen id in automerge-repo).
- Indexing and queries: `Filter.type` already matches a version document by its type; `Filter.id` and
  references must resolve to the version the reader understands, with several documents per id.
- Where the designated lens build is recorded, and how a peer learns lenses for versions it does not know.
- Fate of the in-place runner: kept for step 3 (opaque one-way transforms), or retired.

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

Converge (review-and-fix loop, 2026-09-29, stopped at round 3 on thrash): fixed ref encoding in folds, fan-in
discovery with `to` and marker ownership, fold ordering across reloads, serialized migration/fold passes,
checkpoints at the heads a pass read, folding only keys a late write changed, and removed the unreleased legacy
marker shapes. Open design decisions: (1) inline text across peers — two peers replaying the same late splices
duplicate them, and a baseline mismatch falls back to a whole-value fold that drops concurrent direct edits;
(2) refold scope for `define` migrations — the extra "before" recompute runs `ctx.ensure`/`ctx.assign` against
stale data, direct edits count as moved keys, a write landing during the migration's own await is never folded,
and fan-in/array folds do not narrow to moved keys; (3) fan-in ownership — two fan-ins from the same type with
different parents can fold each other's children. Also: spaces joined mid-session are migrated and watched on
the next activation; the array fan-out ref-dedup e2e test is flaky under load (idempotence check, not root-caused).

## Constraining the known limits (decided 2026-09-29)

Make the API unable to express the cases that thrashed in converge, instead of patching each one:

1. **Field-only folds.** Every fold is a whole-value field write; char-wise text replay is removed from
   fold-forward and the convergence-key merger. Documented: do not migrate rich-text fields — keep them in a
   `Ref<Text>` object, which no migration duplicates.
2. **`define` split.** `transform` is synchronous and pure over the object's own data (no `db`, no context);
   cross-object work (`ensure`, `assign`, queries) moves to `onMigration`, which fold never re-runs. Fold
   recomputes `before` from the current snapshot with only the retired keys at their checkpoint values.
3. **Fan-in.** `defineFanIn` requires a stable `id`, recorded in the marker; fold claims a child only by that id.
   `absorb(child)` is pure over the child; fold writes only keys whose absorb output moved.
4. **Array fan-out.** `toProperty` is a `Record<elementId, Ref<Child>>`; the split writes each child's `order`;
   ref dedup is removed; fold visits only elements that moved.
5. **Discovery and markers.** Fold-forward finds objects by their markers, not by type; each migration step
   gets its own annotation key, so two peers' concurrent first migrations cannot race on a shared container.
6. **Read heads.** Fan-in and array fan-out author their change at the heads they read; object migrations no
   longer await between reading and writing.
7. **Spaces.** plugin-client migrates and watches each space once it is ready, including spaces joined later.

Follow-up (2026-09-29), superseding item 1:

8. **One fold channel per target key.** A map, list or text target is only ever written per change and
   never replaced: each late change is folded as the edits it made to the transform's output (map keys,
   list inserts and deletes rebased onto the target's elements, text splices), as its own change forked
   at the winning migration change plus the folds of its late ancestors, under an actor derived from the
   fold's ops (`ObjectCore.sharedChangeAt`, `fold-edit.ts`). A source value set outright still folds as
   edits, except that a string target copying a source string that was set outright is set outright.
   Scalar targets and meta are folded per pass from the merged current data, forked over every per-change
   fold. A transform that rejects the state before a change diffs from the target at the fork instead;
   one that rejects the state after a change leaves it to a later change. The transform is recomputed on
   the step's source properties only. A step checkpoints only past a late write. Rounds 2 and 3 of the
   converge loop found that letting both channels write one key loses writes whenever a whole put
   replaces the container a per-change fold edits; `RESEARCH-ARRAY-FOLDS.md` reaches the same design
   from Cambria, panproto, Automerge and edit-lens prior art. Fan-in and array fan-out folds remain
   whole-value per key.
9. **Kept keys keep their value.** The runner rejects a transform that changes the value of a property it
   keeps under the same name: an old client keeps writing it in its old meaning, where fold-forward cannot
   tell the two apart. A changed meaning takes a new name.

10. **Concurrent migrations of one object.** Objects a migration creates (`ensure`, array fan-out
    children, fan-in parents) carry convergence keys and converge through the convergence-key merger
    (`migration-concurrent.test.ts`, `migration-fan-out.test.ts`). Target lists, maps and text inside the
    migrated object are values, not objects: peers that migrate from the same heads author one shared
    change (`ObjectCore.sharedChangeAt`), and peers that migrate from different heads each create their
    own. For those, `migration-merge.ts` replays each user edit made inside a losing migration's container
    onto the visible one per change, as the merger replays a losing duplicate's edits. Each step keeps
    folding late writes into its own containers, which is correct whichever wins.
11. **Open: keeping old peers working (not built).** A migrated object already holds both shapes; old
    peers break because the type switch drops it from their version-exact type lists, and new-shape edits
    never reach the old fields. Proposed: (a) keep `system.type` at the old version while old peers may
    exist, with new clients reading the latest recorded step as the effective type (query and index
    changes in new code only); (b) fold new-shape edits back into the old fields through a reverse
    mapping (a lens's `put`, or an optional `backward` on `define`), with folds never counted as writes to
    fold back; (c) finalize (switch the type, stop backward folds, drop the old fields) once every known
    device reports it understands the new version, with an app-release cutoff for devices that never
    return. Migrations with no reverse mapping switch the type at once, as today.

12. **Version documents (prototype; see "Direction" at the top).** Keep every version (partial replication later trims it
    per device): one logical object, one Automerge document per schema version. A device keeps the latest
    version it understands plus newer ones it cannot read yet, and translates edits between the version
    documents it holds. Rules, all deterministic so any number of devices can translate without
    coordination: (1) a version document's root is derived from the object's origin root through the
    lens chain with a content-derived actor, and each device then edits under its own actor; (2) only
    original edits are translated, never translations, each directly through the composed lens chain,
    so unused intermediate versions need no document and cost per edit is one translation per other
    version in use; (3) a translation forks at the target's images of the edit's ancestors and is
    authored with an actor derived from its ops; (4) a device translates only with the lens build the
    space designates. `echo-client/src/proxy-db/version-documents/` (plain Automerge, no ECHO integration)
    passes three versions edited concurrently on three devices, v2 dropped everywhere, six versions with
    only v1 and v6 in use, concurrent text edits across versions, and an undesignated lens build; breaking
    rule 1 or 3 fails every case and breaking rule 2 never settles. Open: translator liveness (EDGE or
    election), lens identity and designation in the space, deterministic ECHO document ids, and query and
    reference resolution by version.

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
