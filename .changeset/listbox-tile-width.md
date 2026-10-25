---
'@dxos/react-ui': minor
---

`Listbox.Root` takes `tileWidth: { min, max }`: items lay out as tiles between those widths, as many columns as fit at `min`, reflowing as the container resizes instead of stretching to a debounced column count; the arrow keys move by the columns on screen. The presenter's slide grid uses it, with a small/large thumbnail toggle and captions from each slide's title or first heading.
