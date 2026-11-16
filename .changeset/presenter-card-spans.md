---
'@dxos/plugin-presenter': minor
'@dxos/brand': patch
---

A grid's children name the tracks they cover as `colSpan`/`rowSpan`, as a table cell and CSS's `grid-column: span n` do; `cols`/`rows` now only ever mean the tracks a `<Grid>` lays down, so a count of tracks laid down never reads the same as a count of tracks covered.

Card art is cut to the card. `gen-card-art.mjs` writes one crop per mark per card width into `backgrounds/cards/`: each is the same height and centred on the mark, so a card spanning two columns fills its width without drawing its mark larger than its neighbours' — which `object-fit` cannot do, since it takes its scale from the box. The rays are run past the frame first, so the wider crop has no bare edge.

The brand's `icons/{white,black}` marks carry their own size instead of `width="100%"`, which left them with no intrinsic size and collapsed them to nothing wherever they were drawn as an `<img>`.
