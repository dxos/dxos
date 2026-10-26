---
'@dxos/react-ui': minor
'@dxos/plugin-presenter': minor
---

`Listbox.Root` takes `tileWidth: { min, max }`: items lay out as tiles between those widths, as many columns as fit at `min`, measured before the first paint and reflowing as the container resizes instead of stretching to a debounced column count; the arrow keys move by the columns on screen. The presenter's slide grid uses it, with a small/large toggle and captions from each slide's title or first heading; presenting scales the slide in the frame its container changes and fades in fullscreen once its size settles, and the pager follows the light/dark theme. The assistant's agent picker shows each model's vendor logo.
