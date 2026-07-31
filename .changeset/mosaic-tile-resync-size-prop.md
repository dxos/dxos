---
'@dxos/react-ui-mosaic': patch
---

Fix `Mosaic.Tile` not applying a `size` prop that arrives (or changes) after the first render — a tile mounted without a size (e.g. before a responsive breakpoint settles, or across a layout branch switch) now re-syncs to the prop instead of staying stuck at its initial extent.
