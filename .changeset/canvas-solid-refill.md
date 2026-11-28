---
'@dxos/react-ui-canvas': patch
'@dxos/react-ui-canvas-editor': patch
---

Two fixes to the 3D Extrude drag. The face now stays under the pointer: its distance is where the pointer's ray meets the face's normal, where it was the drag's length scaled at the press, which ran ahead of the pointer as the face came towards a perspective camera. And a selected solid no longer flickers while a drag reshapes it, as an extrusion's preview does after an undo: the renderer puts its new triangles into the mesh it has, where it made a new mesh each move and lost the outline for a frame.
