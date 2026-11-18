---
'@dxos/plugin-presenter': minor
---

A slide DSL tag is editable in the slide editor. Tags that carried no attributes were atomic — the caret stepped over `<Box>` or `<v-clicks>` whole — which left no position at which to type the attribute that gives them their behaviour. Only `::slot::` markers stay atomic; a marker is a position and has nothing inside it to edit.

A slide chooses how its background picture meets it. `backgroundFit: contain` draws the whole picture rather than cropping whatever does not fit the slide's 16:9; `backgroundColor:` is the ground under it — what shows where a contained picture does not reach, through a transparent one, or on its own as the slide's background; and `backgroundBlend:` says how the two are composited. `screen` is the useful one, because artwork exported from a design tool carries its own backdrop and paints over anything beneath it: it composites that backdrop away, so the glow lands on the slide's color instead and a picture drawn on black is unchanged. All three are per-slide; a deck-wide background still belongs in the deck's theme.

A slide names its scrim: `scrim:` paints what is outside the slide — the inset void in the editor and the letterbox bands when presenting. The scrim belongs to the canvas, which the slide's own theme variables never reach, so the slide publishes the color up to it. Its default is now the theme's slide background everywhere; the editor's void used to take the deck surface instead, which read as a lighter frame around the slide. A deck sets one for every slide through the theme's new _Scrim color_.

The slide editor completes frontmatter keys, not just `layout:` values. Typing on a blank line in the block offers every key the slide takes, leaving out the ones already written, and a key whose values are a fixed set (`layout`, `theme`, `bleed`, `hide`, `backgroundFit`, `backgroundBlend`) offers those after the colon.

The slide editor's toolbar carries the deck's own actions: the gallery the slide came from, and a button that adds a slide after the one being edited — the gallery's own button still adds one last, since there is no current slide there. Adding a slide was the gallery article's alone, as an inlined plus beside a layout caret; it is now one `AddSlideButton` both toolbars use, a joined run (`Button.Group compact`) whose caret is half a control wide so the pair reads as one control rather than two buttons.

The completion list stops at its ends rather than wrapping. The list is short and ordered, so coming round again reads as the selection jumping rather than as having run out. The keymap has to sit before `autocompletion`, which registers its own at the same (highest) precedence: at equal precedence the handler registered first is asked first.

The editor's preview no longer jumps as it moves between slides. The canvas scales itself to whatever it measures, and the preview is remounted inside a splitter on every slide, so its first measurement caught a height the container did not keep — one frame at the wrong scale, which read as the title jumping. Measured in the app: the slide painted 356px tall, then 316px a frame later. The first measurement now waits for the frame after layout; every one after it stays immediate, so resizing the grid or entering fullscreen is unchanged.

A slide and its text carry their type's name. A type is named by a translation block keyed by its typename, which `Presentation` had and `Slide` did not, so a slide with no title showed as `org.dxos.type.slide` wherever the label fell back to the type — the navtree and the debug tree among them. `Text` is named here too: it is an SDK type with no plugin of its own, so nothing named it at all.

`SlideGrid` is `SlideGallery`, since it is the panel of slide thumbnails rather than anything to do with the `<Grid>` tag or the `slide-grid` element that tag renders, both of which keep their names.
