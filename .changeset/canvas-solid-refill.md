---
'@dxos/react-ui-canvas': patch
---

A selected solid no longer flickers while a drag reshapes it, as an extrusion's preview does after an undo: its outline dropped out for a frame on each move. The 3D renderer now puts a solid's new triangles into the mesh it has, where it made a new mesh and material each time.
