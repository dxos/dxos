---
'@dxos/react-ui-slides': minor
'@dxos/plugin-brain': patch
---

Slides: `<Grid variant="flow">` joins the cards of a row with arrows, with card titles a step smaller, and a click tag (`<v-clicks>`, `<v-click>`, `<v-after>`) written straight inside a `<Grid>` reveals the grid's children in place, where before they stacked in a single cell. A `<Grid>` of icon cards keeps its rows beside a `<Box>`, a `<Cell>` or a card with no icon; a list nested in a `<List variant="flow">` card takes the card's size; and `<Box variant="title">` sets its name in Poiret One whatever font the deck picked, as `variant="brand"` does. The brain plugin's Facts panel no longer raises an unhandled rejection when the client shuts down during a read.
