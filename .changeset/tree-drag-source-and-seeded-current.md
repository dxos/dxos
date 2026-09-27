---
'@dxos/react-ui-list': minor
'@dxos/plugin-deck': patch
'@dxos/plugin-navtree': patch
---

`Tree` leaves the row being dragged in place at half opacity instead of removing it (`hideDragSource`
restores the old behaviour), and declares its drags a move so the cursor no longer flickers to a
copy "+" between rows. Navigating to a collection in the navtree highlights the collection rather
than the documents its deck opened in its place (`@dxos/plugin-deck/DeckSeed.sourceOf`), and
choosing one of those documents selects it (`NavTreeCapabilities.State.pick`). A flattened deck no longer
opens a collection's documents, which it showed as a breadcrumb trail of siblings; it shows the
collection itself.
