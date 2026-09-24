---
'@dxos/react-ui-canvas': patch
---

`toDiagramObjects` converts a scene-engine scene into `@dxos/diagram` world objects, so
`Diagnostics.analyze` and `Objective.evaluate` can grade a scene a person is editing, and
`diagnosticElements` maps a diagnostic's refs back onto scene element ids.
