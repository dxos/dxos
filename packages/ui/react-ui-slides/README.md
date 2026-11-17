# @dxos/react-ui-slides

The slide markdown dialect, and how it draws.

A slide is markdown with frontmatter: `layout:` places its regions, `background`/`scrim` paint it, and
the tags (`<Grid>`, `<Cell>`, `<Card>`, `<List>`, `<Table>`, `<Box>`, `<v-clicks>`) style and lay out what
they wrap. This package parses that dialect, renders it to a 16:9 canvas under a theme, and provides the
CodeMirror extensions that highlight and complete it.

It knows nothing about where a slide is stored. An embedded object is reached through a `renderSurface`
callback the host supplies, so a deck can come from a database, a file, or a string.

| Entry | Holds |
| --- | --- |
| `@dxos/react-ui-slides` | the dialect, the renderer, the theme and the canvas |
| `@dxos/react-ui-slides/editor` | the CodeMirror extensions for authoring it |
| `@dxos/react-ui-slides/testing` | story scaffolding, including the slide-over-source container |
