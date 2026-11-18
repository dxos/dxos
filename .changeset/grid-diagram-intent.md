---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': patch
---

Add `diagram kind=grid`, which lays a drawing out from structure alone: the diagram states one frame and its
tracks (`size=1600x880 cols="1fr 2fr 1fr"`), a `group` is a grid in the cell it was given, groups nest, and each
member takes the next cell in the order written. A group can size its unstated tracks (`autoRows=88`), say where
they sit (`alignContent=center`) and draw a frame (`border=true`); an empty group holds a cell. A `node` can name
a contributed component and carry its fields (`node calendar "Calendar" kind=card icon=calendar-blank`), and an
`edge` can end on a group or on a place of a component (`frame/nav`) and say how it runs (`path=line`). The
result is the same grid boxes a hand-placed drawing uses, so no coordinate is written and none is stored.

`Dsl.printIntent` reads that text back out of a drawing made of grid boxes. It returns the text or the reasons a
grid diagram cannot say the drawing, and it checks its own answer by lowering it and comparing what is drawn.

The drawing skill teaches the new kind, so an agent can write a slide this way. Diagnostics measure a box that a
grid places in the frame the grid gives it; they used to report every label in a grid as not fitting.

A Canvas drawing has a DSL companion beside its article: the drawing as text, as a grid diagram where it is one and
as boxes otherwise, editable, with Rebuild to redraw from the text. Where the host is read-only the text can be read
but not edited. A connector drawn with no arrowhead now reads
back with none; it used to come back with the default arrow.
