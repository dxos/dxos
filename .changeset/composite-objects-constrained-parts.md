---
'@dxos/scene': minor
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/react-ui-canvas-editor': minor
'@dxos/react-ui-canvas-compute': minor
'@dxos/plugin-uml': minor
'@dxos/plugin-canvas': minor
'@dxos/plugin-markdown': patch
'@dxos/react-ui': patch
'@dxos/react-ui-form': minor
'@dxos/ui-types': minor
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

plugin-canvas contributes its own extension tools through `CanvasCapabilities.NodeType`, the space graph first: one
ECHO space as a circle of objects on a hexagonal lattice, with its seed, spacing and hue as Properties. The tools
panel has two more groups after the shapes: `Containers` (the hull and the view) and `Extensions` (the card, and
every kind a plugin contributes unless it names a group of its own, so plugin-uml's class is there too);
react-ui-canvas exports `CONTAINERS_GROUP` and `EXTENSIONS_GROUP`.

An extension kind keeps its own fields under its element's `data`, not at the element's top
(`Schema.Struct({ ...Scene.Element2D.fields, type, data: Schema.Struct({ … }) })`), so a kind's field never meets the
base's or another kind's; `Scene.BaseElement` gains the `data` slot. The engine's node carries the same `data`: a
view reads it with `kindData(schema, node)`, a part or a bind names a field as `data.<field>`, and the Properties
panel shows it last, as a group labelled `Custom`. `kindNodeDef` refuses a kind that declares a field of its own at the
top, unless it extends a core prototype whose frame reads fields there (a card's `icon`, `body`, `footer`).
`KindRegistry` gains `dataFields(type)` and `normalize(element)`. **Migration:** move a kind's own fields into
`data` in its schema, its `create`, its view, and its `parts` / `fields` / template `bind` names. A stored element
with the fields at its top is read as before and written back under `data` on its next edit. plugin-uml's class
keeps `attributes` and `methods` in `data`.

Conductor's compute shapes follow the same rule in a board's stored shape, its scene element and the engine's node:
the compute `node` id and each shape's own fields (a constant's `value`, a template's `valueType`, a random number's
`min` and `max`, a trigger's `functionTrigger`) are under `data`. **Migration:** pass a shape's own fields to its
factory under `data` (`createConstant({ data: { value } })`) and read them from `shape.data`; a board stored with
the fields beside the shape's own opens as before and is rewritten on its next edit.

The space graph's Properties are two to a row; Population is Node density, and Base dots (off unless turned on) draws
the lattice points that hold no object.

A form field with no value shows the default its schema declares (Effect's `default` annotation,
`Schema.Number.annotate({ default: 26 })`) as its value. Showing it writes nothing: the form holds no value for the
field until it is edited. The space graph declares its defaults this way, so the Properties panel and the drawing
agree on an unset field.

The Properties panel shows a shape selected inside a hull, where it showed nothing selected.

A switch or checkbox keeps its visually hidden input inside itself (`position: relative` on `.dx-switch` and
`.dx-checkbox`): in a scrolling form the input was left behind, and focusing it scrolled a clipped ancestor, which took
the Properties panel out of view when a toggle far down it was pressed. The Properties panel shows Fill and Border as
a shape draws them, so a type that draws all it shows (text, an icon) reads off until one is asked for. A node type
may be an `outline` (`NodeDefSpec.outline`): its border is the frame's and is on, with no fill unless asked for one.
Being part of the drawing, an outline keeps its colour while the node is selected or hovered; the selection frame
alone marks it. The space graph is one, so its ring is its Border, and turning it off or on moves nothing inside it.
A vector field's stack no longer asks a plain fieldset for a gutter, which logged a warning.

`@dxos/ui-types/phosphor` exports `phosphorIcons`, the name of every regular Phosphor glyph. It is an entry of its
own rather than part of the package's index, and `iconOptions()` imports it when a picker first asks, so the
catalogue is not downloaded with the app.

A double-click off an Object being edited leaves it. The Card tool's icon is `ph--article`.

A `diagram` fence in a markdown document draws as a diagram, in the editor's light or dark palette:
`SvgFile.toSvgFile` takes `{ theme, transparent }`, `diagramPreview()` follows the editor's colour mode, and
plugin-canvas contributes it to the markdown editor.
