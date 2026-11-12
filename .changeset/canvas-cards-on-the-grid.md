---
'@dxos/react-ui-canvas': minor
---

Cards, text shapes and gestures sit on the canvas's own grid.

- `card` and `icon` are built-in node types, built on new `card` and `icon` prototypes a contributed
  kind may extend. A card is a glyph and a title, a body, and a footer over a hairline, each edited in
  place; an icon is any Phosphor glyph at any of its six weights.
- A gesture lands on the finest grid level drawn rather than the major one, so a shape can be placed a
  cell from its neighbour and lands on the lines under the pointer. `SceneSnap.snapMinor` is gone:
  `snap` is that function now.
- A move draws the box it will land in, not only when the drop would be refused.
- The text node (`note`) draws no fill, border or radius of its own, and `padding` is a property of
  the two types that draw text in a box — the rectangle and the text node — defaulting to the minor
  grid cell it was hardcoded to.
- Default and minimum sizes are whole numbers of grid cells: a rectangle is 4 x 2 nominal units and a
  card 4 x 3, and an ellipse resizes down to a quarter unit.
