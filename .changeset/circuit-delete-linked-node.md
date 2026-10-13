---
'@dxos/react-ui': patch
---

Fixed: deleting a linked node from a conductor circuit crashed the plank with `invariant violation: node not found`. A delete removes the compute node before its shape, and the scene re-derived the shape's ports in between; a shape whose compute node is gone now keeps its definition's ports.
