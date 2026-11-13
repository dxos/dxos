# plugin-canvas — Tasks

_Resume: PR #14501 (draft, `claude/plugin-canvas-composite-objects-cb1372`) carries phase 7 — composite objects with constrained parts, DSL templates, in-place editing, the ortho link variant, and the Card and UML class tools converted to composites. CI has not been chased. Next: the deviations listed in phase 7, the first being a part that hugs its content. Uncommitted: none._

## Phase 0: audit + design

Decide rewrite vs adopt (xyflow) for an infinite, multi-depth canvas, and pin the data model and coordinate system before any engine code is written.

### Tasks

- [x] **Audit existing board/canvas surfaces** → `packages/ui/react-ui-canvas/docs/AUDIT.md`
  - react-ui-canvas, react-ui-canvas-editor, react-ui-canvas-compute, react-ui-board (Board + Chain), react-ui-diagram, react-ui-graph, react-ui-gameboard, react-ui-dashboard, react-ui-geo, plugin-board/excalidraw/graph/conductor.
- [x] **External research** (`packages/ui/react-ui-canvas/docs/RESEARCH.md`) — infinitecanvas.tools, Muse boards-in-boards, tldraw hybrid rendering, xyflow sub-flows, JSON Canvas, semantic zoom, d3 usefulness.
- [x] **Design spec** → `packages/ui/react-ui-canvas/docs/DESIGN.md` (pointer in `agents/superpowers/specs/2026-09-20-infinite-canvas-design.md`) — awaiting user review.
- [x] **Throwaway spike story** demonstrating zoom between depths (`src/experimental/`, verified: fit, pinch zoom, tiers, auto + double-click drill-in, Escape drill-out, select, drag-move); deleted once the engine's `Nested` story covered it.

## Phase 0b (PR 0): extract `@dxos/diagram`

Move the headless illustrator model to `packages/common/diagram` so `react-ui-canvas` (a UI package) can use the
scene DSL, `applyCommands`, dialects and layout engines. Design: `packages/ui/react-ui-canvas/docs/DESIGN.md` §3b.

### Tasks

