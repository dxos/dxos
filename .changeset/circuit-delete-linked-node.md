---
'@dxos/react-ui': patch
---

Fixed: deleting a linked node from a conductor circuit crashed the plank with `invariant violation: node not found`. A delete removes the compute node before its shape, and the scene re-derived the shape's ports in between; a shape whose compute node is gone (mid-delete, after a peer's delete, or left by the earlier crash) now keeps its definition's ports, shows its type as a placeholder instead of mounting its live component, and can still be deleted.

Fixed: adding a node to a conductor circuit logged `No compute function for node type: switch` and reset every switch. The circuit built a new graph controller on every edit (it keyed on the graph's snapshot), which dropped the switches' values and reran the whole graph; it now keeps one controller per graph object.
