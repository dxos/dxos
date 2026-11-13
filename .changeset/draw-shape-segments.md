---
'@dxos/react-ui-canvas': minor
---

Draw shape reads a stroke by the segments it was drawn in: where the hand rests is a corner, and each run between two corners is a straight line or a parabola. A stroke that is no shape lands as a polyline of those segments, on the grid, with nearly level or upright sides squared up and corners nearly in line aligned. A polyline's new `bends` name the segments that run as parabolas (`PolylineBend`); `readStroke` and `strokePauses` are exported, and the `freehand` drag carries the `times` its points were sampled at.
