# plugin-canvas — Tasks

_Resume: finish AUDIT.md from the three audit reports, then present approaches + design for approval. Uncommitted: none. Last: project registered._

## Phase 0: audit + design

Decide rewrite vs adopt (xyflow) for an infinite, multi-depth canvas, and pin the data model and coordinate system before any engine code is written.

### Tasks

- [ ] **Audit existing board/canvas surfaces** → `.agents/projects/plugin-canvas/AUDIT.md`
  - react-ui-canvas, react-ui-canvas-editor, react-ui-canvas-compute, react-ui-board (Board + Chain), react-ui-diagram, react-ui-graph, react-ui-gameboard, react-ui-dashboard, react-ui-geo, plugin-board/excalidraw/graph/conductor.
- [ ] **External research** — infinitecanvas.tools, Muse boards-in-boards, tldraw hybrid rendering, xyflow sub-flows, JSON Canvas, semantic zoom, d3 usefulness.
- [ ] **Design spec** → `DESIGN.md` (+ `agents/superpowers/specs/2026-09-20-infinite-canvas-design.md`): data model (Scene/Cell), coordinate system (scene-local, depth via camera + scene stack), rendering (SVG/canvas root + HTML islands), interaction (select/marquee/multi-move/link anchors/dnd), build-vs-adopt decision.
- [ ] **Throwaway spike story** demonstrating zoom between depths (labelled throwaway).

## Phase 1: first PR

- [ ] Infinite zoomable canvas with grid.
- [ ] Basic shape palette: rectangle, link, scene (nested).
- [ ] Storybook story + tests.

### References

- Muse: https://museapp.com · infinitecanvas.tools · tldraw · @xyflow/react
