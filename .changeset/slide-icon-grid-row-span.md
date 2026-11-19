---
'@dxos/react-ui-slides': patch
---

A slide `<Grid>` that holds icon cards keeps its rows when it also holds a `<Box>`, a `<Cell>` or a card with no icon: every child of the grid covers a whole row, where before such a child took half of one and the cards after it lost their level headers.
