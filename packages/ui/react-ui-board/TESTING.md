# react-ui-board — Testing & component overview

This package exposes two board-style composites, `Board` and `Grid`. Interactive
drag/resize can't be synthesized in automation (native HTML5 DnD), so both ship a
**manual** test plan; everything else (engine, geometry, render, wiring) is covered
headless by build/lint/unit tests.

- **Grid** manual plan: [`src/components/Grid/TESTING.md`](./src/components/Grid/TESTING.md)
- **Board** manual plan: below.

## Board vs Grid — feature comparison

Both are Radix composites with the **same shell** — `Root · Container · Viewport ·
Content · Backdrop · Cell` — and the same core interactions (drag a tile by its
handle, `+`-to-add on empty backdrop cells, per-tile delete, imperative
`center()`, edge auto-scroll). They diverge in their **layout policy**, which is
why they are two components rather than one with a flag.

| Feature                 | **Board**                                  | **Grid**                                        |
| ----------------------- | ------------------------------------------ | ----------------------------------------------- |
| Layout policy           | Free-form placement                        | Auto-arranging (gridstack)                      |
| Coordinate origin       | Centre `(0,0)`, signed x/y                 | Top-left `(0,0)`, unsigned                      |
| Extent                  | Fixed `size` (W×H) canvas                  | Column-bounded; rows grow down                  |
| Layout model            | Sparse `cells: Record<id, {x,y,w?,h?}>`    | Packed `items: [{id,x,y,w,h}]` + `columns`      |
| Collision / push        | ✗ — tiles may overlap; nothing rearranges  | ✓ — `resolveCollisions` pushes right/down       |
| Compaction modes        | ✗                                          | ✓ — `pack` (gravity-up) / `float`               |
| Resize                  | ✗ (TODO)                                   | ✓ — live preview, magnetize ~16px, constraints  |
| Settle delay            | ✗                                          | ✓ — `settleDelay` defers push until drag dwells |
| Move preview            | Single target-cell ring                    | Full-footprint outline + live neighbour reflow  |
| Zoom / overview         | ✓ — `toggleZoom` (scale-50), `overScroll`  | ✗ (pinch-to-zoom deferred)                      |
| Snap-to-grid scroll     | ✗                                          | ✓                                               |
| Toolbar                 | ✓ — `Board.Toolbar` (centre/zoom/add)      | ✗ (consumer supplies)                           |
| Controller (ref)        | `center(cell?)`, `toggleZoom()`            | `center()`                                      |
| DnD substrate           | Raw pragmatic-dnd (pre-core)               | **`Dnd.Root`** universal core                   |
| Auto-scroll             | Pragmatic `autoScrollForElements`          | Custom ramped edge-band (native-suppressed)     |
| Headless engine + tests | ✗ (no engine)                              | ✓ — `engine.ts`, 33 unit tests                  |
| Consumed by             | `plugin-board` (ECHO `Board.layout.cells`) | stories only (not yet wired to a plugin)        |

### Are they the same component with different config?

**No — but they should share more substrate than they do today.** The shell,
the `Cell` (Card + drag handle + delete), the geometry helpers, `center()`, and
auto-scroll are common. What genuinely differs is the **layout model** (sparse
centre-origin map vs packed top-left list) and the **engine** (free placement vs
collision/push/resize). A single component gated by a boolean would be mostly
branches on those two axes, so keeping two composites is the right call.

The worthwhile consolidation is one layer **down**:

1. Migrate `Board` onto **`Dnd.Root`** (it predates the universal core), reusing
   the same monitor/container-registry/placeholder-drop plumbing as `Grid`.
2. Extract a shared **`Cell`** (Card shell, drag handle, delete, optional resize
   handle) both can render.
3. Share `geometry` (`cellRect`), the edge auto-scroll, and the `center()`
   controller.

`Board` then keeps free placement + zoom; `Grid` keeps its engine + resize.
Folding `Board` _into_ `Grid` (a `free` engine mode with signed coords) is
possible but requires an **ECHO schema migration** in `plugin-board`
(`cells` Record → `items` list), so it's out of scope for the DnD-core work.

## Board — manual test plan

Story: `ui-react-ui-board-board--default` (Storybook, this worktree).

### Layout / render

- [ ] Renders the default 7×5 board centred on load, `(0,0)` in the middle.
- [ ] Empty cells are dashed; hovering one reveals a `+` button.
- [ ] Cards show a drag handle and a delete (✕) button in the header.

### Move

- [ ] Drag a card by its handle; the target cell highlights (ring) on drag-enter.
- [ ] Dropping moves the card to that cell (`onMove`); other cards are **not**
      pushed (free placement — overlaps are allowed).
- [ ] Releasing off any cell leaves the card where it was.

### Zoom / centre

- [ ] Toolbar crosshair re-centres the board.
- [ ] Toolbar zoom toggle scales the board to 50% (overview) and back.
- [ ] Selecting a card centres the viewport on it.

### Add

- [ ] Backdrop `+` adds a tile at that cell; toolbar `+` opens the object picker.

### Auto-scroll

- [ ] Dragging a card near the container edge auto-scrolls the viewport.

## If something's off

Open DevTools console and drag. For `Grid`, the `Dnd.Root` monitor logs
`Root.onDrop { source, location }` and warns on invalid target/source — paste
those lines to pinpoint routing. `Board` uses per-cell drop targets (no central
monitor yet), so check the `onMove` handler receives the expected position.
