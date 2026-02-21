# Task Plan: Simplify Plugin UI Components

## Goal
Reduce custom className / raw-div layout in plugin-xxx components by relying on the react-ui-xxx component library; split into `src/components` (low-level) and `src/containers` (higher-level surfaces).

## Current Phase
Phase 4

## Phases

### Phase 1: Audit plugin-kanban
- [x] Identify raw divs + custom classNames in plugin-kanban
- **Status:** complete

### Phase 2: Extend react-ui-mosaic primitives
- [x] Add Board.Column.Grid primitive
- [x] Bake border classNames into Board.Column.Header and Board.Column.Footer
- [x] Add onAdd prop to Board.Column.Footer
- [x] Update DefaultBoardColumn to use BoardColumnGrid
- **Status:** complete

### Phase 3: Refactor plugin-kanban
- [x] Replace outer grid div with Board.Column.Grid
- [x] Replace footer div + IconButton with Board.Column.Footer
- [x] Remove redundant classNames from Board.Column.Header calls (kanban + pipeline)
- [x] Rename onAddCard/onRemoveCard → onCardAdd/onCardRemove
- [x] pnpm -w pre-ci passed (only pre-existing functions:compile failure)
- **Status:** complete

### Phase 4: Audit and refactor other plugins
- [ ] plugin-pipeline — raw grid div in PipelineColumn.tsx (2-row variant)
- **Status:** in_progress

### Phase 5: Lint & PR
- [ ] pnpm -w pre-ci
- [ ] Submit PR
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Planning files in plans/burdon/plugin-refactor/ | User preference |
| Start with plugin-kanban | Most contained, good reference case |
| Bake repeated classNames into primitives | All callers passed identical values |
| on{Noun}{Verb} prop naming | Consistency; matches handle{Noun}{Verb} local convention |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| react-ui-kanban has no source (dist only) | 1 | Focused on plugin-kanban src and react-ui-mosaic instead |
| functions:compile failure in build | 1 | Pre-existing deleted types on branch; restored with git checkout |
