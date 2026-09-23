# plugin-canvas — Tasks

_Resume: PR #13249 (branch `claude/infinite-canvas-depth-7e0949-ojem5i`, mirrored to `claude/infinite-canvas-depth-7e0949`) carries PR 0 (`@dxos/diagram`, published) and the phase 1 engine (`src/scene/`, typed nodes and links, four stories smoke-tested headlessly); CI green except Depot runner drop-outs documented on the PR. Next: the user's answers to the mobile-mode questions (§6b), the migration decisions in `docs/MIGRATION.md` §3, then M1 or phase 2. Once PR 0 lands, write the phase 1 plan and build `react-ui-canvas/src/scene/` (delete `src/experimental/` in that PR). Uncommitted: none. Last: `packages/common/diagram` created, illustrator model moved, consumers rewired, DSL gaps (ports, portal, index) added with tests._

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

Engine lives in `packages/ui/react-ui-canvas/src/` (`model`, `utils`, `hooks`, `components`), exported as `@dxos/react-ui-canvas/scene`. Stories: `ui/react-ui-canvas/scene/SceneView`.

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
      and the content sat at the top. Wrapped in `dx-fullscreen flex`.
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
      output that does not exist and the graph says so (`output does not exist on node:
    [text-to-image] -> result`). A real implementation settles the output schema the edge needs. The
      same fault is in the old editor; `chat` likewise has no `exec`, which is the console's
      `No compute function for node type: chat`.
- [ ] `scene--plugins`: the Text node renders as an empty box — no header, icon or run control — where
      the editor draws it normally; its rendered text content is the empty string.
- [ ] The remaining `scene` stories (beacon, control, template, gpt, plugins, artifact, image-gen,
      audio, voice), same treatment.
