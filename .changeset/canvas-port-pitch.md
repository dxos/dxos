---
'@dxos/react-ui-canvas': minor
---

A shape's ports stand on the grid's lines, where they stood at even fractions of each side: a whole number of half major cells apart about the side's middle, on whole lines where they can be and half lines otherwise, by the gap nearest the side's length over their count (`portPitch`). Breaking: `sidePorts` takes the frame's size, `nodePorts`, `latticeEnds` and `toDiagramObjects` take the drawing's grid, and `defaultPorts` is removed.
