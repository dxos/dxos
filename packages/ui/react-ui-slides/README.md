# @dxos/react-ui-slides

The slide markdown dialect, and how it draws.

A slide is markdown with frontmatter: `layout:` places its regions, `background`/`scrim` paint it, and
the tags (`<Grid>`, `<Cell>`, `<Card>`, `<List>`, `<Table>`, `<Box>`, `<v-clicks>`) style and lay out what
they wrap. This package parses that dialect, renders it to a 16:9 canvas under a theme, and provides the
CodeMirror extensions that highlight and complete it.

## Tags

| Tag | Attributes |
| --- | --- |
| `<Grid>` | `cols`, `rows`: the tracks it lays down, 1 to 12 |
| `<Cell>` | `colSpan`, `rowSpan`: the tracks it covers |
| `<Card>` | `variant` (`default`, `outline`, `plain`), `tone`, `icon`, `colSpan`, `rowSpan` |
| `<List>` | `variant` (`default`, `cards`, `steps`, `outline`, `flow`), `tone`, `active` |
| `<Table>` | `variant` (`default`, `rows`, `cards`, `outline`), `tone` |
| `<Box>` | `variant`, `tone` |
| `<v-clicks>` | `depth`, `every` |

A `tone` (`accent`, `info`, `success`, `warning`, `error`, `neutral`) repaints the accent for the block and what it
holds.

A `<Card>` holds art or an icon, a title, and a line or a few bullets. `icon` names a
[Phosphor](https://phosphoricons.com) glyph, bare (`icon="shield-check"`) or as a whole symbol
(`icon="ph--shield-check--duotone"`). It stands with the card's first heading as one header, in the card's tone. A list
in a card is sized for the card and kept inside its padding, two levels deep, with its markers under the icon.

```md
<Grid cols="3">

<Card icon="brain" tone="warning">

### Shared Memory

- Beyond silos

</Card>
<Card icon="shield-check">

### Access and Authorization

- Delegation
- Policy and auditing

</Card>
<Card icon="users-three" tone="success">

### Coordination and Collaboration

- Rethinking the User Interface

</Card>

</Grid>
```

## Storage

It knows nothing about where a slide is stored. An embedded object is reached through a `renderSurface`
callback the host supplies, so a deck can come from a database, a file, or a string.

| Entry | Holds |
| --- | --- |
| `@dxos/react-ui-slides` | the dialect, the renderer, the theme and the canvas |
| `@dxos/react-ui-slides/editor` | the CodeMirror extensions for authoring it |
| `@dxos/react-ui-slides/testing` | story scaffolding, including the slide-over-source container |
