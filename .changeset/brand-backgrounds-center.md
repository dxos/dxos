---
'@dxos/brand': minor
---

Every background mark now comes with its icon on the left, in the centre and on the right (`bg-<name>-center.svg`), and PLEX and TILE join the set, with icons of their own in `assets/icons` (`plex.svg`, `tile.svg`, and the black and white variants). A background's lines take the drawing's text color where `--dx-bg-lines` is not set, with the mark's own color as the default, so `color` on the `<svg>` recolors them. `scripts/flip-backgrounds.mjs` is now `scripts/place-backgrounds.mjs` and writes the other two placements from the one that was edited.
