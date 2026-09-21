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
- [ ] Camera as an imperative transform from the atom (decision 7); today pan/zoom re-render through React like the spike.
- [x] Text parts + in-place editing (`parts.ts`, `PartEditor.tsx`): rect/ellipse label, text body, class name / attributes / methods are `TextPart`s; double-click opens a `react-ui-editor` over the part, Enter (Mod-Enter in multi-line parts) commits an `update`, Escape rejects, blur commits.
- [ ] Multi-part nodes beyond text: parts with their own bounds and ports (e.g. a shape with several text areas laid out by the model).
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

### References

- Muse: https://museapp.com · infinitecanvas.tools · tldraw · @xyflow/react
