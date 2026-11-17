---
'@dxos/plugin-presenter': minor
---

A slide DSL tag is editable in the slide editor. Tags that carried no attributes were atomic — the caret stepped over `<Box>` or `<v-clicks>` whole — which left no position at which to type the attribute that gives them their behaviour. Only `::slot::` markers stay atomic; a marker is a position and has nothing inside it to edit.

A slide chooses how its background picture meets it. `backgroundFit: contain` draws the whole picture rather than cropping whatever does not fit the slide's 16:9; `backgroundColor:` is the ground under it — what shows where a contained picture does not reach, through a transparent one, or on its own as the slide's background; and `backgroundBlend:` says how the two are composited. `screen` is the useful one, because artwork exported from a design tool carries its own backdrop and paints over anything beneath it: it composites that backdrop away, so the glow lands on the slide's color instead and a picture drawn on black is unchanged. All three are per-slide; a deck-wide background still belongs in the deck's theme.

`SlideGrid` is `SlideGallery`, since it is the panel of slide thumbnails rather than anything to do with the `<Grid>` tag or the `slide-grid` element that tag renders, both of which keep their names.
