# MOSAIC — Model-Oriented System for Adaptive Interface Composition — Tasks

_Resume: PR #12484 OPEN, retitled to match its contents, merged with main (2026-08-20) and CodeRabbit's 20 threads answered — the valid findings are folded in (schematic ids qualified by container, ASCII box widths aligned, `ResetFeedCursor` misnaming corrected, `surface` position-ordering documented, Scenes parser hardening + closed tag set). Ontology + DEUS app dialect + PLUGIN.mdl rewrite + UI-schematic phase 1 delivered. Next decision: schematic phase 2 (app-graph → deck schematics) vs Scenes Experiment 2._

Full context in `DESIGN.md` (an index — the design lives in the specs it links).
Branch `claude/declarative-ui-abstraction-h28b9j`.

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

## Parked / later

- [ ] TaskSetArticle scale-down extraction (Experiment 1 follow-up; superseded unless machines revive it).
- [ ] H3 render-count profiling in the running app (from Experiment 1 exit criteria).
- [ ] zag-adoption vs atom-native machines decision (Experiment 2 §5 tabs probe decides).
