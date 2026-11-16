---
'@dxos/plugin-presenter': minor
'@dxos/brand': minor
---

The deck's title-slide artwork is a brand asset: `bg-dxos-glow.svg` is that slide exported from Figma as SVG, with its text dropped and a fractal-noise grain laid over it so the long dark ramp of its glow stops banding at 8 bits.

`<Box variant="title">` and `<Box variant="caption">` carry a title slide's two blocks — the name with the deck's links under it, and the brand lockup with the small print at the foot — on one start edge, at the measurements of the Figma slide they reproduce. The sixth cover story draws that slide, with the artwork as its background.
