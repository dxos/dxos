---
'@dxos/react-ui-canvas': minor
---

A shape's ports stand a whole number of minor grid units apart about each side's centre, where they stood at even fractions of the side: the side's length over one more than their count, rounded down to the unit (`portPitch`), less one more unit where an even count would otherwise stand between the grid's lines. Breaking: `sidePorts` takes the frame's size, `nodePorts`, `latticeEnds` and `toDiagramObjects` take the drawing's grid, and `defaultPorts` is removed.
