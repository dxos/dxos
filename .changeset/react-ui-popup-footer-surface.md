---
'@dxos/react-ui': patch
---

A panel's header and footer inside a popup or a dialog take that surface rather than lifting off it. A header or footer is a bar, a step lighter than the plank it belongs to, which is right on a plank and wrong in a popover: the surface is already raised, so the lifted band read as a strip across the bottom rather than as part of the panel. The rename popover's Cancel and Save sat on one (measured `oklch(0.3195 0.001 190)` against the panel's `oklch(0.2945 0.001 190)`); they now share the popup's own.
