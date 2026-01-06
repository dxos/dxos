# Universal DND

## Ideas
- Generate UI from data

## Ontology
- ECHO Graph (incl. Stacks)
  - Views/Collections
    - App Graph
      - Blocks (Layout + Stack, Grid, Tree, List, Document, Canvas)
      - NavTree as hierarchical View?

## Next
- Demo Kanban like Mosaic/Focus
  - Factor out aspects from Stack (Drag and drop, Focus, Key nav, etc.)
  - Factor out Toolbar/Main from StackContent (across all plugins)
  - Remove all className overrides from storybook

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

- [ ] Show bottom placeholder if none active for container.
  - [ ] Migrate Grid.stories (multiple containers, text document, etc.) Then delete and land.
  - [ ] Factor out handler utils (e.g., splice).
  - [ ] Key nav (as with Grid story).

- [ ] Container should track insertion point (Location)
- [ ] Test for different layouts (vertical, horizontal, grid)

- [ ] Generalize Stack as a container? / useStackDropForElements
  - [ ] IDEAL: Factor out DND guts
  - [ ] Create story
  - [ ] Generalize data for cell and container

## Phase 2 (Integration)
- [ ] Retro-fit react-ui-list (Search) + react-ui-board (BoardCell)
- [ ] Retro-fit react-ui-kanban
- [ ] Move all card chrome out of Kanban into Card surface.
- [ ] Context for menu actions?

## Phase 3 (Tech Debt)
- [ ] Nav + CTRL-C => CTRL-V to move.
- [ ] L0
- [ ] Fix card layout (conform to grid).
