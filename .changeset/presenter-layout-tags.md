---
'@dxos/plugin-presenter': minor
---

Slide markdown lays a slide out in tracks with three layout tags. `<Grid cols="4" rows="2">` lays down even tracks, `<Cell>` and `<Card>` span them with `cols`/`rows` of their own, and `<Card>` fills one with an image, a title and a line or two of markdown — `default` on the slide's own panel, `outline` in its accent, or `plain` with no surface at all. A variant's parts are now named by the tag they land on, so a variant styles any tag it holds rather than only the handful the list and table styles needed.
