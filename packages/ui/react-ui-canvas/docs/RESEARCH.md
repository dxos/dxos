# Infinite-canvas research notes (2026-09-20)

Web survey supporting `AUDIT.md` §5 and `DESIGN.md`. Verified facts cite sources
inline; unverifiable items are flagged at the end.

## 1. infinitecanvas.tools

Curated catalog (~120 apps) plus a history timeline (Sketchpad 1963 → Post-it → Illustrator). Frames the category
by four properties: expansiveness, zoom, direct manipulation, collaboration. Publishes no architectural facets
(rendering tech, nesting, LOD); per-tool pages 404 to a fetcher. The comparison table in AUDIT.md §5 is assembled
from primary sources.

## 2. Muse → Allume

- museapp.com redirects to allume.com. "Allume — for focused thinking", developer Milestone Made, LLC (Adam Wulf,
  after the 2023 handoff); Mac/iPad/iPhone; free tier "small board size", paid "huge board size".
- Boards-in-boards: "Each Allume board is like a whiteboard that can hold even more whiteboards"; a nested board is
  a card showing a live preview on its parent; depth is signalled with visual "haze" (Ink & Switch essay).
- Zoom navigation: pinch-in on a board card zooms into it; global pinch-out zooms back to the parent; on gesture end
  the view snaps "to the nearest stable zoom level". No discrete open/close; a card can be held while zooming to
  carry it between levels. Pinch-to-navigate is a setting.
- Board size is finite: "Flex boards" (Muse 1.5) size to content. Stated rationale against infinite boards:
  disorientation and technical challenges. Cards keep absolute positions within their board.
- Linked cards (2022 memo): one board referenced from several places (alias, not copy).
- Data/sync: Muse 2.0 (May 2022) custom local-first sync, client-side CRDT in Swift, streaming Go server with no
  domain knowledge. Metamuse ep. 56 "Sync": data split into transactional (positions, metadata), blob (PDF/video,
  lazy) and ephemeral (cursors, in-progress ink); a bag of entity-attribute-value-timestamp atoms; protobuf on the
  wire; server batches edits every 100 ms. Ep. 78 covers event-vs-state data and schema versioning. Wiggins'
  retrospective: iCloud unreliable, Firebase unsuited, bespoke sync "too big an investment" but "a pleasure".

## 3. tldraw

- Root `div.tl-canvas` (`contain: strict`). `div.tl-html-layer.tl-shapes` is the camera host; a `useQuickReactor`
  sets its CSS transform from `getHtmlLayerTransform(editor)` imperatively. `svg.tl-svg-context` holds shared
  `<defs>`; `CanvasOverlays` (selection, brush, handles, indicators) at z-index 500.
- Each shape is a div (`Shape.tsx`); a reactor sets `transform: Mat.toCssString(getShapePageTransform(id))`,
  width, height, clip-path, bypassing React. `ShapeUtil.component` returns `HTMLContainer` or `SVGContainer`.
  Children are not DOM-nested under parents; every shape div gets its composed page transform; frames add a
  background layer.
- Camera `{x, y, z}`; `zoomSteps [0.1, 0.25, 0.5, 1, 2, 4, 8]`; `TLCameraOptions` with `isLocked`, `wheelBehavior`,
  `panSpeed`, `zoomSpeed`, constraints `free | fixed | inside | outside | contain`. `screenToPage`, `pageToScreen`.
- Culling: `getCulledShapes()` (excludes selected/editing); culled shapes stay in the DOM as `display:none`,
  maintained by a `CullingController` with O(1) subscriptions; `ShapeUtil.canCull()` opts out.
- Nesting: `parentId` is a page or shape id; child x/y relative to parent; `getShapeLocalTransform ×
getShapeParentTransform = getShapePageTransform`; `reparentShapes()` preserves page position by rewriting local
  coords. Frames clip children (arrows exempt) and adopt shapes drawn inside; groups derive bounds, dissolve at one
  child, click-through focus.
- Z-order: string fractional indexing (`IndexKey`, base-62, jittered), relative to siblings within one parent.
- Zoom helpers: `zoomToFit`, `zoomToSelection`, `zoomToBounds(bounds, {inset, targetZoom, animation})`; input
  cancels animations.
