# react-ui-board — Tasks

## Follow-ups

### Tasks

- [x] **Zoom keeps the board anchored** — done.
  - Zoom scales from the top-left (`transform-origin: 0 0`); `Board.Container`
    compensates scroll on each zoom change: centers on the first selected tile if
    any, otherwise holds the current viewport centre fixed. (Selection state now
    exists — added with the single/multi-select feature.)

- [x] **`Board.Map` overview** — done.
  - Tiles render with `bg-separator` (visible); the viewport rectangle is drawn
    from live board/viewport geometry. Wired into `plugin-board`'s `BoardArticle`
    as a corner overlay.

- [ ] **Overscroll mount-centering shift** (CodeRabbit PR #12321)
  - With `overscroll`, `overscrollPad` is populated by a passive effect that runs
    _after_ the mount `useLayoutEffect` centre, so the board shifts by half the
    viewport on first paint. Fix: commit the padding (measure viewport) before the
    one-shot instant centre, or re-centre once after padding initialises — keeping
    it mount-only. Overscroll-story only.

- [ ] **Margin button to add a row/column**
  - Add a control (edge affordance / toolbar button) to grow the board by a
    row or column, extending the grid extent (relates to the `margin` prop and
    `bounds`).
