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

- [ ] **Margin button to add a row/column**
  - Add a control (edge affordance / toolbar button) to grow the board by a
    row or column, extending the grid extent (relates to the `margin` prop and
    `bounds`).
