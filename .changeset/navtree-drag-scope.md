---
'@dxos/react-ui-list': patch
'@dxos/plugin-navtree': patch
---

Restore drag and drop in the navtree. Scoping each monitor to its own tree assumed one `Tree` per monitor, but the navtree mounts one per workspace tab, so its rows carried a per-tab id while the monitor watched for the graph root and claimed nothing: reordering and dropping into a collection both silently did nothing.

`Tree` now takes `treeId`, the drag scope, defaulting to `id`. Sibling trees served by one monitor pass the same value, and the navtree's panels and its monitor both reference one `NAV_TREE_DRAG_SCOPE` constant so they cannot drift apart again.
