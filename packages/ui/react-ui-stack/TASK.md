# Universal DND

## Ideas
- Generate UI from data

## Phase 1 (Demo)
- Fully generalize StackItem and use for all draggable items and containers.
  - Current draggable()
    - StackItem
    - ListItem (react-ui-list)
    - BoardCell (react-ui-board)
    - L0Menu
    - Frame/Tools (react-ui-canvas-editor)
    - Grid (experimental)
    - NOTE: StackItem.Content used everywhere?

- [ ] Container should track insertion point (Location)
- [ ] Test for different layouts (vertical, horizontal, grid)

- [ ] Generalize Stack as a container? / useStackDropForElements
  - [ ] IDEAL: Factor out DND guts
  - [ ] Create story
  - [ ] Generalize data for cell and container

- [ ] Nav + CTRL-C => CTRL-V to move.

## Phase 2 (Integration)
- [ ] Retro-fit react-ui-list (Search) + react-ui-board (BoardCell)
- [ ] Retro-fit react-ui-kanban
- [ ] Move all card chrome out of Kanban into Card surface.
- [ ] Context for menu actions?

## Phase 3 (Tech Debt)
- [ ] L0
- [ ] Fix card layout (conform to grid).
