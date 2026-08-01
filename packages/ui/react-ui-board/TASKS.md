# react-ui-board — Tasks

## Follow-ups

### Tasks

- [x] **Zoom keeps the board anchored** — done.
  - Zoom scales from the top-left (`transform-origin: 0 0`); `Board.Container`
    compensates scroll on each zoom change: centers on the first selected tile if
    any, otherwise holds the current viewport centre fixed. (Selection state now
    exists — added with the single/multi-select feature.)

- [ ] **`Board.Map` renders empty**
  - The overview map shows no tiles in use. Storybook render had 5 tile children
    with `bg-accentSurface`, so likely the tile fill is invisible (contrast/token)
    and/or it's empty in `plugin-board` (the map isn't wired there yet).
  - Investigate the tile color token and add the map to `plugin-board`; consider
    showing the current viewport rectangle too.
