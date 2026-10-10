---
'@dxos/plugin-canvas': patch
---

A laid-out illustrator diagram now draws on the canvas as it renders: each connector binds to the boxes it runs between (a routed one keeps its bends as a spline, with its relation's end markers and dash), a group is a faint dashed backdrop, and a caption is a bare label sized to its text. The `Architecture` stories load multi-level Composer and EDGE architecture diagrams (`docs/diagrams/*.dx.svg`), each overview's boxes opening their own diagram as a frame.
