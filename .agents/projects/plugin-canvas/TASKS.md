# plugin-canvas — Tasks

_Resume: PR 0 (`@dxos/diagram` extraction) is implemented on this branch and being submitted; once it lands, write the phase 1 plan and build `react-ui-canvas/src/scene/` (delete `src/experimental/` in that PR). Uncommitted: none. Last: `packages/common/diagram` created, illustrator model moved, consumers rewired, DSL gaps (ports, portal, index) added with tests._

## Phase 0: audit + design

Decide rewrite vs adopt (xyflow) for an infinite, multi-depth canvas, and pin the data model and coordinate system before any engine code is written.

### Tasks

- [x] **Audit existing board/canvas surfaces** → `packages/ui/react-ui-canvas/docs/AUDIT.md`
  - react-ui-canvas, react-ui-canvas-editor, react-ui-canvas-compute, react-ui-board (Board + Chain), react-ui-diagram, react-ui-graph, react-ui-gameboard, react-ui-dashboard, react-ui-geo, plugin-board/excalidraw/graph/conductor.
- [x] **External research** (`packages/ui/react-ui-canvas/docs/RESEARCH.md`) — infinitecanvas.tools, Muse boards-in-boards, tldraw hybrid rendering, xyflow sub-flows, JSON Canvas, semantic zoom, d3 usefulness.
- [x] **Design spec** → `packages/ui/react-ui-canvas/docs/DESIGN.md` (pointer in `agents/superpowers/specs/2026-09-20-infinite-canvas-design.md`) — awaiting user review.
- [x] **Throwaway spike story** demonstrating zoom between depths — `react-ui-canvas/src/experimental/SceneView.stories.tsx`; verified: fit, pinch zoom, tiers, auto + double-click drill-in, Escape drill-out, select, drag-move. Delete when the engine lands.

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

## Phase 1: first PR

- [ ] Types, registry, projection seam; freehand / constrained / dynamic projections (minimal).
- [ ] Infinite zoomable canvas with grid, camera, select/marquee, control frame (move + resize), ports + automatic pairing, port-drag linking.
- [ ] Navigation: double-click / auto / Escape / breadcrumbs / history.
- [ ] Palette: rectangle, link, scene (nested).
- [ ] Stories: Freehand, Constrained, Dynamic, Nested; unit tests per pure module.

### References

- Muse: https://museapp.com · infinitecanvas.tools · tldraw · @xyflow/react
