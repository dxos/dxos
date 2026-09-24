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

`Architecture` restates the team's architecture review rules (dependency direction, state owned once,
one mechanism per concern, no pointless indirection, public surface only, bounded live state) for a
diagram's content, and `Architecture.judge` answers all of them in one batched `DecisionModel` call.
`Score` scorers now take a subject and requirements, a `Score.Batch` yields several scores from one
evaluation, and a scorer that cannot judge reports an `error` that `Score.overall` leaves out.

`View` renders a laid-out diagram as text for a judge that cannot read images: `View.coordinates`
(positions in grid cells), `View.ascii` (a character-grid drawing) and `View.rows` (boxes in reading
order, which way each arrow runs, and which arrows cross). `Architecture.Content` takes an optional
`layout` so a judge can be given one.
