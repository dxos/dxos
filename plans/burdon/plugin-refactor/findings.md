# Plugin UI Refactor — Session Notes

## Goal
Simplify plugin UI components by pushing layout/styling into `react-ui-xxx` primitives.
Plugins should contain minimal raw `<div className=...>` usage.

## Rules

1. **Split plugin structure** — `src/components/` (low-level, reusable) and `src/containers/` (high-level, wired to Echo/surfaces).
2. **No @dxos/app-framework hooks in plugin components** — factor out usage of hooks into surface containers.
3. **No raw layout divs in plugins** — use primitives from `react-ui-xxx` instead.
4. **No className on primitive components** — if every caller passes the same classNames, bake them in.
5. **Stories are exempt** — wrapper divs in `.stories.tsx` are acceptable.
6. **Handler naming convention** — `on{Noun}{Verb}` for props (e.g. `onCardAdd`, `onCardRemove`); `handle{Noun}{Verb}` for local callbacks (e.g. `handleCardAdd`).

## What We Did in plugin-kanban

### Audit
Scanned all `.tsx` files in `plugin-kanban` for raw `<div className=...>` and custom `classNames` props.
Only `KanbanColumn.tsx` had issues.

### react-ui-mosaic changes (`Board/Column.tsx`)
- Added `Board.Column.Grid` — encapsulates the `group/column grid bs-full overflow-hidden` wrapper div; callers pass grid-rows via `classNames`.
- Baked `border-be border-separator` into `Board.Column.Header` (all callers passed it).
- Baked `border-bs border-separator` + `rounded-b-sm` into `Board.Column.Footer`.
- Added `onAdd` prop to `Board.Column.Footer` — falls back to `model.onItemCreate` when not provided.
- Updated `DefaultBoardColumn` to use `BoardColumnGrid`.
- Exported `Grid` from the `BoardColumn` namespace.

### plugin-kanban changes (`KanbanColumn.tsx`)
- Replaced outer grid div → `<Board.Column.Grid classNames='grid-rows-...'>`
- Removed `classNames='border-be border-separator'` from `Board.Column.Header`.
- Replaced footer div + `IconButton` → `<Board.Column.Footer onAdd={...}>`.
- Removed unused `IconButton`, `useTranslation`, `meta` imports.

### plugin-pipeline side-effect (`PipelineColumn.tsx`)
- Removed now-redundant `classNames='border-be border-separator'` from `Board.Column.Header`.

### Prop rename (KanbanBoard.tsx / KanbanContainer.tsx)
- `onAddCard` → `onCardAdd`, `onRemoveCard` → `onCardRemove` (props)
- `handleAddCard` → `handleCardAdd`, `handleRemoveCard` → `handleCardRemove` (locals)

## Remaining Issue in plugin-kanban
- Uncategorized column header is still a raw `<div className='border-be border-separator p-2'>` — it can't use `Board.Column.Header` because it has no drag handle. Low priority.

## Process for Next Plugin

1. **Find all `.tsx` files** in `packages/plugins/plugin-xxx/src/`.
2. **Search for**: `className=`, `classNames=` on raw `<div>`/`<span>`, and `classNames` props passed to primitives.
3. **Check the corresponding `react-ui-xxx` package** for existing primitives before adding new ones.
4. **If multiple callers pass the same classNames** to a primitive → bake them in.
5. **If a layout pattern recurs** across plugins → extract it into a new primitive in `react-ui-xxx`.
6. Run `tsc --noEmit` in the plugin package to verify after each change.
7. Run `pnpm -w pre-ci` at the end.

## Candidate Plugins
- `plugin-pipeline` — still has raw grid div in `PipelineColumn.tsx` (2-row variant).
- Others: `plugin-table`, `plugin-sheet`, `plugin-thread`, etc.
