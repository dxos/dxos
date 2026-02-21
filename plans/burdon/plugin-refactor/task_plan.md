# Task Plan: Simplify Plugin UI Components

## Goal
Reduce custom className / raw-div layout in plugin-xxx components by relying on the react-ui-xxx component library; split into `src/components` (low-level) and `src/containers` (higher-level surfaces).

## Current Phase
Phase 1

## Phases

### Phase 1: Audit
- [x] Identify raw divs + custom classNames in plugin-kanban
- **Status:** complete

### Phase 2: Refactor react-ui-kanban (if needed)
- [ ] Determine if Board.Column wrappers should absorb the layout divs in KanbanColumn
- [ ] Add any missing primitives to react-ui-mosaic/react-ui-kanban
- **Status:** pending

### Phase 3: Refactor plugin-kanban
- [ ] Replace raw layout divs in KanbanColumn with react-ui-mosaic primitives
- [ ] Remove classNames props passed to Board.Column.Header
- [ ] Verify stories still work
- **Status:** pending

### Phase 4: Audit other plugins (plugin-table, plugin-sheet, etc.)
- [ ] Apply same pattern across other plugins
- **Status:** pending

### Phase 5: Lint & PR
- [ ] pnpm -w pre-ci
- [ ] Submit PR
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Planning files in plans/burdon/plugin-refactor/ | User preference |
| Start with plugin-kanban | Most contained, good reference case |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| react-ui-kanban has no source (dist only) | 1 | Focused on plugin-kanban src instead |
