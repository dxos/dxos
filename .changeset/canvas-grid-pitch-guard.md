---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-canvas': patch
'@dxos/scene': patch
---

A drawing's `grid` pitch must be at least one: snapping divides by it, so a layout patch storing zero or a
negative pitch would have put every drop and nudge at `NaN`. A restack also keeps an element whose id is
`__proto__`, which an object literal would have dropped from the edit.
