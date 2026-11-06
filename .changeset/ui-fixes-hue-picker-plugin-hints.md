---
'@dxos/react-ui': minor
'@dxos/react-ui-pickers': minor
'@dxos/plugin-space': patch
---

`ColorPicker.HueGrid` is a hue-only variant of the color picker whose value is a theme hue's name, and `HuePicker` now opens it in a popover, so every hue fits the grid and the reset button no longer covers a swatch; `HuePicker`'s `onReset` takes no event. `NumberInput` gains `stepper='start'` (the pair before the input), `stepper='split'` (decrement before the input, increment after), `stepperOnHover` (the stepper sits opposite the number and shows only while the row is hovered or focused), `align='end'` for right-aligned figures, and `slider`, a button that opens a slider over `min`..`max`. The space's Database section hides a type whose plugin is disabled (its objects stay reachable), and an object whose plugin is disabled offers a "Find plugin" button that opens the plugin registry filtered by its type. The dev-server variant of the "Composer Plugin" project template has its own id and label, so it no longer appears as a duplicate of plugin-projects' template.