- License: SDK license permits use only in development by default; production needs a key (100-day trial,
  commercial, or watermark hobby). Tightening dated Sept 2025 by third parties (flag).

## 4. @xyflow/react (React Flow 12)

- npm `12.11.6`, MIT; `@xyflow/system 0.0.82` depends on d3-zoom/d3-drag/d3-selection/d3-interpolate ^3; zustand.
- Viewport `{x, y, zoom}`; `defaultViewport`, controlled `viewport` + `onViewportChange`, `minZoom` 0.5,
  `maxZoom` 2, `translateExtent`, `nodeExtent`, `nodeOrigin`; `useViewport()` re-renders on every change;
  `useReactFlow().setViewport/fitView/zoomTo`; `panActivationKeyCode 'Space'`.
- Rendering: nodes HTML divs in a transformed container, edges SVG; `onlyRenderVisibleElements` culls.
- Nesting: `parentId`, child `{0,0}` = parent top-left, `extent: 'parent'`, `expandParent`, parents must precede
  children; a child "is not really a child markup-wise"; xyflow#5203: edges inside nested flows can be
  unselectable because of z-index vs the parent node.
- No LOD; "contextual zoom" example reads `useStore(s => s.transform[2])` per node (re-render per zoom tick).
- Edges: `default` (bezier), `straight`, `step`, `smoothstep`, `simplebezier`; path utils exported; no orthogonal
  auto-routing.
- Limits for a nested-scene model: single-level viewport, 0.5–2× design range, flat divs with hand-managed
  z-index, one zustand store (fights doc-per-scene).

## 5. Excalidraw and JSON Canvas

- Excalidraw file: `{type, version, source, elements[], appState, files}`. Element base: `id, type, x, y, width,
height, angle, stroke…, seed, version, versionNonce, isDeleted, locked, link, customData, boundElements,
index (FractionalIndex|null), groupIds (deepest→shallowest), frameId`. Absolute scene coords even inside frames;
  frame children must precede the frame in the array. Nesting is flat-with-tags; groups are id-sets.
- JSON Canvas 1.0 (2024-03-11, MIT, Obsidian): `nodes[]` of `text | file | link | group` with `id, x, y, width,
height, color?`; `edges[]` with `id, fromNode, toNode, fromSide?, toSide?, fromEnd?='none', toEnd?='arrow',
color?, label?`. Groups are bounding boxes only; containment is spatial. Explicitly extensible.
- Verdict: good export targets; neither models nested scenes, local coords, or domain-object refs. Export flattens
  each scene to absolute coords; an extension field can carry a scene ref.

## 6. Semantic zoom / LOD

- Origins: Perlin & Fox, Pad (SIGGRAPH 1993): semantic zoom and portals; Pad++ (Bederson, Hollan 1994); Jazz/Piccolo;
  Prezi (2009); van Wijk & Nuij, "Smooth and efficient zooming and panning" (InfoVis 2003), the trajectory d3's
  `interpolateZoom` implements.
- Figma: WebGL tile engine with its own DOM/compositor/text layout; rejected DOM/SVG because they are "optimized for
  scrolling, not zooming" and re-tessellate on every scale change. LOD thresholds unpublished.
- Patterns: (1) discrete tiers by on-screen size with hysteresis; (2) crossfade band for visual tiers only;
  (3) drill-in = camera transition then root swap; (4) mount live HTML only at the top tier, static preview below.
- Precision: doubles lose accuracy with distance from origin; CSS transforms pass through float32 in the compositor;
  a single global (x, y, depth) with monotonically growing zoom breaks after a few levels. tldraw bounds zoom to
  [0.1, 8]; Figma keeps everything in bounded frames. Per-scene local coordinates with a bounded camera give
  unlimited depth with bounded numbers and one CRDT doc per scene; cross-scene edges need explicit portal
  semantics.

## 7. d3