- [x] **Create `packages/common/diagram` (`@dxos/diagram`, private)** — package.json, moon.yml (`ts-vite-build`, `ts-test`), tsconfig, vite.config; deps `effect`, `@dxos/invariant`, `@dxos/util` only.
- [x] **Move `plugin-illustrator/src/model/*` except `builder.ts`** (scene, content, dialect, layout, mermaid*, uml*, ui, ortho-router, objective, diagnostics, svg-handler, testing, `__snapshots__`, all tests) with `git mv`; keep namespace exports (`Scene`, `Layout`, `Mermaid`, `Uml`, `UmlGrid`, …) as the package barrel. `corpus.test.ts` stays in the plugin (it reads the plugin's `docs/diagrams`); `SvgBuilder` moves into the plugin's `builder.ts` (it needs ECHO); fixtures ship as `@dxos/diagram/testing`.
- [x] **`builder.ts` stays in the plugin** and imports from `@dxos/diagram`; `plugin-illustrator/src/model/index.ts` exports only `builder` (no compat re-exports of moved modules).
- [x] **Update import sites** (`@dxos/plugin-illustrator/model` → `@dxos/diagram`): plugin-tldraw, plugin-excalidraw, assistant-evals (the only external importers on main), plus intra-plugin `#model` users (types, components, containers, capabilities, operations, `scripts/render-diagrams.tsx`). `pnpm add --filter <pkg> "@dxos/diagram@workspace:*"` per consumer.
- [x] **DSL gaps (additive)**: arrow endpoint ports (`from`/`to` accept `object/element#port`; `Scene.parseRef` / `formatRef` / `resolveRef`, and tldraw/excalidraw/SceneSvg bind through `resolveRef` so the port is dropped), `portal` element `{kind, id, x, y, w, h, ref, text?}` (SceneSvg draws a dashed frame; tldraw/excalidraw ignore it), optional fractional `index` on `WorldObject` (svg-handler carries it per record and reads objects in index order); tests in `scene.test.ts` and `svg-handler.test.ts`.
- [x] **Verify**: `moon run diagram:build diagram:test plugin-illustrator:build plugin-tldraw:build plugin-excalidraw:build`, `pnpm knip` for the new package, `pnpm format`, lint.
- [x] **Changeset** for `@dxos/plugin-illustrator` (model moved) and the new package; open PR titled `diagram: extract the scene DSL and layout engines from plugin-illustrator`.

## Phase 2: mobile navigation mode (requirement added 2026-09-20)

Design: DESIGN.md §6b, decision 14, open questions 6–7. Same scene, same projections and intents; the 2D camera is replaced by a paged strip of vertical columns, one per aspect.

- [ ] `aspects.ts`: overview / cells:<kind> / links / cell:<id> / scene:<path> projections with a stable reading order; unit tests.
- [ ] `useColumnsMode`: breakpoint + `(pointer: coarse) and (hover: none)` + explicit `mode` prop; 2D ↔ columns state mapping (camera ↔ first visible cell) with tests.
- [ ] `ColumnStrip` / `Column` / `CellRow` / `AspectTabs`; swipe, tabs, tap-to-push, back/pop, breadcrumb; long-press menu; drag-reorder → `move` intent.
- [ ] Thin editing in columns: create (rect, text, scene), delete, rename, reorder.
- [ ] Stories: `Columns` at phone width; mode-toggle story on the same scene.
- [ ] Resolve open questions 6 (what an aspect is) and 7 (mode switch trigger) with the user before building.

## Phase 1: first PR (in progress on the PR 0 branch, stacked)

Engine lives in `packages/ui/react-ui-canvas/src/` (`model`, `utils`, `hooks`, `components`), exported as `@dxos/react-ui-canvas/scene`. Stories: `ui/react-ui-canvas/SceneView`.

- [x] Types (`types.ts`), fractional order (`order.ts`), camera + portal math (`camera.ts`), derived bounds + hit testing (`hit.ts`), ports + automatic pairing (`ports.ts`), curve routes (`route.ts`), atom store (`store.ts`), projection seam + freehand reducer (`projection.ts`); unit tests for each.
- [x] Surface: per-view atoms, cell registry, `SceneLayer` (links, nested live portals with tiers), `ControlFrame` (outline, 8 handles, ports, marquee, rubber band), `Palette`, `Breadcrumbs`, `SceneView` (wheel/pinch/pan, select/marquee, move + resize via intents, port-drag linking incl. drop-on-canvas create, R/T/S create tools, Delete, arrows nudge, cmd+A, Shift+1/2/0, Alt+←/→ history, double-click / auto / Escape / breadcrumb drill).
- [x] Stories: `Freehand` (depth 1), `Nested` (depth 4).
- [x] Constrained projection (`projections/constrained.ts`: cardinal constraints + aligned rows → `Layout.rank` per axis with id tie-breaks; move/create rewrite the moved node's constraints against the nearest cell; delete drops them) + `Constrained` story with a live constraint list; smoke-tested.
- [x] Dynamic projection (`projections/dynamic.ts`: graph → `Layout.rank` rows, id-ordered columns, links; overlay of position overrides that win, survive unrelated graph edits and are pruned with their node; link adds an edge, delete removes a node with its edges) + `Dynamic` story with node toggles, edge and override lists; smoke-tested.
- [x] Grid toggle (`snap` view atom, Grid button + `G`): grid shown and moves/resizes/creates snapped only while on.
- [x] Properties panel (`Properties`): schema-driven `Form` over the selected node or link's own schema, edits as `update` intents; `useSceneProjection` shares the projection between the view and its panels; all four stories carry it on the right.
- [x] Major grid: snapping, nudges, created nodes, the fixture, the projection defaults and the derived scene bounds align to `MAJOR_GRID` (64 px); ports show on hover under every tool; camera fitted before the first paint.
- [x] Typed nodes and links (decision 9): `Scene {nodes, links}`; node types rect / ellipse / class (UML) / text / scene with a centre plus per-type properties and optional per-node ports; link types line / curve / spline (control points: drag, double-click to add, alt-click to remove); `shapes.ts` pure geometry; `NodeDef` / `LinkDef` registries generate the palette (R E C T S / L K P); links are selectable and deletable.
- [x] Link editing: end handles re-attach either end (drop lands on the nearest port, previewed as created while hovering), control points selectable with Delete and a right-click menu, splines perpendicular at the ports, ports fill on hover.
- [x] Undo / redo: per-view snapshot log over the projection seam (`undo.ts`), ⌘Z / ⇧⌘Z and toolbar buttons.
- [x] Cut / copy / paste: per-view clipboard, fresh ids, links rewired, one `batch` intent; ⌘X / ⌘C / ⌘V, toolbar buttons, right-click menu (element: Cut / Copy / Delete; canvas: Paste).
- [x] Portal frame: a portal gives its child a frame of its own aspect (centred content); drilled-in scenes show and fit that frame; `liveDepth` prop and story control for how many nested levels render live; drill-in clears the selection and hover before the zoom.
- [x] `SceneBuilder`: chainable scene DSL after illustrator's builders; the fixture's child scenes are distinct simple diagrams (flow, class model, cycle, note).
- [x] `docs/MIGRATION.md`: feature map of react-ui-canvas-editor and react-ui-canvas-compute against the engine, five design decisions, migration plan M1–M5.
- [x] `packages/ui/react-ui-canvas/SPEC.mdl`: the engine's machine-readable spec, since the functionality lives here rather than in `plugin-canvas` (which is a thin variant host). Sections after `plugin-conductor/PLUGIN.mdl`: types (`Scene`, `Node` / `NodeBase` and the built-in union, `Link`, `Endpoint`, `Port`, `Camera`), components (`SceneView`, `SceneLayer`, `ControlFrame`, `Palette`, `Toolbar`, `Properties`, `Breadcrumbs`, `Grid`), the projection seam and its intents as the operation surface, features (drill-in, grid and snapping, keys, read-only, undo, clipboard), `rule` blocks the agentic review can enforce (intents only — the view never writes coordinates; no `React.*` namespace imports; every key chord in `model/keys.ts`), acceptance, and a `QA` suite over the storybook rather than the app.
- [ ] Camera as an imperative transform from the atom (decision 7); today pan/zoom re-render through React like the spike.
- [x] Text parts + in-place editing (`parts.ts`, `PartEditor.tsx`): rect/ellipse label, text body, class name / attributes / methods are `TextPart`s; double-click opens a `react-ui-editor` over the part, Enter (Mod-Enter in multi-line parts) commits an `update`, Escape rejects, blur commits.
- [ ] Multi-part nodes beyond text: parts with their own bounds and ports (e.g. a shape with several text areas laid out by the model).
- [x] Geometry controls in the properties panel: `center` and `size` as two-column number rows with their own cell labels (X / Y, W / H) rather than collapsible nested fieldsets. A canvas-specific `GeometryField` rather than `TupleField`, since the cells answer to the grid: an arrow steps a minor cell and Shift a major one (the arrow-nudge units), a step saves at once like a toggle, and a committed value snaps while snapping is on.
- [x] Node style: `style { hue, rounded, fill, border }` on every node; hue picker + toggles in the properties panel; frame classes from `style.ts`.
- [x] Ports: `portsPerSide` per type (default 3, ellipse 1), drawn at the major grid line nearest each offset, never at a corner; ids `<side><index>`.
- [x] Portal frame on the grid: a whole multiple of the portal box, grid-placed near the child's centre; the drilled-in frame is drawn dashed orange.
- [x] Grid always shown (minor / major / coarse, by on-screen size); the toggle is Snap only. The canvas ignores the pointer while the camera moves (wheel, animation).
- [x] Class properties: attributes / methods edit as one entry per line (`fieldMap` renderer); a portal being drilled into renders plain (no tint / title).
- [x] Package layout: the pre-engine canvas moved to `src/archive` (root export unchanged); the engine lives at `src/{model,utils,hooks,components/<Name>}` (one folder per component, stories beside it) behind the `src/scene.ts` barrel; `GridComponent` now lives in the engine and the archive's `Grid` wraps it.
- [x] Delete `src/experimental/` once the stories cover the spike.
- [x] Headless smoke test of the stories (Playwright): Freehand select + snapped move; Nested double-click drill-in, Escape drill-out, link-tool port drag creates a link.

## Phase 3: `@dxos/plugin-canvas` (started 2026-09-20)

Package `packages/plugins/plugin-canvas` (private), registered in Composer's plugin list (labs, off by default).

- [x] Illustrator drawing variant `dxos.org/scene/1`: `Drawing.Canvas.content` holds one record per scene, node and link (`model/content.ts`); `bindCanvasStore` syncs it with the engine's `SceneStore` both ways inside `Obj.update`; `CanvasArticle` renders `SceneView`.
- [x] DSL bridge (`model/handler.ts`): illustrator objects compile to root-scene nodes and links with their identity stamped on the records (boxes, circles, text, portals as titled boxes, arrows between refs); polylines, curves, arcs and free arrows are dropped; `read` derives the objects back, hand-drawn nodes count as unmanaged.
- [ ] Nested drawings: a DSL `portal` should become a `scene` node whose child scene is the referenced drawing (cross-object store).
- [ ] Article chrome: attention / read-only in sections and slides, selection and `onActivate` wiring (`DrawingVariantSurfaceProps`).
- [ ] End-to-end test through the illustrator operations (as `plugin-tldraw/src/variant.test.ts`).

## Phase 4: migration M1–M5 (`docs/MIGRATION.md` §4; started 2026-09-20 after #13249 landed)

- [x] M1: `NodeBase` with `size`, open `Node` + built-in guards, `NodeDef.schema` / `create` / `defaultSize` / `group`, `createSceneSchema`; `Port.accepts` in pairing and drops; `Link.directed` arrowheads; palette groups; tests.
- [x] M2: editor parity: `{point}` endpoints and `ends` markers, `guide` / `className` style, hover border and selected-on-top, ghost create preview and pdnd palette drops, `resize.ts` (symmetric, `maxSize`, tests), alt-subtract marquee, `debug` atom (D), optional `Toolbar` + story, Home, Playwright `e2e` over the Freehand story (PR #13254).
- [x] M3: canvas-compute on the engine: `scene/defs.ts` (every `ShapeDef` as a `NodeDef`, anchors → ports), `createComputeProjection` over the shared `graph/sync.ts`, runtime ports, `Bullets` overlay, `sceneFromCircuit`, `scene.test.ts`, twelve `scene` stories; engine hooks `Port.snap`, `data-link-id`, `overlay`, `projection` (PR #13254).
- [x] M4: persistence and the plugin switch (`createEchoStore(board)` over `CanvasBoard.layout` with its three translations, the `layout` intent over `@dxos/diagram`'s ranking, `plugin-conductor`'s `CanvasArticle` on `SceneView`, Composer's `optimizeDeps` regenerated).

### References

- Muse: https://museapp.com · infinitecanvas.tools · tldraw · @xyflow/react

## Phase 5: post-M4 fixes (started 2026-09-22, PR #13254)

Reported from Composer and the storybook after M4 landed, then measured in Chromium
(`src/playwright/create.spec.ts`) rather than reasoned about — the first two attempts at the sizing
were wrong in ways only a measurement showed.

- [x] `plugin-canvas` parity with tldraw / excalidraw: `dependsOn: ['org.dxos.plugin.illustrator']`, a
      `Settings` schema (`showToolbar`, `showPalette`, `liveDepth`) behind `CanvasCapabilities.Settings`
      and `AppCapabilities.Settings`, read by `CanvasArticle`.
- [x] `withRegistry` moved to `@dxos/react-ui/testing` beside `withTheme` / `withLayout`; the four
      hand-rolled copies in the canvas stories replaced (they built a bare `Registry.make()` rather than
      `AtomEx.makeRegistry`, so they ran without the idle TTL ECHO atoms need).
- [x] `createClassSceneTree`: a three-level class diagram fixture (five scenes, invented domain) beside
      the element-type tree the projection / undo / clipboard tests assert against by id.
- [x] Create sizing by the camera zoom, not the portal factor. The factor grows with the child's own
      bounds, so scaling by it fed back — a larger node enlarged the next one. A create with no drawn box
      (palette drop, toolbar menu) divides the type's default by the zoom and so covers the same screen
      area at any zoom and depth: measured 261 / 247 / 257px wide at 45 / 64 / 100%.
- [x] A box drawn on the canvas is exactly what the pointer swept — no minimum, no default fallback — and
      a gesture that snapped to nothing creates nothing.
- [x] Snapping follows the grid that is drawn. The unit was fixed in scene units while `Grid` keeps a
      level only while its cells are legible, so they parted company with the zoom: in a nested scene the
      lines were coarser than the snap and it landed on nothing visible.
- [x] Grid drawn only while snapping is on; the toolbar's zoom readout divided by the portal product, so
      entering a portal no longer drops it fourfold without anything visibly changing.
- [x] `NodeStyle.fontSize` in the node's own units, overriding the view's size class (the views drop the
      Tailwind class when it is set, which would otherwise win over the inherited value).
- [x] Link from and to a node body: with a link tool the body is a source like a port, and a drop binds to
      the body unless the pointer is within reach of a port. Ports are drawn for the hovered node alone.
- [x] Picking a shape or link tool clears the selection.
- [x] `smart` link type: a stub leaves each port along its side's normal by half a major cell and one
      segment joins them, rounded by `splinePath`. Nothing is stored, so the route follows the nodes.
- [ ] Smart routing proper: avoid crossing the nodes it connects and other nodes in the way (phase 2,
      over `@dxos/diagram`'s `ortho-router`).
- [ ] A click on a spline's span midpoint adds a control point without any movement. The handle is there
      to be dragged; decide whether a bare click should commit one or whether it needs a threshold.
- [ ] The default extent is a floor under every scene's bounds, including a child behind a portal, so a
      small child now maps through a 1600×1024 frame and draws smaller in its tile. Decide whether the
      floor belongs only to the scene being edited.
- [ ] A new class still arrives as `Class` with one attribute and one method, and a new text node as
      `Text`, while a rectangle and an ellipse now arrive with no label at all. Decide whether those two
      should be blank too — an empty text node is invisible, which is why they were left.

## Phase 6: compute scene stories (started 2026-09-23, PR #13254)

The `ui/react-ui-canvas-compute/scene` stories, walked one at a time. Each fix is measured in
Chromium against the story itself (`react-ui-canvas-compute:e2e`, a harness the package did not have
before), not reasoned about from the source.

- [x] `scene--transform`: a shape component fills its node. `computeNodeView` rendered the component
      straight into the engine's node frame, which is not a flex container — the editor's frame body
      (`styles.frameContainer`) was, and every component was written against it, so `grow` was inert
      and the content sat at the top. Wrapped in `dx-cover flex`.
- [x] `scene--transform`: a click on an interactive control runs its operation. The node frame takes a
      pointer press as select-and-drag and captures the pointer, so the `click` never arrived; the four
      shapes with a control (`RNG`, `Switch`, `Audio`, `GptRealtime`) now stop the gesture.
- [x] `scene--transform`: the beacon lights. The transform emits what JSONPath returns, a list of
      matches (`[0.68]` above the threshold, `[]` below), and the beacon declared a `Boolean` input, so
      every value arrived as a type error and the lamp was dark whatever the roll. Its input is now
      `Any`, read through `isTruthy`, which already treats an empty list as false: 6 of 14 rolls lit.
      The same fault is in the old editor, so it was never a scene regression.
- [x] The graph never runs at mount. `AUTO_TRIGGER_NODES` names `constant` and its comment promises
      execution on startup, but `exec()` was only ever reached from `setOutput()`, so a circuit was inert
      until something wrote a forced output (the dice, a switch, an edited constant). The controller
      extends `Resource` and never overrode `_open`; it now runs the graph once there, for both call
      sites that open it.
- [x] Every circuit is laid out around the origin. The layouts had drifted — transform by two cells,
      control by three and a half, template by fifteen — so a scene opened off to one side of its own
      content. `circuits.test.ts` holds each one's centre extent to half a cell (a cell for the GPT
      circuit, which is assembled from optional blocks over a shared core).
- [x] The run control works, and is only drawn where it can. `Box` drew it on every shape but left the
      handling to each component: three (`Feed`, `Surface`, `Text`) called `evalNode`, the rest passed
      no handler at all, so the button was dead on `json-transform` and everything built on
      `FunctionBody`. `Box` now runs the shape's own node through `controller.exec`, which propagates
      downstream as a run should, and draws the button only for a shape that has a compute node — the
      note in the Transform circuit has none. Covered in e2e by counting the bullets a run fires.
- [x] The circuit no longer opens in a corner. `DEFAULT_EXTENT` ran from the origin to (1600, 1024)
      rather than being centred on it, so the floor it puts under every scene's bounds had its own
      centre well below and right of content laid out around (0, 0): the initial fit, which centres the
      frame, pushed every story a sixth to a third of the viewport up and left. Measured across the ten
      scene stories, the offset fell from -0.15..-0.35 of the viewport to under 0.02, and the share of
      the viewport the content covers roughly doubled. Held by an e2e test.
- [ ] Match the old editor where it is better (the user is specifying which): the remaining framing
      question is the floor itself (below); the dashed scene
      frame draws where the editor shows none; the editor's one grouped horizontal toolbar against the
      corner toolbar plus the vertical palette rail; ports drawn at rest against hover-only.
- [x] `scene--logic`: the switches drive the gates. Verified end to end in Chromium — two switches
      through the AND and the OR light the beacon — which is what confirms the `Switch` half of the
      gesture fix above; the e2e harness carries it as a third test.
- [ ] Implement `text-to-image` against HeyGen. It is a stub today — `VoidOutput` and an `exec` that
      throws `Not implemented` — so the `plugins` and `image-gen` circuits wire an edge to a `result`
      output that does not exist, and the graph says so in a banner. A real implementation settles the
      output schema the edge needs. The same fault is in the old editor; `chat` likewise has no
      `exec`, which is the console's missing-compute-function error.
- [x] `scene--plugins`: the Text node renders as an empty box — no header, icon or run control — where
      the editor draws it normally; its rendered text content is the empty string. Two vocabularies
      claimed one key: `computeNodeRegistry` spread the compute defs and then wrote `text` again for
      the engine's free-text node, because `sceneFromCircuit` rewrote a circuit note as `type: 'text'`.
      The engine's def won, so every compute Text output was drawn by `TextNodeView`, which reads a
      `text` field the compute shape does not carry. The engine's node is renamed `note` — what the
      canvas-editor model already calls it — leaving `text` to the host.
- [x] The remaining `scene` stories (beacon, control, template, gpt, plugins, artifact, image-gen,
      audio, voice), same treatment. All nine walked in Chromium at 1400x900: every node carries the
      `dx-cover flex` wrapper, every compute shape its chrome, and no story raises a page error.
      The only console error left is the known `chat` stub (no compute function for that node type),
      in the six circuits that wire one; `audio` and `voice` are clean of even that. Measured as
      nodes, centre offset and coverage as fractions of the viewport, and fitted zoom: beacon 4,
      (0.000, 0.000), 0.18x0.17, 78%; control 9, (0.009, -0.014), 0.52x0.47, 78%; template 12,
      (0.011, 0.000), 0.41x0.86, 50%; gpt 6, (0.000, 0.007), 0.82x0.71, 78%; plugins 8, (0.000,
      0.007), 0.82x0.71, 78%; artifact 5, (0.034, -0.066), 0.64x0.66, 74%; image-gen 5, (0.000,
      0.007), 0.82x0.71, 78%; audio 2, (0.009, 0.000), 0.20x0.11, 78%; voice 1, (0.000, 0.000),
      0.14x0.22, 78%. Every story is centred to within 0.034 of the viewport, so the origin-centred
      extent holds across the set. The floor is what six of the nine fit to: they land on exactly 78%
      whatever they contain, because their content is smaller than `DEFAULT_EXTENT` and the fit
      frames the floor rather than the circuit. Only `template` (taller than the floor) and
      `artifact` fit to their own bounds. That is the open framing question below, not a separate
      fault.

## Phase 7: composite objects with constrained parts (started 2026-11-11)

Branch `claude/plugin-canvas-composite-objects-cb1372`, fast-forwarded onto `claude/studio-diagrams-canvas-500640`
(`fece1e4986e`). A tool today draws one shape whose regions are painted by its React view (`CardNodeView`,
`ClassNodeView`); the `Composite` story draws the same card as an Object of primitives whose parts are separately
editable. This phase makes the second form the one tools use, and gives a part a say in how it follows its frame.

### Decisions (agreed with the user, 2026-11-11)

| #   | Decision                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Part layout is per-axis constraints**, as Figma's: `constrain?: { x, y }` over `min \| max \| stretch \| center \| scale`, on `nodeBase` and `linkBase`. `scale` is the default and is today's uniform behaviour. |
| D2  | **A tool declares its composite in the DSL, not in code.** `NodeDefSpec.template` is DSL source; one shared definition per tool per document, instances holding their own content as `overrides`.                   |
| D2b | The DSL gains a top-level **`composite <id> { element … }`** statement, which reads back as a `kind: 'composite'` layout plus the model object that places it.                                                      |
| D2c | A part's constraint is one attribute carrying the pair: **`constrain=stretch,max`**; a single value applies to both axes.                                                                                           |
| D3  | **Text edits are local, style and part geometry are shared.** Typing into a part writes the instance's `overrides`; style or a part's own geometry writes the definition, so every instance changes.                |
| D4  | **Double-click edits a composite in place** — the rest of the scene fades, Escape leaves — matching what `Scene3DEditor` already does in 3D. Isolation stays reachable from the Objects panel.                      |
| D5  | **Make object keeps the content's own bounds**: the instance's frame is the selection's bounds with a 1:1 transform, so handles sit on the shape's edges and no group box is drawn.                                 |
| D6  | **The link `type` is presented as a Variant selector** — straight, orthogonal, elbow, curve, spline — with one new `ortho` type. Nothing stored changes meaning.                                                    |
| D7  | `smart` is labelled **elbow** (it leaves each port along its normal and joins with one corner).                                                                                                                     |
| D8  | `orthogonal` routes with **midpoint bends and no obstacle avoidance**: straight when the ports align, else one or two bends at the midpoint. Deterministic, so an unrelated shape moving never re-routes it.        |
| D9  | **plugin-uml keeps `ClassNode`'s typed schema** and gains a DSL template; `ClassNodeView.tsx` goes away.                                                                                                            |
| D10 | One branch, **one PR**, seven commits.                                                                                                                                                                              |

### Tasks

- [x] **`@dxos/scene`: part constraints.** `PartConstraint` / `PartLayout` schemas, `constrain` on `nodeBase` and
      `linkBase`, and the solver that maps a definition's bounds into an instance's frame per axis. Unit tests over
      each constraint and over a link's free point ends.
- [x] **`@dxos/diagram`: the `composite` statement.** Grammar, reader, printer, linter and completion for
      `composite <id> … { element … }` and the `constrain` attribute; round-trip tests.
- [x] **`react-ui-canvas`: templates and re-solve.** `NodeDefSpec.template` (DSL source) compiled once per document;
      an instance's resize re-solves its parts by their constraints instead of scaling uniformly.
- [x] **`react-ui-canvas`: in-place composite editing** (D4), with 2D/3D parity against `Scene3DEditor`.
- [x] **`react-ui-canvas`: Make object framing and shared style edits** (D3, D5).
- [x] **`react-ui-canvas`: the `ortho` variant and the Variant selector** (D6, D7, D8).
- [x] **`plugin-uml`: the class as a composite template** (D9).
- [x] **Verify**: full repo build green; scene 86, diagram 297, react-ui-canvas 541, react-ui-canvas-editor 179 and
      plugin-uml 9 tests pass; `pnpm format` and lint clean across the five packages. The Composite story was read
      back from the DOM on a storybook served from this worktree on port 9010: at 288x192 and 384x288 the glyph is
      30x30 at (10,10) in both, the footer 15px tall and 10px from the bottom in both, and the body grows 84px to
      163px — the constraints, measured rather than eyeballed. The Variant selector shows for a link alone.
- [x] **`react-ui-canvas`: the `card` tool as a composite template** (D10, D11, D12). The built-in Card no longer
      paints a view: it declares `CARD_TEMPLATE` and places an Instance of it, with each region bound to the card's
      own field. `bind` reaches any field, not only text, so the glyph is the card's typed `icon`. Optional parts
      (`optional`) are switched off per Instance from the Properties panel (`PartsField` writes `overrides`), the
      part naming a hidden one in `grow` takes its room, and a part that `follows` another goes with it (the
      hairline with the footer). `cardPrototype`/`CardFrame` stay, for a kind that paints a view of its own
      (studio's feed card).
- [x] **The composite round trip for a typed tool.** `nodeElement` keyed on `type === 'instance'`, so a `card`
      node's composite was not written as the element's `parts` and the Views tree showed a leaf. It now keys on
      `isInstanceNode` and keeps the node's own type; `canvasNode` reads an Object back by whether it names a
      composite, not by what it is called.
- [x] **Visually verified: the UML class.** `SceneEditorStory` now takes a `nodes` registry (the editor exposes
      `@dxos/react-ui-canvas-editor/testing`), so a plugin kind renders through the shared editor:
      `plugins-plugin-uml-classnode--default` draws three classes, each expanding into its three compartments.

### Deviations and follow-ups

- **A composite's id may not be a kind's.** `card`, `icon` and `view` became kinds a 2D layout may hold (they are
  built-in editor types a template is made of), and an object id may not also be a kind, so a template names its
  composite something else; `compileTemplate` renames it to `template:<type>` anyway.
- **The scene DSL carries no text alignment, font or padding**, so the UML class's compartments are left-aligned
  where `ClassNodeView` centred and emboldened its name. The compartments draw their own borders, which is what
  reads as the class's two rules. Extending `readStyle` with alignment is the follow-up.
- **A part with no stack has no hug.** `constrain` says how a part's fixed size follows the frame; none of its values
  reads the part's content. "Hug" (`fit-content`) needs a measure pass the solver has no access to, and it makes the
  parts on an axis depend on each other, which is a stack with hug/fill sizing rather than one more constraint value.
- **A compartment does not grow to its content.** A class with more methods than its methods compartment holds
  clips them (`Ledger` in the class story), because a part is a fixed size the constraints place rather than one
  that hugs its text. A `content` constraint (Figma's "hug") is the fix, and it is what a card's body wants too.
- **Free point endpoints are not expressible in the DSL** (`from=`/`to=` name nodes), so a template cannot author a
  _link_ between two points. A rule is not a link, though: the card's hairline is a `polyline` part, whose vertices
  the DSL now authors as fractions of its own frame (`points="0,0.5 1,0.5"`), so it stretches with the card.

## Phase 8: hulls and themed diagram fences (started 2026-11-12)

A hull is a border round a set of shapes. Evaluate it in `ui/react-ui-canvas-editor/components/Hull`.

### Decisions

- **A hull is stored as a group** (the user, 2026-11-12: "Rebuild on composites"; the first cut kept every shape in
  one layout with a `parent` pointer, which was a second hierarchy beside composites). The stored form is what the
  Group command makes: an Instance (`fit: 'none'`, now with `hull: 'perimeter' | 'box'`) of an anonymous composite
  whose parts are the shapes, the links among them inside it, and a link across the border ending at the Instance on
  the port named by the part.
- **The 2D editor draws the group opened out** (the agent, 2026-11-12). `expandHulls` puts the parts back in the
  scene, each naming the hull as `parent`, with a `hull` node for the Instance; `collapseHulls` closes it before a
  change is written (`utils/hull-group.ts`, bound in `useDocumentStore`). So a shape inside a hull is selected, moved
  and linked like any other, a link from outside reaches the shape, and the lattice places it. `parent` is therefore
  a field of the drawn scene only, never of the stored document.
- **The frame is derived.** `fitHulls` sets a hull's `center`, `size` and `points` from what is inside it.
- **On a lattice the border is on gutter centre lines**, round the tiles (a cell and half of each gutter beside it)
  its shapes stand on. Each gutter the border runs along has a track a quarter of the gutter either side of it.
- **A route answers to borders by where its ends are.** A hull holding both ends or neither is closed to it; a hull
  holding one it crosses once (a crossing costs more than any number of bends). Containment is by tile.
- **A composite's parts are off the lattice**: they are placed about the composite's centre, so `latticeConstrain`
  leaves a `kind: 'composite'` layout as given. Before this a Group's parts were snapped as if they were cells.
- **A hull is an ordinary styled shape** (dashed outline by default), not a guide, so its border, fill and line style
  are its style's.

### Tasks

- [x] `HullNode`, `parent`, `InstanceNode.hull` in `@dxos/scene`; `hull` a 2D kind.
- [x] `utils/hull.ts`: members, tiles (box, perimeter with bridging), outline, `fitHulls`, `hullRegions`,
      `routeWalls`, `enclose`.
- [x] `utils/hull-group.ts`: `expandHulls`, `collapseHulls`; `drawnLists2D`, `drawnWrites`, `drawnDocument`.
- [x] `gutter-route.ts`: walls, tracks, crossing cost; `route.ts`: `latticeRoute` carries each link's walls.
- [x] The Hull tool (B) drags a frame that takes the shapes inside it; Enclose makes one round the selection.
- [x] Moving a hull moves what is inside it; deleting one leaves its shapes where they are.
- [x] Story `Hull` (Perimeter, Box, Lattice, LatticeBox), each with the same eight elbow links.
- [x] `diagram` fences in a markdown document draw in the editor's colour mode, contributed by plugin-canvas.
- [x] A double-click off an Object being edited leaves it (2D and 3D).
- [x] The Views tree nests a hull's shapes under it, selected where they stand; a row dragged onto a hull, or beside
      a row another hull (or none) holds, moves into that hull (`viewMove`, `moveToHull`, `moveWrites`).
- [x] Drawing section: Cell and Gutter are whole counts of grid cells (the lattice stored is the counts times the
      grid, written with it); the lattice survives off then on; a lattice that changes size re-seats every shape on
      the cells it had (`reseat`: the lattice mode for a layout's own shapes, `reseatWrites` for a hull's).
- [x] A hull's `inset` (grid cells): the border is drawn inside its gutter line, at most to the last cell before its
      shapes; the walls stay on the line and carry the inset, so the inside track runs between border and shapes.
      Stored on the group's Instance as `hullInset`.
- [x] Properties shows a shape selected inside a hull (`selectedElement` finds it in the hull's group).
- [x] Hull inset: a wall is where the border is drawn, so the gutter's centre line is the track outside an inset
      hull (`wallLines`, `gutterExit`).
- [x] `DEFAULT_LATTICE` gutter 8 by 8 grid cells (128 by 128). The reference diagrams follow it: each `.dx` source
      names its own grid (the DSL has no cell size of its own), now `grid=384x256`, with `compiled.json` and the
      `.dx.svg` renders regenerated.
- [x] Properties: a hull's border and inset side by side (`HullField`).
- [x] Extension tools: plugin-canvas's `extension-node-types` module contributes the space graph
      (`src/components/Graph`, its geometry in `generator/`, moved out of `src/testing/studio`); a contributed kind is offered in the
      `Extensions` group of the rail, with the card. The hull and the view are a `Containers` group. The studio
      branch imports the moved files from their old paths in four files.
- [x] A switch's hidden input stays inside the switch (the Properties panel scrolled away when a toggle far down
      it was pressed); Fill and Border read as a bare type draws them.
- [ ] Extension tools: the studio kinds other than the space graph (card, feed card, chip, plank, app frame,
      substrate) are still story-only, and contributed kinds are 2D only.
- [ ] A shape off its cell (snapping off) is re-seated on the nearest one, so two could land on the same cell.
- [ ] Views tree: moving a row into a plain Group, another View or an Object's definition (a move between two
      drawings, which needs a place for the shape in the other's coordinates), and any of it in 3D.
- [ ] Views tree: a hull with nothing inside it is a leaf row, which takes no drop.
- [ ] Dragging a shape across a border changes which hull holds it (today the hull stretches to follow it).
- [ ] A hull inside a hull: `enclose` and `collapseHulls` keep hulls flat.
- [ ] A group placed twice, or inside another Object, is drawn closed, without its border.
- [ ] Deleting a hull leaves its composite layout in the document, unplaced.
- [ ] Off a lattice an elbow link has no obstacle avoidance, so it does not yet keep to its side of a border.
- [ ] Lanes: more than three links on one quarter-gutter track are nudged past the border (`Nudge` knows no walls).
- [ ] Not checked: the `.dx` DSL round trip of `hull`, the SVG export, and what 3D draws of a hull's group.
- [ ] `PLUGIN.mdl`: record the hull.
- [ ] In-place editing: a scene node whose id is a part's id (the Cards story's `footer` card) is taken for a part.
- [x] **Extension kinds keep their own fields under `data`** (the user, 2026-11-12; COMMON-CORE.md decision 21).
      `Scene.BaseElement.data`; `KindRegistry.dataFields` / `normalize`; `kindNodeDef` refuses a top-level field of
      the kind's own unless it extends a core prototype; `kindData` for views; parts and binds name `data.<field>`.
      Moved: the space graph (its radius is now `size`), the studio card and feed card, the story's task kind, the
      UML class, and conductor's compute shapes (board shape, element and node; `computeData` in
      react-ui-canvas-compute `shapes/defs.ts`). An element or board shape stored flat reads as before and is written
      back under `data`. The Properties panel shows `data` last, as a group labelled `Custom`.
- [x] Space graph: fields two to a row (`FormLayoutAnnotation`), Population renamed Node density, a Base dots toggle
      (off by default).
- [x] A link's elbows (corner radius, smart stub, lane spacing) are counts of the drawing's grid, not of the default
      grid (`utils/route.ts`); the scene layer, the selection frame and the SVG export pass the layout's grid.
- [x] **Draw tool** (S, after Polyline): a `freehand` drag samples the pointer, `simplifyPath` thins the stroke,
      and it lands as a polyline with `params.smooth` (a Catmull-Rom curve in `polylinePath`). The tool is a registry
      entry that makes polylines, not a node type of its own.
- [x] **Draw shape tool** (W, folded with Draw): `utils/recognize.ts` reads a closed stroke as a rectangle, an
      ellipse, a triangle (four ways up) or a diamond by how near it runs to each outline; the shape lands on the
      grid, favouring major lines and the last or default size. An unread stroke lands as a line.
- [x] **Draw shape reads segments**: `readStroke` in `utils/recognize.ts` takes the samples' times, finds the pauses
      (`strokePauses`), fits each run as a line or a parabola, and lands a stroke that is no shape as a polyline with
      `bends`. Straight sides are biased level or upright (`squared`), and corners nearly in line are put in line
      (`aligned`). Covers a pentagon, a straight line and an arc; `Draw.stories.tsx` Shapes Test draws all three
      of the user's examples.
- [ ] Draw shape: no right-angled triangle or arrow, and a regular pentagon or hexagon lands as a polyline, not a
      polygon.
- [x] **Spline tool** (U, after Polyline): `NodeDef.curved` lands a line drawn vertex by vertex with a cubic bend
      per segment (`smoothBends`, Catmull-Rom); a bend's `second` control makes it a cubic. Vertex edit mode shows
      each bend's controls (`bend-handle`) and drags them (`Drag` `vertex` with `bend` and `handle`); a vertex put
      in or taken out keeps the curve (`bendsAfterInsert`, `bendsAfterDelete`). `Draw.stories.tsx` Spline Test.
- [x] **Views list front first** (user: "the operations work, but the view list is reversed"): `buildViewTree` and
      `layoutTree` list a View's rows from the element drawn last to the one drawn first, and a drop above a row
      puts the element in front of it (`dropPosition`). The Layers list was top first already (`LayersInspector`).
- [x] **Tool names** (user, 2026-11-12): Draw is `Freehand` and Draw shape is `Magic`; the registry keys
      (`freehand`, `freehandShape`) and the button they share (`DRAW_FOLD`, "Draw") are unchanged.
- [x] **No toolbar drag for drawn tools**: a type with `createFromPoints` (Polyline, Spline, Draw, Draw shape)
      carries no drag payload (`ToolDef.drawn`, `toolDragData2D`, `ToolsPanel`).
- [ ] **Drawing DSL data binding** (user, 2026-11-12): a `.dx` drawing names a data file (a JSON object) or holds
      a JSON object of its own, and a custom shape binds its fields to that data by JSONPath; e.g. the Graph shape
      draws the graph the data describes. Not designed yet: where the data is declared, how a bind is written
      beside the template's `bind=`, and what a shape does when the path resolves to nothing.
- [ ] Polyline `bends`: hit testing, ports and the `.dx` / SVG export treat a bent segment as straight, and 3D does
      not draw one. A straight segment has no gesture to bend it, and a spline's two controls at a vertex move
      apart (no smooth-vertex constraint).
- [x] Text colour for notes: `style.textHue` / `style.textTone`, a 9 by 3 grid in Properties.
- [ ] Text colour is offered for notes alone; a shape's label still takes its shape's colour.
- [x] The icon picker offers the DXOS mark (`dx--dxos--regular`), first in its list.
- [ ] Draw tool: hit testing, ports and the `.dx` / SVG export still treat a smooth polyline as its straight
      segments; its vertex edit mode shows the thinned points. No pressure or stroke width.
- [x] Card: authored at 16 by 12 cells with half-cell gaps, text sizes 18 / 16 / 14, a 24 px glyph, title centred;
      the scene DSL reads `fontSize`, `alignHorizontal` and `alignVertical`. A Card story beside Graph.
- [ ] `toDiagramObjects` (`utils/diagram.ts`) and the generator runner still route on the default grid: neither is
      given a layout to read the grid from.
- [ ] Conductor: `data.node` (the compute node id) is an editable text field in the Properties panel, as `node` was.
- [ ] Conductor: a board's legacy trigger keeps `spaceId` / `triggerKind` at the shape's top; nothing reads them.
- [ ] Conductor: `createComputeGraph` / `useGraphMonitor` read `data` only, so a canvas graph model built with flat
      fields (none in the repo) would lose them. Not exercised in a browser: a legacy flat board, a trigger, paste,
      undo, and editing `data.value` in the Properties form.
- [ ] The Properties panel's generic list editor does not save a change to one row of a list under `data` (nor did
      it at the top): `patchValues` splits a path on `.` and the form names a row `list[0]`. UML is unaffected, since
      it edits its lists with `LinesField`.
- [ ] 3D has no extension kinds yet; `data` is on the shared base, so a 3D kind takes the same form when one exists.

## Backlog

- [x] **Import a tldraw diagram as a canvas** (tracked 2026-10-18; built 2026-10-19). `src/import/tldraw.ts`
      (`tldrawToViews`, pure, fixtures in `src/import/testing.ts`), `CanvasOperation.ImportTldraw` and the
      "Copy as canvas" action keyed by `Canvas.TLDRAW_SCHEMA`; stories `plugins/plugin-canvas/import/ImportTldraw`.
      Groups become anonymous Objects (via `composeSelection`), rotation carries over, frames map to `view` nodes, only the
      first page is read, and freehand / image / embed shapes are skipped (counted in the result). The original plan: An operation in plugin-canvas transforms a
      plugin-tldraw diagram into a new canvas document (shapes → nodes, arrows → links, frames → Views, groups →
      Objects per `packages/ui/react-ui-canvas/docs/VIEWS.md`), creates the Canvas object in the same space and opens
      it. plugin-canvas contributes a menu action to plugin-tldraw's diagram (object menu / toolbar) that invokes the
      operation, so plugin-tldraw takes no dependency on plugin-canvas. Needs: a tldraw-store → `Scene` mapper with
      unit tests over representative tldraw fixtures; the operation's schema and handler; the menu contribution;
      a story or e2e step that converts a sample drawing.

- [ ] **Default test drawing.** A canvas drawing seeded in the personal space by default, next to the DXOS
      README, exercising the engine (shapes, links, nested scene, layers, style classes).
- [ ] **Slide decks laid out on a canvas.** Extend the slide deck so its slides are placed and arranged on a
      canvas (one scene per deck, a slide per frame).
- [ ] **Frame node.** Rename the scene shape "Frame", and let a frame hold either a nested scene or any app
      surface (an ECHO object rendered through `Surface`), not only a scene.
- [x] **Type prototypes.** `createNodeRegistry(types, prototypes)` with `extends`; `rect` and `scene` share the
      `box` prototype (DESIGN §4c). Scene shapes: centred label, `contents` option, zoom-in control.
- [ ] **Instance prototypes** (DESIGN §4c): `prototype?: NodeId`, `resolveNode`, inherited values as
      placeholders, reset-to-prototype. Candidate: `ellipse` on `box` with its own view and one port per side.
- [ ] **Object classes and prototypes.** Define named classes of objects (a shared bundle of type, size,
      style, port count and other non-text properties), and designate the current object as a prototype
      that can be applied to others: a selection takes the prototype's properties, keeping its own text and
      geometry. Builds on the multi-select properties panel (common schema, batched `update` intents) and
      on `cloneShape` (`react-ui-canvas/src/utils/shapes.ts`), which already copies a shape's look without
      its text. Open questions: whether an applied object stays linked to its prototype (edits propagate)
      or is a one-off copy; where classes live (per scene, per canvas, or as ECHO objects in the space);
      how the palette offers them.
- [ ] **Lattice mode** (design: `packages/ui/react-ui-canvas/docs/DESIGN.md` §8b). Spec: `{ width, height, gutterX, gutterY }`, default 256x128 / 128x64.
      Steps, each testable alone: (1) `quantize` + occupancy, unit-tested; (2) lattice projection wrapping the freehand
      reducer, reducer-invariant tests; (3) `Projection.constrain?` in the pointer machine (preview lands
      where it drops, red on collision); (4) lattice grid layer + story; (5) Column/Row/Span fields and
      the scene's spec in the properties panel; (6) lattice-aware `smart` routing on `makeAvoidingRouter` + `nudge`; (7) toolbar toggle and switch-on quantization with nearest-free-cell placement.
      Later: reflow instead of rejection.
- [ ] **Lattice: dynamic ports.** Instead of a fixed number of ports per side, place a link's port where
      its incident segment can stay straight (e.g. aligned with the gutter line or the other end), so the
      route needs no jog at the shape. Interacts with pinned ports and `portsPerSide`.
- [x] **Lattice: route around occupied cells only.** Gutter routing currently keeps every run on a gutter
      centre line; instead let a route cross free cells directly and detour through the gutters only
      around occupied ones (`utils/gutter-route.ts`).
