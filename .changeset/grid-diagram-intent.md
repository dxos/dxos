---
'@dxos/diagram': minor
'@dxos/plugin-canvas': minor
---

A drawing can be written without a coordinate: `diagram kind=grid` lays it out from nested `group`s, `node`s and
`edge`s, and `DSL.printIntent` reads that text back out of a drawing. A drawing that uses contributed element kinds
or hand-routed connectors survives the text form: a box a component draws is written `custom <id> kind=<name>` with
the kind's own fields and rows (`item "…"`), a link keeps its markers, line style and bends, and a `grid` box places
or packs the boxes inside it. A Canvas drawing has a DSL companion that shows this text and rebuilds the drawing from
it.

Breaking: the namespace export `Dsl` is now `DSL`; a shape word with `kind=` is an error (write `custom`); the canvas
kind `space-graph` is named `graph`, and a stored node reads as it. plugin-canvas's `experimental` studio deck and
its element kinds are removed.

Fixes: a box a grid places is measured in the frame the grid gives it, a packed group places every member, a dotted
connector is drawn dotted, a connector with no arrowhead reads back with none, and a card's body starts under its
title. A slide is labelled by its front matter `title`, and `<Box variant="brand">` draws a product's mark over its
name.