- d3-zoom: `{k, x, y}` with `apply/invert`, `scaleExtent`, `translateExtent`, pluggable `constrain`, `filter`,
  `wheelDelta`, `touchable`; `zoom.transform(transition, t, point)` uses `interpolateZoom` (van Wijk–Nuij, `.rho()`
  default √2). DOM-agnostic math worth keeping for zoom-to-cell transitions.
- d3-shape: `link(curve)` cubic Bézier between points with horizontal/vertical tangents (`linkHorizontal` =
  `curveBumpX`); `curveBasis`, `curveCatmullRom.alpha()`, `curveMonotoneX`, `curveStep`, `curveNatural`; outputs
  SVG path strings. Good for edge splines; no orthogonal routing.
- d3-drag: binds to d3-selection and fights React DOM ownership. Native Pointer Events (`setPointerCapture`) plus
  `wheel` with `ctrlKey` (browsers synthesise trackpad pinch as ctrl+wheel; tldraw and React Flow rely on this) and a
  two-pointer distance/midpoint for touch replace d3-zoom/d3-drag in ~150 lines.

## 8. Interaction patterns

Marquee on empty canvas by intersection (tldraw, React Flow `selectionMode: 'partial'`) vs containment (Figma);
shift adds. Multi-move: move the selection's shared transform, rewrite each member's local coords. Snap-to-grid /
snap-to-siblings in scene coords with snap lines on the overlay. Connector: handle on a cell side, edge stores
`{node, side}`, route with d3 link curves. Pinch: trackpad ctrl+wheel at cursor, touch two-pointer around midpoint,
snap to stable level on release (Muse). Space+drag pan, wheel pan. Shortcuts: shift+1 fit, shift+2 selection,
shift+0 reset; `zoomToBounds(bounds, {inset, targetZoom, animation})`. Drill-in: pinch past threshold on a
nested-scene cell or double-click; pinch-out at min zoom returns to parent.

## Sources

- https://infinitecanvas.tools/ · https://infinitecanvas.tools/gallery/
- https://allume.com/ · https://allume.com/how/nestedboards/ · https://museapp.com/updates/
- https://www.inkandswitch.com/muse/ · https://www.inkandswitch.com/essay/local-first/
- https://news.ycombinator.com/item?id=31494498 · https://adamwiggins.com/muse-retrospective/
- https://allume.com/podcast/56-sync/ · https://museapp.com/podcast/78-local-first-one-year-later/
- https://museapp.com/memos/2021-03-flex-boards/ (404; snippet) · https://museapp.com/memos/2022-09-linked-cards/ (404; snippet)
- https://tldraw.dev/sdk-features/camera · /coordinates · /parenting · /culling · /shape-indexing · /frame-shape · /groups · /shapes
- https://tldraw.dev/community/license · https://tldraw.dev/sdk-features/license-key
- https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx · …/components/Shape.tsx
- https://reactflow.dev/api-reference/react-flow · /api-reference/hooks/use-viewport · /api-reference/types/edge · /learn/layouting/sub-flows · /learn/concepts/the-viewport · /examples/interaction/contextual-zoom · https://github.com/xyflow/xyflow/issues/5203
- https://registry.npmjs.org/@xyflow/react/latest · https://registry.npmjs.org/@xyflow/system/latest
- https://docs.excalidraw.com/docs/codebase/json-schema · https://docs.excalidraw.com/docs/codebase/frames
- https://jsoncanvas.org/spec/1.0/ · https://obsidian.md/blog/json-canvas/
- https://mrl.cs.nyu.edu/~perlin/pad-siggraph.pdf · https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p23-bederson.pdf · https://vanwijk.win.tue.nl/zoompan.pdf
- https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/ · https://www.steveruiz.me/posts/zoom-ui · https://en.wikipedia.org/wiki/Floating_origin
- https://d3js.org/d3-zoom · https://d3js.org/d3-interpolate/zoom · https://d3js.org/d3-shape/link · https://d3js.org/d3-shape/curve

Flagged / unverified: infinitecanvas.tools has no architectural facets; Muse's exact board unit model and the
flex-boards/linked-cards memos (404, quoted from snippets); tldraw license change date; Figma LOD internals;
Miro/Heptabase/Scrintal rendering tech.
