---
'@dxos/react-ui-slides': minor
'@dxos/plugin-presenter': minor
---

A presentation can set a footer, drawn on every slide: a left, a center and a right part of inline slide markdown, edited beside the theme in the presentation's properties. The new `<SlideCurrentNo />` and `<SlidesTotal />` tags draw the slide's number and the number of slides, in the footer or anywhere in a slide, counting the slides that are presented. A slide's frontmatter `footer: false` leaves the footer off it; the `cover` and `end` layouts show none unless the slide says `footer: true`.
