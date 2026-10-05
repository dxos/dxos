---
'@dxos/echo': patch
---

Every board column has the same underlined header, the uncategorized one included. `Board.Column.Header` now takes an optional drag handle and keeps the handle's space when there is none. A column's cards scroll in a gutter, so they clear the column's edges.
