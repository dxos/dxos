---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': patch
'@dxos/react-ui-slides': patch
'@dxos/plugin-presenter': patch
---

Add `diagram kind=grid`, which lays a drawing out from structure alone: the diagram states one frame and its
tracks (`size=1600x880 cols="1fr 2fr 1fr"`), a `group` is a grid in the cell it was given, groups nest, and each
member takes the next cell in the order written. A group can size its unstated tracks (`autoRows=88`), say where
they sit (`alignContent=center`), draw a frame (`border=true`) or pack its members as circles (`layout=pack`); an
empty group holds a cell. A `node` can name a contributed component and carry its fields
(`node calendar "Calendar" kind=card icon=calendar-blank`), and state the size it keeps in its cell
(`width=240 height=48`), and list a component's rows in braces
(`node types kind=card { item "Effect Schema" }`). An `edge` can end on a group or on a place of a component (`frame/nav`) and say how it
runs (`path=line`). No coordinate is written and none is stored.

`DSL.printIntent` reads that text back out of a drawing made of grid boxes. It returns the text or the reasons a
grid diagram cannot say the drawing, and it checks its own answer by lowering it and comparing what is drawn. A
Canvas drawing has a DSL companion beside its article that shows this text, lets it be edited, and rebuilds the
drawing from it; where the host is read-only the text can be read but not edited.

A drawing that uses contributed element kinds, or connectors someone routed, survives being written as text and
read back. A box a component draws is written `custom <id> kind=<name>` and carries the kind's own fields
(`tone=event variant=simple`); a field whose name an element attribute already claims is written `data-fill=0.55`,
and a shape word with `kind=` is an error. A link keeps its markers and line style, an arrow states its bends
(`arrow link a -> b via 10,20 30,20`), and a box keeps its style (`border`, `align`, `valign`, `fontSize`). A `grid`
box places the boxes inside its braces, modelled on CSS grid (`cols`, `rows`, `gap`, `padding`, `autoCols`,
`autoRows`, `justifyContent`, `alignContent`), or packs them as circles (`layout=pack` with `packSeed`, `packMin`,
`packMax`). Rebuilding a drawing from its text clears the records the text manages first, and a read-only canvas
draws no grid.

The space graph's element kind is named `graph`, and a node stored as `space-graph` reads as it.

Breaking: the language's namespace is exported as `DSL` (`import { DSL } from '@dxos/diagram'`); `Dsl` is gone.

plugin-canvas's `experimental` folder, which held the studio deck's diagrams, is removed.

Fixes: diagnostics measure a box a grid places in the frame the grid gives it; they used to report every label in
a grid as not fitting. A packed group places every member; it used to leave some at the origin. A connector with
`stroke=dotted` is drawn dotted on a canvas, and one drawn with no arrowhead reads back with none. A card's body
and footer start under its title.

Slides: a slide is labelled by its front matter `title`, then by its first heading. `<Box variant="brand">` draws a
product's mark over its name, centred, with the name in the brand's display face whatever font the deck picked. The
arrows between the cards of a `<List variant="flow">` sit midway between them.
