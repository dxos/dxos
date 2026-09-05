# plugin-illustrator — Tasks

_Resume (2026-09-05): project renamed `illustrator-scene-dsl`; this file moved here from
`plugin-tldraw/TASKS.md`. Phase 5 is in progress on branch `illustrator-selection-diagrams`
(see below). Layout design: `DESIGN.md` beside this file. Phases 1–4 below are history; Phase 4's
React Flow substrate remains designed-not-implemented and is NOT on the Phase 5 path._

## Phase 5: eval substrate, selection, diagram corpus (2026-09-05)

Goal set with Rich (offline): finish the implementation steps, then produce six diagrams of the
DXOS/EDGE architecture that double as the eval corpus. Archify (`tt-a1i/archify`) was reviewed and
rejected as a layout engine — it has none (fixed cell math; the LLM places nodes) — its one
transferable idea, validate-and-repair, is what `Diagnostics` implements.

Decisions (reversible, taken to avoid blocking): `WorldObject.ref` is a DXN **or** URI; selection
is at world-object granularity, controlled + uncontrolled, scene ids only; the **host**
(`DrawingArticle`) writes `react-ui-attention` Selection ViewState so every renderer behaves the
same; the corpus lives in `docs/diagrams/*.mmd` and IS the deliverable (one copy, no drift);
hard diagnostics gate CI, soft ones are golden-filed; Tier-3 (LLM generation eval, evalite) gets
its scorer interface now and fixtures later.

- [x] **`Diagnostics.analyze`** (`src/model/diagnostics.ts`) — pure analysis of an emitted scene,
      independent of dialect and placement: `node-overlap`, `route-through-node`, `label-overflow`
      (errors) and `edge-crossing`, `excessive-bends` (warnings) + `Metrics`. Works on hand-authored
      scenes and on scenes read back from a renderer.
