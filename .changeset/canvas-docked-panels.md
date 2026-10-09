---
'@dxos/react-ui-canvas': minor
---

`SceneView` docks its properties and layers panels by default: a column beside the canvas (which narrows rather than sitting under them) holding an accordion with one section per panel, any number open, the column scrolling them together. A button in each panel's toolbar floats the panels back over the canvas, as before. The mode is the view's `panels` atom (`PanelMode`: `'docked'` | `'floating'`), so a host can set or persist it; `Properties` and `LayersPanel` take `docked` and `onDockedChange`.
