---
'@dxos/plugin-presenter': minor
---

Slide markdown takes a `flow` list variant, which lays its items out as a row of cards with an arrow in each gap, for a progression. The item's own markdown names its parts — emphasis is the label beside the counter, strong is the title, the rest is the body — and `<List variant="flow" active="3">` marks the item the story has reached. It composes with `<v-clicks>`: a build reveals the cards one at a time, each holding its place in the row, and an arrow waits for the card it points at.
