---
'@dxos/react-ui-list': minor
'@dxos/plugin-deck': patch
'@dxos/plugin-navtree': patch
---

`Tree` leaves the row being dragged in place at half opacity instead of removing it; `hideDragSource`
restores the old behaviour. Navigating to a collection in the navtree now highlights the collection
rather than the documents its deck opened in its place: `@dxos/plugin-deck/DeckSeed` exposes
`sourceOf`, which recognises a deck that is exactly a node's seeded children.
