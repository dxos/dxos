---
'@dxos/scene': minor
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
'@dxos/plugin-uml': minor
'@dxos/plugin-canvas': minor
'@dxos/plugin-markdown': patch
---

Composite objects whose parts follow their frame, declared in the scene DSL.

A part of a composite can now say, per axis, which of its edges follow the frame
(`constrain` over `min | max | stretch | center | scale`), so an Object drawn at
another size lays itself out instead of scaling like a picture — a card's footer
stays on its floor and its body grows. A tool declares its shape as DSL source
(`composite <id> { element … }`) rather than painting it in a React view, and
every shape that tool draws is an Instance of one definition, so restyling any
of them reaches them all while each one's text stays its own.

A part may be `optional`: it is switched off for one Instance from the Properties
panel, the part naming it in `grow` takes its room, and a part that `follows`
another goes with it — so a card without a footer is the same Object as a card
with one, not a second definition. A part `bind`s to any field of the Instance,
not only text, so a card's glyph is its own typed `icon`. A `polyline` part
authors its vertices in the DSL (`points="0,0.5 1,0.5"`), as fractions of its own
frame, so a template can draw a rule that stretches with the shape it is in.

Double-clicking an Object now edits it where it stands: its parts become what the
editor acts on and the drawing around them fades, as 3D already did. Links gain
an `ortho` variant and the Properties panel a Variant selector (straight,
orthogonal, elbow, curve, spline).

The built-in Card and the UML class are composites themselves: each declares its
template and places an Instance of it, so its regions are parts in the Views tree,
edited in place, with the data still typed on the shape.
`@dxos/react-ui-canvas-editor` gains a `./testing` entry point so a plugin's own
kind can be rendered through the shared editor in a story.

Cards, text shapes and gestures also sit on the canvas's own grid:

- `card` and `icon` are built-in node types. A card is a glyph and a title, a body, and a footer over
  a hairline, each edited in place; an icon is any Phosphor glyph at any of its six weights. The
  `card` and `icon` prototypes remain for a contributed kind that paints a view of its own.
- A gesture lands on the finest grid level drawn rather than the major one, so a shape can be placed a
  cell from its neighbour and lands on the lines under the pointer. `SceneSnap.snapMinor` is gone:
  `snap` is that function now.
- A move draws the box it will land in, not only when the drop would be refused.
- The text node (`note`) draws no fill, border or radius of its own, and `padding` is a property of
  the two types that draw text in a box — the rectangle and the text node — defaulting to the minor
  grid cell it was hardcoded to.
- Default and minimum sizes are whole numbers of grid cells: a rectangle is 4 x 2 nominal units and a
  card 4 x 3, and an ellipse resizes down to a quarter unit.

Hulls: a border round a set of shapes, which a link's route respects.

- Enclose (on a selection, in the 2D editor) draws a `hull` round the selected shapes, which then name it as their
  `parent`; a hull's Hull property is `perimeter` (round the shapes) or `box` (the rectangle that bounds them), and
  its frame follows whatever is inside it.
- On a lattice the border runs along the gutters, and an elbow link keeps to the side of it both its ends are on: a
  link between two shapes inside stays inside, one from outside crosses the border once, and one between two shapes
  outside goes round the hull.

A `diagram` fence in a markdown document draws as a diagram, in the editor's light or dark palette:
`SvgFile.toSvgFile` takes `{ theme, transparent }`, `diagramPreview()` follows the editor's colour mode, and
plugin-canvas contributes it to the markdown editor.
