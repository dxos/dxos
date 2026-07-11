# react-ui-board — Tasks

## Follow-ups

### Tasks

- [ ] **Zoom keeps the board anchored**
  - Zooming in/out should not move the board (no jump / scroll shift).
  - If a card is currently selected, center the viewport on it while zooming;
    otherwise keep the current center fixed.
  - Depends on tracking a "selected card" (no selection state today — `onSelect`
    was dropped in the Board unification; see `Board.tsx`).
