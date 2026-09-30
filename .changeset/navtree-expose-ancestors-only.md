---
'@dxos/plugin-navtree': patch
---

Opening an item from the navtree no longer expands it. `Expose` now opens only the item's
ancestors, as its spec says. It used to open the item's own row as well, so selecting a project
also showed its children. The chevron, `Space` and option-click still expand a row.
