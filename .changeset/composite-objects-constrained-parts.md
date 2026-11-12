---
'@dxos/scene': minor
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
'@dxos/plugin-uml': minor
'@dxos/plugin-canvas': minor
'@dxos/plugin-markdown': patch
'@dxos/react-ui-form': patch
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

- The Hull tool drags a frame that takes the shapes inside it, and Enclose draws a hull round the selection. A hull's
  Hull property is `perimeter` (round the shapes) or `box` (the rectangle that bounds them); its frame follows
  whatever is inside it, moving it moves them, and it is styled as any shape is.
- A hull is stored as a group: an Instance with `hull` set over an anonymous composite of its shapes, as the Group
  command makes one. The 2D editor draws that group opened out, so a shape inside a hull is selected, moved and
  linked directly.
- On a lattice the border runs along the gutters, and an elbow link keeps to the side of it both its ends are on: a
  link between two shapes inside stays inside, one from outside crosses the border once, and one between two shapes
  outside goes round the hull.
- The lattice no longer snaps a composite's parts, which are placed about the composite's own centre.
- In the Views inspector a hull's shapes are rows under it, and a row dragged onto a hull, or beside a row of
  another hull or of none, moves its shape into, between or out of hulls.

The display panel's grid switch on a lattice scene can be turned off: pressing the option that is drawn (its cells,
or the grid) draws neither, as pressing dots or lines already did elsewhere. A lattice scene draws no grid when the
look has none.

A link's free end is drawn where it will land while it is dragged: on the port or node under the pointer, else on
the grid. An orthogonal link with a free end keeps its corner on one side of the line while that end is dragged,
rather than jumping across it at the diagonal.

An elbow link to an end on no port turns twice, halfway between its ends, on a lattice scene too, where it used to
follow the nearest gutter line. The Properties panel's Type field now changes how a link is drawn: it was refused by
the form and ignored by the edit behind it. A form field's error icon shows the error in a tooltip.

The Drawing section's Cell and Gutter are whole counts of grid cells: the lattice stored is the counts times the grid
size, so a new grid size rescales it. Turning the lattice off and on again brings back the lattice the drawing had.
A lattice that changes size keeps every shape on the cells it had, the shapes inside a hull included: the lattice mode
re-seats a layout's shapes when a `layout` intent writes a new lattice.

A hull has an `inset`: a whole number of grid cells its border is drawn inside its line. On a lattice the line is the
centre of the gutter, which the inset leaves clear, and a link inside the hull runs between the border and the shapes;
off a lattice the inset comes off the margin. A link outside an inset hull runs along the gutter's centre line, as it
would with no hull there. `fitHulls`, `hullOutline` and `enclose` take the grid pitch, and `gridPitch` is the one rule
for the pitch a drawing is on. The Properties panel shows a hull's border and inset side by side.

The default lattice's gutter is 8 by 8 grid cells (128 by 128 px, where it was 128 by 64). A drawing put on the
default lattice from now on takes the new one; a drawing already on a lattice keeps its own. plugin-canvas's
reference diagrams are drawn on it: their `.dx` sources name `grid=384x256`, and their compiled commands and SVG
renders are regenerated.

The Properties panel shows a shape selected inside a hull, where it showed nothing selected.

A double-click off an Object being edited leaves it. The Card tool's icon is `ph--article`.

A `diagram` fence in a markdown document draws as a diagram, in the editor's light or dark palette:
`SvgFile.toSvgFile` takes `{ theme, transparent }`, `diagramPreview()` follows the editor's colour mode, and
plugin-canvas contributes it to the markdown editor.
