---
'@dxos/echo': patch
---

Layout fixes for board columns and dialog actions.

- **Board columns:** every column has the same underlined header, the uncategorized one included. `Board.Column.Header` takes an optional drag handle and keeps its space when there is none. A column's cards scroll in a gutter, so they clear the column's edges.
- **Dialog actions:** the object-create, import-pull-request and custom-token dialogs put their actions in `Dialog.Footer`, as every other dialog does, rather than in the scrolling body. An empty `Dialog.Footer` now collapses.
