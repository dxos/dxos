---
'@dxos/diagram': minor
'@dxos/react-ui-canvas': minor
'@dxos/scene': minor
---

An arrow states its own bends, so a routed connector can be written down. `arrow link a -> b via 10,20 30,20`
gives the connector the route it runs; `Shape.Arrow` carries it, and `SceneHandler` maps it both ways. Before
this, a connector routed by hand or by a layout kept its route on the record alone: printing the drawing lost it
and the connector snapped back to a straight run between its ends — 14 connectors and 66 bends across the studio
deck.

The whole route is written, ends included, rather than the bends alone. The ends are attachment points on each
shape's outline, and re-deriving them is the canvas routing the connector itself, which is exactly what a stored
route exists to override. A link with no route is still left to the canvas, which attaches at its own ports.

An arrow routes through points: a grid cell or a half-given coordinate, which a semantic edge's waypoints allow
because an engine routes them, is reported rather than half-read.
