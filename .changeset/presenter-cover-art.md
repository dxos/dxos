---
'@dxos/plugin-presenter': minor
'@dxos/brand': minor
---

The deck's title-slide artwork is a brand asset: `bg-dxos-glow.svg` draws the mark as a lit volume and `bg-dxos-glow-mask.svg` is the blurred shape that shades it, both exported from the Figma slide they were designed on.

`<Box variant="art">` carries artwork that is the slide rather than a backdrop: held to the end edge at full strength, running past it so the slide crops it, and out of the flow so the words are laid out as though it were not there. A sixth cover story draws the deck's own title slide with it.

`<Box variant="title">` sets a title slide's name large in the slide's foreground, which leaves the accent free for the links under it.
