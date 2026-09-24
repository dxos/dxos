---
'@dxos/diagram': minor
---

`Score` normalizes layout heuristics onto one 0–1 scale (1 is good), so different kinds of judge read
as one list: `Score.fromObjective` turns an objective's constraints into pass/fail scorers (1 or 0) and
its cost terms into scores through `Score.fromCost` (0.5 at one crossing's worth of cost), and
`Score.overall` gates the mean of the non-constraint scores by the worst constraint. A scorer's kind is
open and it may resolve asynchronously, so other judges can join the same list.

`@dxos/react-ui-canvas/scene` adds `toDiagramObjects`, which converts a scene-engine scene into diagram
world objects so these scores can grade a scene a person is editing, and `diagnosticElements`, which maps
a diagnostic's refs back to scene element ids.
