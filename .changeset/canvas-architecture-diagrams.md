---
'@dxos/plugin-canvas': patch
'@dxos/react-ui-canvas': minor
'@dxos/diagram': patch
---

A laid-out illustrator diagram now draws on the canvas as it renders, on the canvas lattice. In `@dxos/plugin-canvas`, each connector binds to the boxes it runs between as a `smart` link carrying its caption as `text`, a group is a guide titled at its top-left corner on a `Backdrop` layer below the shapes, and the `Architecture` stories load multi-level Composer and EDGE architecture diagrams (`docs/diagrams/*.dx.svg`), each overview's boxes opening their own diagram as a frame.

In `@dxos/react-ui-canvas`, a link may carry `text`, drawn at the middle of its route on an opaque rounded backdrop. Guides and borderless captions are off the lattice: they occupy no cells, are moved and resized freely, and do not block gutter routes. A nested scene (a frame's contents, a drill-in in flight) routes on its parent's lattice, so its links no longer jump when it settles. On a lattice a smart link takes the side-centre ports whose gutter route bends least (a pinned port stays pinned), rather than the nearest pair, and the gutter search runs on a binary heap. A guide's text takes the default colour. A label's or note's lines are a whole number of minor grid units tall, measured from the frame's outer edge, with the text padded a grid unit either side.

In `@dxos/diagram`, a group frame's margin is the same on every side, its title inside the top margin, and a diagram with an explicit `grid` keeps every box on it: extra space between groups is whole cells.
