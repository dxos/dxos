# react-ui-board — Tasks

## Follow-ups

### Tasks

- [ ] **Zoom keeps the board anchored**
  - Zooming in/out should not move the board (no jump / scroll shift).
  - If a card is currently selected, center the viewport on it while zooming;
    otherwise keep the current center fixed.
  - Depends on tracking a "selected card" (no selection state today — `onSelect`
    was dropped in the Board unification; see `Board.tsx`).

- [ ] **`Board.Map` renders empty**
  - The overview map shows no tiles in use. Storybook render had 5 tile children
    with `bg-accentSurface`, so likely the tile fill is invisible (contrast/token)
    and/or it's empty in `plugin-board` (the map isn't wired there yet).
  - Investigate the tile color token and add the map to `plugin-board`; consider
    showing the current viewport rectangle too.
