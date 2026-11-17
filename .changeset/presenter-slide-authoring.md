---
'@dxos/plugin-presenter': minor
---

A slide DSL tag is editable in the slide editor. Tags that carried no attributes were atomic — the caret stepped over `<Box>` or `<v-clicks>` whole — which left no position at which to type the attribute that gives them their behaviour. Only `::slot::` markers stay atomic; a marker is a position and has nothing inside it to edit.

A slide chooses how its background picture meets it. `backgroundFit: contain` draws the whole picture rather than cropping whatever does not fit the slide's 16:9; `backgroundColor:` is the ground under it — what shows where a contained picture does not reach, through a transparent one, or on its own as the slide's background; and `backgroundBlend:` says how the two are composited. `screen` is the useful one, because artwork exported from a design tool carries its own backdrop and paints over anything beneath it: it composites that backdrop away, so the glow lands on the slide's color instead and a picture drawn on black is unchanged. All three are per-slide; a deck-wide background still belongs in the deck's theme.

A slide names its scrim: `scrim:` paints what is outside the slide — the inset void in the editor and the letterbox bands when presenting. The scrim belongs to the canvas, which the slide's own theme variables never reach, so the slide publishes the color up to it. Its default is now the theme's slide background everywhere; the editor's void used to take the deck surface instead, which read as a lighter frame around the slide. A deck sets one for every slide through the theme's new *Scrim color*.

The slide editor completes frontmatter keys, not just `layout:` values. Typing on a blank line in the block offers every key the slide takes, leaving out the ones already written, and a key whose values are a fixed set (`layout`, `theme`, `bleed`, `hide`, `backgroundFit`, `backgroundBlend`) offers those after the colon.

`SlideGrid` is `SlideGallery`, since it is the panel of slide thumbnails rather than anything to do with the `<Grid>` tag or the `slide-grid` element that tag renders, both of which keep their names.
