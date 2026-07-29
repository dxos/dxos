---
'@dxos/react-ui-masonry': minor
---

Masonry no longer flashes a bunched, overlapping stack on the initial render of a large set: unmeasured tiles now use an estimated height so the first layout is already spaced into columns, and the grid stays hidden until the layout settles before fading in (respecting `prefers-reduced-motion`). Reflow animation is limited to small add/remove edits — the initial render, bulk data swaps, and resizes snap instead of animating — and a new `animate` prop on `Masonry.Root` disables animation entirely.
