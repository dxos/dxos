---
'@dxos/react-ui': minor
'@dxos/plugin-space': patch
---

`ColorPicker.HueGrid` is a hue-only variant of the color picker whose value is a theme hue's name, and `HuePicker` now opens it in a popover, so every hue fits the grid and the reset button no longer covers a swatch; `HuePicker`'s `onReset` takes no event. The space's Database section no longer lists a type whose plugin is disabled, and an object whose plugin is disabled offers a "Find plugin" button that opens the plugin registry filtered by its type. The dev-server variant of the "Composer Plugin" project template has its own id and label, so it no longer appears as a duplicate of plugin-projects' template.
