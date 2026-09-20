# plugin-canvas — Tasks

_Resume: user reviews DESIGN.md; on approval write the phase 1 plan and build `react-ui-canvas/src/scene/`. Uncommitted: none. Last: AUDIT.md + research committed; throwaway spike verified in storybook (`packages/ui/react-ui-canvas/src/experimental`, story `ui/react-ui-canvas/experimental/SceneView`)._

## Phase 0: audit + design

Decide rewrite vs adopt (xyflow) for an infinite, multi-depth canvas, and pin the data model and coordinate system before any engine code is written.

### Tasks

- [x] **Audit existing board/canvas surfaces** → `.agents/projects/plugin-canvas/AUDIT.md`
  - react-ui-canvas, react-ui-canvas-editor, react-ui-canvas-compute, react-ui-board (Board + Chain), react-ui-diagram, react-ui-graph, react-ui-gameboard, react-ui-dashboard, react-ui-geo, plugin-board/excalidraw/graph/conductor.
- [x] **External research** (`agents/superpowers/specs/2026-09-20-infinite-canvas-research.md`) — infinitecanvas.tools, Muse boards-in-boards, tldraw hybrid rendering, xyflow sub-flows, JSON Canvas, semantic zoom, d3 usefulness.
- [x] **Design spec** → `DESIGN.md` (pointer in `agents/superpowers/specs/2026-09-20-infinite-canvas-design.md`) — awaiting user review.
- [x] **Throwaway spike story** demonstrating zoom between depths — `react-ui-canvas/src/experimental/SceneView.stories.tsx`; verified: fit, pinch zoom, tiers, auto + double-click drill-in, Escape drill-out, select, drag-move. Delete when the engine lands.

## Phase 1: first PR

- [ ] Infinite zoomable canvas with grid.
- [ ] Basic shape palette: rectangle, link, scene (nested).
- [ ] Storybook story + tests.

### References

- Muse: https://museapp.com · infinitecanvas.tools · tldraw · @xyflow/react
