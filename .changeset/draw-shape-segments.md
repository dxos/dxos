---
'@dxos/react-ui-canvas': minor
---

Draw shape (W) is a second tool in the Draw button's flyout (`NodeDef.fold`): it reads a stroke before it lands, and one drawn round a rectangle, an ellipse, a triangle or a diamond becomes that shape, squared up on the grid at the tool's size or the last such shape's when it is close. A stroke is read by the segments it was drawn in: where the hand rests is a corner, and each run between two corners is a straight line or a parabola, so a stroke that is no shape lands as a polyline of those segments, with nearly level or upright sides squared up and corners nearly in line aligned. A polyline's new `bends` name the segments that run as parabolas (`PolylineBend`), `NodeDef.freehand` is now `'stroke' | 'shape'`, and the `freehand` drag carries the `times` its points were sampled at.

A text node has a colour of its own in Properties, a grid of the nine style hues at three tones (`style.textHue`, `style.textTone`), and the icon picker offers the DXOS mark ahead of Phosphor's glyphs.

A Spline tool (U) draws a curve through points placed click by click: each segment is a cubic with two control points, shown with the vertices in the line's edit mode and dragged like them. A `PolylineBend` with a `second` control is a cubic; `smoothBends` makes the bends of a line through points, and a vertex put in on a bent segment, or taken out between two, keeps the curve.
