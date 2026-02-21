# Findings: plugin-kanban className / div audit

## Package structure (current state)
- `plugin-kanban` already has `src/components/` and `src/containers/` split — good.
- `react-ui-kanban` has no source (dist only); Board primitives live in `react-ui-mosaic`.

## File-by-file analysis

### KanbanColumn.tsx — MOST issues

| Line | Element | className | Issue |
|------|---------|-----------|-------|
| 50-54 | `<div role='none'>` | `group/column grid bs-full overflow-hidden grid-rows-[var(--rail-action)_1fr_var(--rail-action)]` | Layout wrapper; should be a Board.Column primitive |
| 56 | `<div>` (uncategorized header) | `border-be border-separator p-2` | Mimics Board.Column.Header styling without using it |
| 62 | `<Board.Column.Header>` | `classNames='border-be border-separator'` | Passes layout classNames into a ui component |
| 72-76 | `<div role='none'>` (add card footer) | `rounded-b-sm border-bs border-separator p-1` | Footer area; should be a Board.Column.Footer primitive |

### KanbanBoard.tsx — clean
No raw divs with classNames outside stories.

### KanbanCardTile.tsx — clean
Uses Card.* primitives throughout.

### KanbanContainer.tsx — clean
Uses Layout.Main; no raw divs.

### KanbanViewEditor.tsx — clean
Uses Form.Root / Form.FieldSet; no raw divs.

### KanbanBoard.stories.tsx — excluded (story file)
`<div className='fixed inset-0 flex flex-col overflow-hidden'>` — acceptable in stories.

## Summary
The only file requiring attention is `KanbanColumn.tsx`. Issues centre on:
1. The outer wrapper grid div that structures header / body / footer rows.
2. The uncategorized-header div that duplicates Board.Column.Header styling.
3. The add-card footer div.

Proposed fix: add `Board.Column.Footer` (or similar) to react-ui-mosaic so the wrapper and footer can be expressed as primitives rather than raw divs. Alternatively, check whether `Board.Column.Root` already supports a slot-based layout.
