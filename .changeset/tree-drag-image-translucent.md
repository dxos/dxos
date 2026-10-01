---
'@dxos/react-ui-list': patch
---

A tree row dragged from the hover state no longer carries its solid hover fill into the drag image. The fill is 25% opaque while the browser snapshots the row, so the drop indicator stays visible under the dragged item.
