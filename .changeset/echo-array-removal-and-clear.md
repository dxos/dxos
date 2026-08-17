---
'@dxos/react-ui-mosaic': patch
---

Fix drag-and-drop losing an item. Reordering within a board column destroyed the dragged item, and moving a kanban card to the uncategorized column did nothing: both re-entered the ECHO array or property in a form its schema rejects, after the removal had already committed. The board now reads an element before removing it, and the kanban pivot field is cleared by deleting it rather than assigning `undefined`.
