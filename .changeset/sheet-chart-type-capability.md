---
'@dxos/plugin-sheet': minor
---

Every chart type in the Charts companion is a `SheetCapabilities.ChartType` contribution: a type, a label, an icon and a component that draws the chart's range. The sheet contributes bar, pie, XY, scatter, heatmap, radar, map and timeline this way, and another plugin adds its own the same way. `Sheet.ChartType` is removed; a chart's `type` is a string naming a contribution.