- [x] **Tier 1 harness** — `diagnostics.test.ts` runs every placement strategy over `CLASS_DIAGRAM`;
      hard codes asserted empty, soft metrics snapshotted (17/17). Two analyzer false positives found
      and fixed by the first run: group/subgraph frames are containers, not obstacles (a box
      enclosing another object's box); and a label's last line carries no trailing leading
      (`(lines−1)·lineH + lineH/1.35`).
- [x] **`WorldObject.ref`** — optional DXN/URI on the scene object.
- [x] **Selection contract** — `DrawingVariantSurfaceProps.selection` / `onSelectionChange` /
      `onActivate`; `SceneSvg` implements it (click / shift-toggle / background-clear /
      double-click; `data-object`, `data-selected`, accent highlight); `SvgArticle` passes through.
- [x] **Host wiring** — `DrawingArticle` reads/writes Selection ViewState keyed by `attendableId`;
      `onActivate` resolves an ECHO `ref` via `db.makeRef(uri).load()` (guarded by `Obj.isObject`)
      and opens it via `LayoutOperation.Open`. URI refs carry no default activation yet.
- [x] **tldraw variant** — page-state `selectedShapeIds` ↔ scene object ids (`shape.meta.object`),
      set-compared so the echo of our own report is a no-op; double-click → `onActivate`.
- [x] **excalidraw variant** — `appState.selectedElementIds` ↔ `customData.object`; selection only
      (double-click enters text editing there).
- [x] **Mermaid flowchart onto the engine seam** — `mermaid-engine.ts`: ELK compound layout
      (subgraphs as hierarchical nodes), uniform grid cells, frames recomputed from snapped members,
      shared A* router (frames are containers, not obstacles). `RoutedRelation.relation` widened to
      `Layout.LayoutEdge`. Lesson from the corpus: ELK spacing is per compound node, not inherited —
      unset, a group packs at 20px and every route through it is fenced (→ `route-through-node`).
- [x] **`%% ref <Id> <target>`** directive in the flowchart parser → `WorldObject.ref` (portable: a
      comment to mermaid proper).
- [x] **Tier 2 scoreboard** — `scripts/render-diagrams.tsx -- --scoreboard` (vite-node; bun cannot
      load elkjs): corpus × {layered, elk} → errors / crossings / bends / area.
- [x] **Diagram corpus** (`docs/diagrams/`) — six sources written from read-only Explore surveys with
      per-node refs (echo, assistant, compute, pipeline, app-framework, edge), rendered to `.svg`;
      `corpus.test.ts` gates hard defects, snapshots soft metrics, and checks every ref resolves
      (repo path or URL). The corpus found two engine defects the UML fixtures never would: ELK
      per-group spacing (above) and the router's fixed 50k-iteration A* budget — replaced by an
      admissible turn-aware heuristic (`turnsNeeded × TURN_COST`) plus an area-scaled budget, which
      left every UML snapshot unchanged.
- [x] **Selection verified in Storybook** (`SceneSvg › Selection`, driven by clicks): click →
      `[Dialect]` with `data-selected`; shift-click adds `Scene`; shift-click again toggles it off;
      double-click selects + activates; background click clears.
- [x] **Lattice placement + straightened ports** (Rich's review of the EDGE render: needless jogs,
      nodes not aligned) — node origins quantize to `lattice × cell` (1.5) with a frame-clearance
      floor when groups exist; ports straighten inside the cross-axis overlap. Corpus bends:
      pipeline 19→9, app-framework 35→25, assistant 29→20, compute 32→22, echo 28→25, edge 37→30;
      crossings rose on assistant (7→17) and edge (9→22) — snapshots record it.
- [ ] **Crossings after quantization** — run ELK `INTERACTIVE` (crossing minimization seeded from the
      quantized positions) as a second pass, or quantize before the crossing sweep.
- [x] **Layout bench story** (`components/Layout.stories.tsx`) — three columns: editable mermaid
      source · mermaid.js reference render · engine layout with the Tier-1 report; one story per
      corpus diagram, `lattice` as a range control. `mermaid` added as a devDependency (catalog).
- [ ] **`edges` object is selectable** — clicking a connector selects the dialect's `edges`
      object. Fine for hand-drawn line-only objects, odd for dialect output; options: dialects mark
      the object non-selectable, or `SceneSvg` skips objects with no closed shapes. Decide with
      Rich.
- [ ] **Corpus review with Rich** — the six diagrams are faithful to what the surveys verified but
      dense (13–18 connectors); expect edits to scope, and the metric snapshots to follow.
- [x] **Tier 3** — `assistant-evals/src/evals/diagram.eval.ts`: the agent diagrams a described
      six-component system into an SVG-variant drawing; scorers are all deterministic — no hard
      defects (the Tier-1 report over the stored scene), every component present, every `%% ref`
      grounded to the URL it was given, connector count. Live-only (needs `DX_ANTHROPIC_API_KEY`),
      not yet run. To make the loop real, `DrawingOperation.Generate` now compiles flowcharts with
      `MermaidEngine` and returns `diagnostics`; the UML skill tells the agent to fix errors and
      regenerate, and documents flowcharts + `%% ref`.
- [ ] **Contact sheet** of the six SVGs as one reviewable artifact.
- [ ] **DESIGN.md** — add Diagnostics + selection sections; drop future-work #4 once done.

## Phase 1: Scene DSL (agent draws/edits diagrams)

Backend-neutral scene DSL (world objects → elements in local units) compiled to
tldraw records with identity in record `meta`, driven by the agent through
read/edit operations and the `org.dxos.skill.sketch` skill. Design:
`agents/superpowers/specs/2026-07-23-sketch-scene-dsl-design.md`; as-built:
`PLUGIN.mdl` (F-8, T-7/T-8).

### Tasks

- [x] **Design doc + prior-art survey** — PIC/Pikchr, SVG, D2 (+ D2 Oracle edit API), Mermaid, Kroki, Excalidraw skeleton; three-layer architecture (scene IR → dialects → backends).
- [x] **Promote SketchBuilder to `src/model/`** — extended with meta stamping, index seeding, `path()` (polyline/spline), external boxes, `records()`; call sites updated, `#testing` export removed.
- [x] **Scene model** — `scene.ts` (Effect Schema), `render.ts` (→ tldraw, deterministic `shape:<object>/<element>` ids), `read.ts` (derived origins from bboxes), `apply.ts` (upsert/remove/move commands, binding cleanup), `dialect.ts` (registry; `scene` only).
- [x] **Operations** — `SketchOperation.Read` / `Edit` + handlers (`Database.Service`, atomic `Obj.update`); create kept.
- [x] **Skill** — `org.dxos.skill.sketch` (tools + DSL instructions: local units, semantic ids, read-before-edit); wired via `addSkillDefinitionModule`.
- [x] **Tests** — 15 green: scene round-trip, tldraw schema validation, binding cleanup, unmanaged shapes, operations integration (create → edit → read via real Database layer).
- [x] **Live-AI storybook** — stories-assistant `Sketch` group (`Reflection` first, then `Default`, `DrawAndUpdateTest`); layout chat | canvas | trace; hardened `submitPrompt` (retries until the message lands in the thread). Live-verified 2026-07-23 (remote EDGE, claude-opus-4-8): hat composed on untouched face.
- [x] **PLUGIN.mdl updated post-implementation** — record of the as-built system (convention change also captured in the composer-plugins skill).

## Phase 2 (future)

- [x] **Open PR** — #12324 (changeset `sketch-scene-dsl.md`, minor bump for @dxos/plugin-sketch).
- [x] **Excalidraw backend** — excalidraw builder (elements + customData identity, label companions, positional arrows with remembered refs) in plugin-excalidraw.
- [ ] **Dialects** — `mermaid` / `d2` / `sequence` / `uml-class` compilers → scene commands (auto-layout owned per dialect).
- [ ] **`rename-object` command** (D2 Oracle Rename: rewrite record ids + meta + bindings) and object re-`scale`.
- [ ] **tldraw group shapes** for world objects (native drag-as-unit); object/element rotation.

### References

- Design: `agents/superpowers/specs/2026-07-23-sketch-scene-dsl-design.md` (incl. project log: start 04:48 UTC, live-verified 05:47–05:51 UTC).
- Storybook: `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx` (serve: `pnpm exec storybook dev --port 9019` from stories-assistant).

## Phase 3: plugin-illustrator base extraction (2026-07-28)

Game/Chess-style split: headless host plugin + renderer variant plugins.

- [x] **plugin-illustrator (new)** — base `Sketch` type (`org.dxos.type.sketch`, `{name?, canvas: Ref<Obj.Unknown>}`), `SketchRef`/`loadSketch`/`resolveVariant`, scene DSL + dialect registry moved in, sketch skill + create/read/edit operations (renderer-agnostic via `Capability.Service`), `IllustratorCapabilities.VariantProvider`, SketchArticle/SketchCard dispatch containers, CreateSketchPanel variant picker.
- [x] **plugin-sketch → plugin-tldraw rename** — package/dir/plugin key (`org.dxos.plugin.tldraw`), `TldrawBuilder`, `Tldraw.Canvas` keeps `org.dxos.type.canvas` (so no data migration is needed for canvases), contributes VariantProvider (builder + TldrawArticle/TldrawCard), useStoreAdapter takes the canvas directly.
- [x] **plugin-excalidraw onto the base** — dropped its root `Excalidraw` type + create operation; keeps `org.dxos.type.excalidraw.canvas`; new scene-DSL builder (style maps, render/read/apply); contributes VariantProvider (article only).
- [x] **Consumers updated** — composer-app (Illustrator/Tldraw/Excalidraw plugins registered, assets → `/assets/plugin-tldraw`), plugin-debug, plugin-markdown/plugin-stack stories, plugin-onboarding exemplar, stories-assistant Sketch story, storybook-react static dirs, tsconfig/paths/changeset config.
- [x] **Tests** — identical create→edit→read round-trip runs against BOTH builders (tldraw + excalidraw) via `AssistantTestLayer` + `extraServices` capability layer; 15 tldraw tests green, 2 excalidraw green.
- [x] **Open PR** — #12380 (changeset `illustrator-base-plugin.md`); CI green through `aaf24e4` bar the final in-flight run.
- [x] **First publish** — `@dxos/plugin-illustrator` + `@dxos/plugin-tldraw` published at 0.10.0 (2026-07-28, burdon) with npm trusted publishing configured; both packages public, plugin-debug depends on them normally, `check-packages-published` green.
- [x] **Land #12380** — MERGED 2026-07-29 as `3502b3d5` (squash). It carried the whole branch, so the
      `react-ui-diagram` spike landed with it; the two later grid fixes did not and are still on the branch.

## Phase 4 (next): technical-drawing dialect

Mermaid/UML-flavoured text dialect **extended with placement metadata**, compiled through the
illustrator dialect pipeline. Requirements from the 2026-07-28 brainstorm: hierarchical with
infinite zoom; nodes tied to source (e.g. code) for generation; groups contain classes and
collapse; automatic layout + line routing with smart slots on nodes; preserve straight lines;
scenarios (arc visibility varies per scenario / selected node, toggleable); embedded text.
Reference sketch: `packages/plugins/plugin-illustrator/docs/drawing.drawio.svg`.

- [x] **DECIDED (2026-07-29): source of truth is the DSL.** None of (a)/(b)/(c) as framed — the
      diagram is a _projection_ used to edit an underlying spec, and the spec stays authoritative.
      Design: `agents/superpowers/specs/2026-07-29-diagram-substrate-design.md`.
- [ ] **Dialect + placement schema**, layout/routing engine (slots, straight-line preservation),
      scenario model, collapse/zoom behaviour.
- [ ] **Illustrator PLUGIN.mdl deepening** — document capability contract once the dialect work firms it up.

### Phase 4 design: constrained diagram substrate (2026-07-29)

Superseded the "technical-drawing dialect on the whiteboard" framing above. Full design in
`agents/superpowers/specs/2026-07-29-diagram-substrate-design.md`; decisions taken:

- [x] **DSL is truth; the diagram is a projection.** Render-only state the DSL cannot express
      (pinned positions, free text blocks, labels for read-only sources) lives in a separate
      **overlay** — the only ECHO-persisted tier, because it is the only one needing CRDT sync.
      `CanvasBoard` already validates the split (`computeGraph` truth + `layout` overlay).
- [x] **Substrate: React Flow (`@xyflow/react`, MIT), not a whiteboard.** It is a _controlled_
      component — our model is authoritative and the canvas is its projection, which is the
      DSL-is-truth property one level down. tldraw/excalidraw invert it, so "constrained" could
      only be reached by removal. Already proven twice in-repo (`GraphCanvas`, `react-ui-board/Chain`).
- [x] **Licensing checked.** `@tldraw/*` 3.0.0 is **not open source** — ships `LicenseManager.js` +
      `watermarks.js`, requires a paid agreement for production use. Not retired here; the intent is
      to move `plugin-tldraw` out of the monorepo into a third-party non-production repo later.
      React Flow is MIT but xyflow asks that `hideAttribution` (already set in `GraphCanvas.tsx`)
      only be used with a Pro subscription. Both need a real review, not an engineering call.
- [x] **Neutral representation: extend `@dxos/graph`, not a new package.** Add `Node.parent` and
      `Edge.sourcePort`/`targetPort`. Justified by existing duplication: ports were already invented
      twice incompatibly (`ComputeEdge` required `input`/`output`; `Connection` optional), and
      hierarchy twice (`plugin-explorer`'s `TreeNodeType.children`, `react-ui-graph`'s cluster
      projector). Both fields optional → all 12 consumers unaffected; published pkg, so additive
      minor + changeset. A group is a node whose kind admits children, not a third entity.
- [x] **Write-back is not an architectural fork.** Because canonical text forbids comments and free
      formatting, `print(parse(text)) === text` holds — an AST plus a printer suffices, no CST or
      trivia tracking. Fidelity becomes a per-dialect property (`mode: 'readonly' | 'round-trip'`).
- [x] **Ontology lives in the schema.** `Type.makeRelation({source, target})` embeds
      `relationSource`/`relationTarget` as DXNs in the JSON Schema, so one declaration drives the
      toolbar, connection legality, ELK constraints and the AI tool schema. Only cardinality /
      acyclicity needs a predicate.
- [ ] **Packages:** `react-ui-canvas` stays (substrate-independent viewport); new
      `react-ui-diagram` (named for the artifact, not the substrate); `react-ui-canvas-editor`
      deleted once conductor migrates; `react-ui-canvas-compute`'s 25 shapes port to node kinds.
- [ ] **Open:** union endpoints for `makeRelation`; progressive-zoom LOD semantics; React Flow is
      DOM-based so >1–2k nodes needs virtualisation; fate of the existing `Scene.Command` DSL.

### Post-review fixes (2026-07-28, user testing)

- [x] **dependsOn auto-enable** — plugin-tldraw/plugin-excalidraw declare `dependsOn: ['org.dxos.plugin.illustrator']`; the plugin manager enables the closure.
- [x] **LiveObject crash on create** — `useObject` returns snapshots; dispatch containers now pass `ref.target` (live) since store adapters need `Doc.createAccessor`.
- [x] **Lost strokes (pre-existing)** — tldraw's `'event'` stream fires before the tool commits its shape, so pointer_up-driven saves flushed one gesture behind; plus the attention-triggered adapter reopen recreated the store under a still-mounted editor. Fixed: debounced auto-save in the store listener, editor keyed by store instance, flush-on-unmount. Verified live: cold load → draw → reload → stroke persists.

### Phase 3.1: Drawing rename + shared canvas (2026-07-29)

- [x] **`Sketch` → `Drawing`** — `org.dxos.type.sketch` → `org.dxos.type.drawing`; `SketchBuilder` → `DrawingBuilder`, `SketchVariant` → `DrawingVariant`, `SketchOperation` → `DrawingOperation`, containers/panel/skill renamed to match.
- [x] **`schema` + `content` pushed into the base type** — illustrator owns `Drawing.Canvas` (`org.dxos.type.canvas`, hidden); tldraw's and excalidraw's canvas types are deleted, and `DrawingVariant.canvasType`/`createCanvas` are now optional for renderers that need no extra fields (neither does today).
- [x] **Variant resolution keys on `Canvas.schema`** — forced by the collapse: with one shared canvas type, typename no longer discriminates. `makeCanvas` takes a REQUIRED `schema` so a canvas can never be built unresolvable (this caught 8 call sites that would have silently rendered "Unsupported drawing variant").
- [x] **Common content-map logic factored out** — `illustrator/model/content.ts` owns the upsert/remove/move command loop, companion-record accounting and index seeding; renderers supply a `ContentHandler` (`identify`/`render`/`read`/`translate` + optional `scaffold`/`merge`/`prune`). Both `apply.ts` files deleted (~130 duplicated lines each). tldraw's page scaffold + dangling-binding sweep and excalidraw's version bumps survive as handler hooks.
- [x] **`DrawingBuilder` implemented by both** — `makeBuilder({schema, handler})` supplies the ECHO write path; `TldrawBuilder` (record builder renamed `RecordBuilder`) and `ExcalidrawBuilder`. Both variant round-trip tests still pass unchanged, which is the evidence the extraction is behaviour-preserving.
- [x] **Migration for `org.dxos.type.sketch` → `org.dxos.type.drawing`** — written and tested; see Phase 3.2. (This item previously claimed the ECHO migration framework was dormant. It is not — that was wrong.)
- [ ] **PLUGIN.mdl files** still describe the Sketch-era shape.

### Phase 3.2: mermaid dialect + migration (2026-07-29)

- [x] **`sketch` → `drawing` migration** — CORRECTION: the migration framework is NOT dormant. `Migration.define` is live and wired through `ClientCapabilities.Migration` (precedent: plugin-assistant). `LegacySketch.Sketch` (`org.dxos.type.sketch`) migrates to `Drawing`; the canvas keeps its typename so only the wrapper converts. Runs via `db.runMigrations` per space, idempotent.
- [x] **Migration test** — `capabilities/migrations.test.ts` drives the real migration over an `EchoTestBuilder` database: id preserved (the runtime swaps the type in place, it does not create-and-delete), canvas ref and `schema` intact so the variant still resolves, unnamed sketches carried, all sketches in a space converted, and re-running is a no-op while later arrivals still migrate. Mutation-checked: dropping `name` from the transform fails 3 of the 5.
- [x] **Migration works unregistered (verified, not assumed)** — the plugin registers only `Drawing`, never `LegacySketch.Sketch`, so the worry was that the sweep would silently no-op in production. Proven otherwise: a test reopens the space on a second client whose registry has only the current types and the migration still converts. `runMigrations` queries by typename URI and `atomicReplaceObject` writes at the core level, so neither needs the source schema registered. (A first attempt to show this failed in test _setup_ — `db.add` does need the schema — which proved nothing about the sweep.)
- [ ] **Migration gaps (not addressed)** — the sweep reads `client.spaces.get()` when the migration atom fires, so a space opened later may not be swept until it re-emits; and `runMigrations` is fire-and-forget, so failures are logged but never surfaced or retried.
- [ ] **Onboarding exemplar still seeds `org.dxos.type.sketch`** — `plugin-onboarding/src/content/exemplar-space.dx.json` carries 2 legacy sketch refs and no `org.dxos.type.drawing` (pre-existing on this branch, not a merge regression). It works only because the migration converts them on first open; the fixture should be regenerated to seed drawings directly.

- [x] **CollectionModel.add audit** — no plugin needed changes. `Journal` and `Subscription` are VISIBLE (their hidden siblings are `JournalEntry`/`PostContent`); `Segment` and `Variant` are hidden but persisted with `db.add`, never `AddObject`; sandbox has no `AddObject` sites. Chess/TicTacToe state go through plugin-game and are now correctly persisted-but-unfiled.
- [x] **Mermaid dialect** — `illustrator/model/mermaid.ts`: parses flowchart direction, node shapes, subgraphs and edges; ranks by longest path with DFS back-edge detection so `C --> Y --> C` doesn't chase the loop; emits one world object per node, a dashed frame per subgraph, and an `edges` object of bound arrows. `DrawingOperation.Generate` applies it through the variant builder.
- [x] **Tests/storybooks** — generic mermaid unit tests in plugin-illustrator (6, incl. the reference flowchart); mermaid storybooks in plugin-tldraw and plugin-excalidraw.
- [x] **Excalidraw label rendering** — root cause was `fontFamily: 1` (Virgil): excalidraw fetches that face lazily from `EXCALIDRAW_ASSET_PATH`, which the host app never sets, so the glyphs painted blank. Isolated in the browser (a version bump alone changed nothing; only the family did). Labels now use the system face, scale with the object, and are `containerId`-bound so they centre and travel with their shape instead of being draggable off it.
- [x] **Excalidraw native arrow bindings** — arrows carry real `startBinding`/`endBinding`, endpoints are clipped to the shape outline instead of its centre, and `rebind()` mirrors them onto each shape's `boundElements` (excalidraw discards one-sided bindings) while clearing bindings to deleted shapes. Verified live: dragging a box re-routes its arrows and carries its label. Tests in `model/bindings.test.ts`.
- [ ] **Serve excalidraw's own fonts** — set `EXCALIDRAW_ASSET_PATH` and serve `@excalidraw/excalidraw/dist/prod/fonts/**` so the handwriting faces resolve; until then all excalidraw text (user-typed included, not just generated labels) falls back to the system face.
- [ ] **Layout quality — probably WON'T FIX here.** The hand-rolled layered layout in `illustrator/model/mermaid.ts` does no crossing minimisation (visible as X→C crossing through A). ELK is already the decided answer, but as **phasing step 5 of the Phase 4 substrate**, not as a retrofit onto this path — and the spec lists the fate of the `Scene.Command` DSL as an open question, so investing in the old layout may be throwaway. Revisit only if the whiteboard path outlives Phase 4.

### Merge of origin/main c645322 (2026-07-29)

- [x] **Resolved `plugin-tldraw/vite.config.ts`** — main's #12394 added `model` + `skills` entries to the pre-rename `plugin-sketch`. The merge tool auto-carried both onto `plugin-tldraw`, but skills moved to illustrator in this refactor: there is no `src/skills` there and no `#skills` import, so the entry was dropped. `model` kept (real directory, exported as `#model`) — it was already present here, so the resolution is a no-op against this branch. plugin-illustrator already declares both, so main's intent is satisfied where skills actually live.
- [x] **`.agents/projects/registry.yml`** auto-merged — main's new `chat` project plus our `sketch-scene-dsl` entry both present, 13 projects, parses.
- [x] **CI green on the merge (`3e36345`)** — all of check/build/test/storybook/workerd; GitHub reports `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`.

### Phase 4 spike: react-ui-diagram (2026-07-29)

`packages/ui/react-ui-diagram` built and verified in storybook — proves the tier boundaries
before any migration. Spec section: "Spike (built 2026-07-29)".

- [x] **Package scaffolded** — private, `@xyflow/react` + effect; `.storybook/` config (the
      `ts-test-storybook` tag needs a per-package `main.mts` or `:test` fails at startup).
- [x] **Neutral model** — `Node`/`Edge`/`Graph` with `parent` + `sourcePort`/`targetPort`, plus
      `Port`/`Compartment`/`Overlay`/`Projection`. Lives in the package pending the `@dxos/graph`
      rewrite; field names are the ones that rewrite preserves.
- [x] **Hierarchy-aware layered layout** — cycle-safe ranking, groups sized to contents,
      parent-relative coordinates, overlay pins beating computed positions.
- [x] **React Flow renderer** — groups via `parentId` + `extent: 'parent'`, compartments and ports
      as plain DOM, snap to grid. Attribution left ON given the licensing note.
- [x] **Two stories** — `Default`: two columns, `react-ui-editor` mermaid source | live projection
      (verified live: typing `Y --> Z[New Node]` took it to 7 nodes / 8 links). `Neutral`: a
      hand-written `Projection` with compartments and 3 ports on one side, no DSL — the decoupling test.
- [x] **13 tests** green — projection goldens, back-edge ranking, group insetting, overlay pins,
      termination on fully-cyclic and self-parented graphs.
- [x] **Three bugs the design missed** — (1) a port needs BOTH a source and a target handle, since
      React Flow resolves an edge end by (id, type) and silently drops the edge otherwise; (2) edges
      must be lifted to the level being ranked, or a level whose edges all cross a group boundary
      collapses into one row; (3) `Diagram` collided with itself (model type vs component) → `Projection`.
- [ ] **Not done, by design** — write-back (`apply`), the ontology + derived toolbar, ELK routing,
      progressive-zoom LOD. Edges are beziers that cut through group interiors.
- [ ] **`@dxos/graph` rewrite** — step 1 of the spec phasing; move the neutral model there.

### Tracked follow-ups

- [x] **Hidden canvas showed as a second navtree item** — creating a sketch _inside a Collection_ listed the canvas beside it. Not variant-specific: `CollectionModel.add` pushed into `target.objects` unconditionally when the target was a collection, ignoring `HiddenAnnotation` (the non-collection branch calls `Database.add`, which is why creating at the space root looked fine). **Fixed systematically** in `@dxos/app-toolkit`: `CollectionModel.add` now persists a hidden object without filing it into any collection, so no plugin can leak an implementation-detail object into the navtree. Regression tests in `CollectionModel.test.ts`.
- [x] **Same latent bug in plugin-game** — `create-object.ts` routes the hidden `Chess.State` through `AddObject`; covered by the `CollectionModel.add` fix above, so plugin-game needs no change. Illustrator likewise keeps its plain `AddObject` call.
- [x] **Library button removed from Excalidraw** — no `UIOptions` toggle exists and `renderTopRightUI` only _adds_ to the top-right tunnel, so `.default-sidebar-trigger` is hidden via a scoped `theme.css` loaded after excalidraw's stylesheet. Verified in the plugin storybook (element present, `display: none`).
- [ ] **react-ui-debug LogPanel misses errors** (plugin-debug) — LogPanel doesn't catch errors like the Doc.createAccessor LiveObject throw; needs a context that keeps collecting logs even while the panel isn't visible. (tracked 2026-07-28)
