# MOSAIC — Model-Oriented System for Adaptive Interface Composition — Tasks

_Resume: PR #12846 OPEN (follow-on; #12840 MERGED 2026-08-29, superseded #12484). Phase 6 (typed modules) COMPLETE 2026-08-30 — module contract (state/operations/capabilities), ladder `let initial|machine|from`, `var`/`use`, no fall-through; CONTAINERS.md audit done. Phase 5 COMPLETE 2026-08-29 — state-driven layout system with URI-keyed registry, published state (`ui.<id>` via `id=`+`machine=`), operations-as-only-writer, 7 browser-verified ECHO-bound stories, and `packages/ui/ui-template/docs/DESIGN.md`. Next: Rich reviews DESIGN.md + stories; then the ranked open items in DESIGN.md (state addressing, operation payload typing, when=/parts/sizing, machines-vs-slots), or Phase 4 schematic phase 2._

Full context in `DESIGN.md` (an index — the design lives in the specs it links).
Branch `claude/mosaic-ui-worktree-41481d` (PR #12846; #12840 merged).

## Phase 1: Survey + Experiment 1 (controller extraction) — PARKED

- [x] **Survey** react-ui-form/card/list/mosaic, Surface system, effect-atom substrate; prior art.
- [x] **Spec** `agents/superpowers/specs/2026-08-04-declarative-ui-abstraction-design.md`.
- [x] **Experiment 1**: MailboxController extraction — implemented, 4 headless tests green, findings recorded.
- [x] **Parked**; code removed from branch after main's atom migration (history: `49de0924`/`a5e7982a`).

## Phase 2: Scenes direction

- [x] **Spec** `agents/superpowers/specs/2026-08-06-scenes-app-ontology-design.md` — composition DSL,
      zag machines, MDL grounding, Experiment 2 (walking skeleton) proposal.
- [ ] **Experiment 2: walking skeleton** (`plugin-scene`: model + XML codec + interpreter +
      dogfood scene + one tabs machine) — awaiting go.
- [ ] **Parameterized Views** (`scope=` binding) — largest new capability; design before skeleton hardens.

## Phase 3: Ontology + DEUS descriptive track

- [x] **Ontology outline** `agents/superpowers/specs/2026-08-13-hyperspace-app-ontology.md`
      (Hyperspace/Space/Schema/Feeds; Deck/Plugins/Components).
- [x] **App dialect** `packages/reflect/deus/lang/app.mdl` (`org.dxos.spec.app`:
      node/deck/plank/companion/surface/menu).
- [x] **PLUGIN.mdl rewrite** (plugin-inbox) — high-level, against current main, using the app dialect.
- [ ] **Dialect registry**: register `org.dxos.spec.app` URIs wherever deus URI resolution
      materializes (linter open question) so `app.mdl` terms don't lint as unknown.
- [x] **Automated review pass** (CodeRabbit) folded back: spec accuracy (H3/H4 claims scoped,
      dispatch contract, numbering/fences), `PLUGIN.mdl` dangling refs, `app.mdl` surface
      resolution + example planks.
- [ ] **Review pass** from Rich on the three documents; fold corrections back.

## Phase 4: UI schematics (drawings from the app model)

- [x] **`Ui` dialect** in plugin-illustrator (`src/model/ui.ts`): drawing model
      (Deck/Plank/Panel/Form/Group/Array/Control), `fromSchema` (recursive walk: nested
      objects, arrays; input/switch/checkbox/select), `compile` → scene commands,
      `renderAscii`; 6 headless tests.
- [x] **Storybook** `plugin-tldraw/…/UiSchematic.stories.tsx` — ASCII + tldraw side by side.
- [ ] **Phase 2**: schematic from the app-graph subset (deck/planks/companions for a plugin) —
      feed from `PLUGIN.mdl`/app dialect declarations.
- [ ] Controls fidelity (formats, refs as pickers), View-driven forms (projection order).

## Phase 5: ui-template overnight spike (2026-08-28)

Decisions (7 + 2, resolved 1x1 with Rich): keep `ui-template`; unified URI-keyed registry
(components/schemas/machines/operations, e.g. `schema="org.dxos.type.Contact"`); MVU — complete
published state determines layout, edits tentative until an operation commits (`save`/`cancel`),
operations are the only writer; spike-local operation registry; undo = log only (semantics in
DESIGN.md); ECHO live in the stories; machines tonight = named state slots + operations
(transition-table formalism design-only); addressing = `id=` ⇒ published state at `state.ui.<id>`,
schema-described; anonymous ⇒ private. Documented goals: on-the-fly layout generation, chainable
undo, async updates, async dynamic component loading, entirely state-driven layout.

- [x] **Registry** — URI-keyed components/schemas/operations/machine-state-schemas.
- [x] **System state + dispatch** — one state tree (data/ui/drafts), pure render, operations loop,
      operation log; ECHO feeds state via a subscription effect (async updates stay MVU).
- [x] **Rung 1: list** — ECHO query → Listbox; `schema=` from registry.
- [x] **Rung 2: form** — schema-driven Form over a draft buffer; `save`/`cancel` operations.
- [x] **Rung 3: master-detail** — 1+2 composed; selection published at `state.ui.<id>.selection`.
- [x] **Rung 4: + toolbar** — button dispatches operation by URI with current object context;
      operation log visible. Single storybook, single DefaultStory, per-story schema/layout/context.
- [x] **ECHO scenarios** — combobox filtering the database; master-detail with Add → draft object →
      db on save; 2-3 extensions (candidates: filter toolbar driving the query; same context under
      two swapped layouts; layout dispatch by object type).
- [x] **DESIGN.md** (`ui-template/docs`) — schema, data structure, layout, component libraries,
      machines (incl. two-tier private/published state + addressing), style variants, surfaces,
      operations, composite app state, layouts↔app-state updates, undo chains; composition via the
      plugin mechanism: an app as a dynamic collection of plugins contributing
      components/machines/layouts/operations to the app-graph.
- [x] **Fold findings** into ONTOLOGY.md rules (R-4 published-state update); checkpoint.
- [x] **Fix combobox** — popover now spans the trigger width and matches `Select` chrome (1px
      separator border, overlay surface). Root cause: `Popover.Content` drops an incoming
      `className`, so the earlier `composableProps` width fix never reached the DOM; the classes
      now pass through `classNames`.

## Phase 6: typed modules (overnight 2026-08-30)

Spec = DESIGN.md "Typed binding and modules" (module contract triad + ladder + landing order).

- [x] **Implement the recommended landing order** — landed in 6 commits (d214a781bf…b0eb267072):
      fall-through deleted (undeclared name = parse error), rung-1 `let initial=`, `var`
      signatures mount-checked, `use module= as=` + module contract triad with write ownership
      (foreign `scope.set` throws); stories rewritten (deriveContext deleted, master-detail =
      shared `contacts.selection` capability); 61 tests, build/lint green, browser-verified.
- [x] **Mutual-module test** — `filter` ⇄ `contacts` (reads both ways, cross-module writes only
      via `invoke` of the owner's operation, violations throw, cycles detected).
- [x] **Container audit** — `ui-template/docs/CONTAINERS.md` (8e03224995): 10 units audited
      (7 plugin-tasks, 3 plugin-projects); top gaps = ref/query async bindings, command channel,
      surface node, i18n labels, interaction triggers; OutlineCard/CreateProjectPanel/
      QuickEntryDialog expressible today, TaskSetArticle closest module candidate.
- [x] **Idiom catalog** — 19 idioms cited by file; top machine candidates = selection,
      view-switch, draft-edit-commit, filter, race-guarded async commit; 6-step progressive
      factoring order recorded.

## Phase 7: optimistic operations (design)

- [ ] **Invoker eager dispatch** — investigate running already-loaded, local-only operation
      handlers synchronously in the dispatch tick (fall back to async path otherwise); fixes the
      re-render jump for every sync ECHO mutation app-wide. Changes the invoker concurrency
      contract (`packages/core/compute/operation/src/invoker.test.ts` platform-contract note) —
      needs its own risk pass.
- [x] **Optimistic overlay atom** — landed 2026-08-29: `Optimistic.make(source)` in
      `@dxos/app-framework` (13 headless tests incl. retain grace) + `useOptimisticOperation`
      seam + `TaskSetArticle.handleMove` pilot sharing `TaskSet.reorderItems` with the handler.
- [ ] **Held objects (secondary)** — the same overlay in `retain` mode: a mutation that would drop
      a row out of a filtered view (mark done in "active tasks") pins the row as `leaving` for a
      grace window with an Undo affordance (ties into app-framework UndoRegistry); undo dispatches
      the inverse operation, expiry releases the row.

## Parked / later

- [ ] TaskSetArticle scale-down extraction (Experiment 1 follow-up; superseded unless machines revive it).
- [ ] H3 render-count profiling in the running app (from Experiment 1 exit criteria).
- [ ] zag-adoption vs atom-native machines decision (Experiment 2 §5 tabs probe decides).
