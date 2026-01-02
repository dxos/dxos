# Universal DND

## Ideas
- Generate UI from data

## Phase 1
- Can we fully generalize StackItem and use for all draggable items and containers?
  - Current draggable()
    - StackItem
    - ListItem (react-ui-list)
    - BoardCell (react-ui-board)
    - L0Menu
    - Frame/Tools (react-ui-canvas-editor)
    - Grid (experimental)
    - NOTE: StackItem.Content used everywhere?

- [ ] Generalize Stack as a container? / useStackDropForElements
  - [ ] IDEAL: Factor out DND guts
  - [ ] Create story
  - [ ] Generalize data for cell and container

## Phase 2
- [ ] Retro fit react-ui-list (Search) + react-ui-board (BoardCell)
- [ ] Move all card chrome out of Kanban into Card surface.
- [ ] Context for menu actions?

## Phase 3
- [ ] L0
- [ ] Fix card layout (conform to grid).
