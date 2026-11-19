---
'@dxos/react-ui-slides': minor
---

A slide `<Grid variant="flow">` draws an arrow in each gap between the cards of a row, for a progression of cards that are still a grid's: one size, with level headers, and titles a step smaller to suit the narrower cards. A click tag (`<v-clicks>`, `<v-click>`, `<v-after>`) written straight inside a `<Grid>` now reveals the grid's children in place, where before it put them in one box that took a single cell. A list nested in a `<List variant="flow">` card takes the card's size. A `<Grid>` that holds icon cards keeps its rows when it also holds a `<Box>`, a `<Cell>` or a card with no icon.
