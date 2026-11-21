# @dxos/react-ui-slides

## 0.18.0

### Minor Changes

- 29101e4: A presentation can set a footer, drawn on every slide: a left, a center and a right part of inline slide markdown, edited beside the theme in the presentation's properties. The new `<SlideCurrentNo />` and `<SlidesTotal />` tags draw the slide's number and the number of slides, in the footer or anywhere in a slide, counting the slides that are presented. A slide's frontmatter `footer: false` leaves the footer off it; the `cover` and `end` layouts show none unless the slide says `footer: true`.

### Patch Changes

- Updated dependencies [b11bcdc]
- Updated dependencies [5a43453]
- Updated dependencies [0d5f1c0]
  - @dxos/react-ui@0.18.0
  - @dxos/react-ui-editor@0.18.0
  - @dxos/react-ui-syntax-highlighter@0.18.0
  - @dxos/keys@0.18.0
  - @dxos/log@0.18.0
  - @dxos/ui-editor@0.18.0
  - @dxos/ui-theme@0.18.0

## 0.17.0

### Minor Changes

- 120e49f: The slide dialect and its renderer are a package of their own, `@dxos/react-ui-slides`: the markdown dialect (its frontmatter, its layouts and the `<Grid>`/`<Card>`/`<List>`/`<Box>` tags), the renderer, the theme, the 16:9 canvas, and the CodeMirror extensions that highlight and complete it. An embedded object stays the host's business — the renderer takes a `renderSurface` callback and knows nothing about Surfaces or refs — so a docs page, an export path or anything else can show a slide without a database.

  What stays in `@dxos/plugin-presenter` is the presentation: `Slide.Root` and `Slide.Content` resolving refs, the deck, the gallery, the toolbars, and the plugin's own capabilities and operations. The line is what a second consumer would need rather than what happens to compile, so the deck chrome stays even though it carries no ECHO either.

  Consumers of `@dxos/plugin-presenter/SlideTheme` take `@dxos/react-ui-slides` instead; the plugin's `#markdown` subpath is gone.

  The package publishes publicly, bootstrapped on npm with `publish-all.yml` as its trusted publisher, so a consumer outside this repo can depend on it.

- 120dc6c: A slide `<Card>` takes an `icon`: a Phosphor glyph that stands with the card's title as one header, in the card's `tone`, over bullets sized for the card; the icon cards of a grid row start their bullets level. `<Grid align>` (`start`, `center`, `end`) gives a grid the height of what it holds in place of filling the slide.
- 89ad65c: Slides: `<Grid variant="flow">` joins the cards of a row with arrows, with card titles a step smaller, and a click tag (`<v-clicks>`, `<v-click>`, `<v-after>`) written straight inside a `<Grid>` reveals the grid's children in place, where before they stacked in a single cell. A `<Grid>` of icon cards keeps its rows beside a `<Box>`, a `<Cell>` or a card with no icon; a list nested in a `<List variant="flow">` card takes the card's size; and `<Box variant="title">` sets its name in Poiret One whatever font the deck picked, as `variant="brand"` does. The brain plugin's Facts panel no longer raises an unhandled rejection when the client shuts down during a read.
- 259e674: A deck's theme can color its headings apart from the accent: `heading` for the first level and `subheading` for the second and third, each falling back to the accent when unset. The presentation's theme form shows both.

### Patch Changes

- Updated dependencies [cb058b9]
- Updated dependencies [73ed632]
- Updated dependencies [df16fba]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [f37ae92]
- Updated dependencies [3aef671]
- Updated dependencies [2176f79]
- Updated dependencies [9d66bcd]
- Updated dependencies [17a9e75]
- Updated dependencies [09d8716]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [80818bc]
- Updated dependencies [4fe25ee]
- Updated dependencies [0ad95b7]
- Updated dependencies [7da5d17]
- Updated dependencies [4be51c3]
- Updated dependencies [ca2a4a8]
- Updated dependencies [b8e76f9]
- Updated dependencies [3d22d48]
- Updated dependencies [7e07e49]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [a8e68c5]
- Updated dependencies [9f2cacf]
- Updated dependencies [9864a15]
- Updated dependencies [d00cc85]
- Updated dependencies [768db81]
- Updated dependencies [10b3963]
- Updated dependencies [e67aa80]
  - @dxos/react-ui@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/react-ui-syntax-highlighter@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/log@0.17.0
