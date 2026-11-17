---
'@dxos/react-ui-slides': minor
'@dxos/plugin-presenter': minor
'@dxos/plugin-canvas': patch
---

The slide dialect and its renderer are a package of their own, `@dxos/react-ui-slides`: the markdown dialect (its frontmatter, its layouts and the `<Grid>`/`<Card>`/`<List>`/`<Box>` tags), the renderer, the theme, the 16:9 canvas, and the CodeMirror extensions that highlight and complete it. An embedded object stays the host's business — the renderer takes a `renderSurface` callback and knows nothing about Surfaces or refs — so a docs page, an export path or anything else can show a slide without a database.

What stays in `@dxos/plugin-presenter` is the presentation: `Slide.Root` and `Slide.Content` resolving refs, the deck, the gallery, the toolbars, and the plugin's own capabilities and operations. The line is what a second consumer would need rather than what happens to compile, so the deck chrome stays even though it carries no ECHO either.

Consumers of `@dxos/plugin-presenter/SlideTheme` take `@dxos/react-ui-slides` instead; the plugin's `#markdown` subpath is gone.
