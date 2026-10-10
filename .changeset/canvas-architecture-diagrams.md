---
'@dxos/plugin-canvas': patch
'@dxos/react-ui-canvas': minor
'@dxos/diagram': patch
'@dxos/react-ui-form': patch
---

In `@dxos/react-ui-canvas`, a link may carry `text`, drawn at the middle of its route on an opaque rounded backdrop. Guides and borderless shapes are off the lattice: they occupy no cells, move and resize freely, and do not block gutter routes. A nested scene routes on its parent's lattice, so its links no longer jump when it settles. On a lattice a smart link takes the side-centre ports whose gutter route bends least (a pinned port stays pinned), and the gutter search runs on a binary heap. A label's or note's lines are a whole number of minor grid units tall, padded a grid unit either side, and a guide's text takes the default colour. `SceneView.Root`'s `readonly` now also prevents selection and hides the selection frame, ports, the actions bar, the Properties and Layers panels, the grid and the lattice guides.

In `@dxos/plugin-canvas`, a laid-out illustrator diagram draws on the canvas lattice as it renders: each connector binds to its boxes as a `smart` link carrying its caption as `text`, and a group is a guide titled at its top-left corner on a `Backdrop` layer below the shapes. A linked drawing's own frames open the drawings they show, so drawings nest to any depth. A frame's object resolves through the canvas's database, and its role field appears as soon as an object is picked. Read-only is the viewer's own, kept in the canvas's view state and toggled from the drawing's menu (Read only / Edit drawing). The `Architecture` stories load multi-level Composer and EDGE architecture diagrams (`docs/diagrams/*.dx.svg`), read-only by default.

In `@dxos/diagram`, a group frame's margin is the same on every side, with its title inside the top margin, and a diagram with an explicit `grid` keeps every box on it: extra space between groups is whole cells.

In `@dxos/react-ui-form`, picking a reference in `RefField` commits it, so an auto-saving form saves the pick at once rather than on the next field's edit.
