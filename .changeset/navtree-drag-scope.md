---
'@dxos/react-ui-list': patch
---

Restore drag and drop in the navtree. A tree item's `treeId`, the scope a pragmatic-dnd monitor claims its own drags by, was the tree's own `id`. That holds only when a monitor serves exactly one `Tree`; the navtree mounts one per workspace tab, so its rows carried a per-tab id, the monitor watching for the graph root claimed nothing, and reordering a collection and dropping an object into one both silently did nothing.

The scope is now the root of the tree's path, so trees sharing a path root are one drag scope. Both existing monitors were already written against that value and are unchanged.

A drop target now also rejects sources from another tree. A monitor scoping the drags it claims is only half of it: rows and the append strip accepted any source, so a navtree row dropped on a task list was read by the navtree's monitor as a graph node.
