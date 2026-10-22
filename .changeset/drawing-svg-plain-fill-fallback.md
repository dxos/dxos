---
'@dxos/diagram': patch
---

Exported diagram SVGs now render correctly outside browsers: tinted group frames and hollow markers carry plain-color fallbacks, so librsvg, sharp and ImageMagick no longer paint them solid black or see-through.
