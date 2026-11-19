# @dxos/react-ui-slides

The slide markdown dialect, and how it draws.

A slide is markdown with frontmatter: `layout:` places its regions, `background`/`scrim` paint it, and
the tags (`<Grid>`, `<Cell>`, `<Card>`, `<List>`, `<Table>`, `<Box>`, `<v-clicks>`) style and lay out what
they wrap. This package parses that dialect, renders it to a 16:9 canvas under a theme, and provides the
CodeMirror extensions that highlight and complete it.

## Tags

| Tag | Attributes |
| --- | --- |
| `<Grid>` | `cols`, `rows`: the tracks it lays down, 1 to 12; `align` (`stretch`, `start`, `center`, `end`); `variant` (`default`, `flow`) |
| `<Cell>` | `colSpan`, `rowSpan`: the tracks it covers |
| `<Card>` | `variant` (`default`, `outline`, `plain`), `tone`, `icon`, `colSpan`, `rowSpan` |
| `<List>` | `variant` (`default`, `cards`, `steps`, `outline`, `flow`), `tone`, `active` |
| `<Table>` | `variant` (`default`, `rows`, `cards`, `outline`), `tone` |
| `<Box>` | `variant`, `tone` |
| `<v-clicks>` | `depth`, `every` |

A `tone` (`accent`, `info`, `success`, `warning`, `error`, `neutral`) repaints the accent for the block and what it
holds.

A `<Grid>` fills the space the slide leaves it (`align="stretch"`, the default). With `align="start"`, `"center"` or
`"end"` it takes the height of what it holds and stands at the top, the middle or the bottom of that space. Either way
the cards of a row share one height.

`<Grid variant="flow">` draws an arrow in each gap between the children of a row, for a progression, and none after
the last child of a row. A row ends where the next child no longer fits, counting `cols` and each child's `colSpan`;
a `rowSpan` is not counted. It is otherwise the grid, so its cards are one size and `align` places it.
A card in a flow grid does not clip what it holds, since its arrow stands outside it.

A click tag (`<v-clicks>`, `<v-click>`, `<v-after>`) written straight inside a `<Grid>` is no box of its own: what it
reveals stays the grid's children, so a card still to come holds its place and the row does not shift. In a flow
grid an arrow waits for the card it points at.

```md
<Grid cols="4" align="center" variant="flow">

<v-clicks>

<Card icon="chat-circle">

### Chat

- Search

</Card>
<Card icon="code">

### Vibe coding

- Describe it and the model builds it

</Card>

</v-clicks>

</Grid>
```

A `<Card>` holds art or an icon, a title, and a line or a few bullets. `icon` names a
[Phosphor](https://phosphoricons.com) glyph, bare (`icon="shield-check"`) or as a whole symbol
(`icon="ph--shield-check--duotone"`). It stands with the card's first heading as one header, in the card's tone. A list
in a card is sized for the card and kept inside its padding, two levels deep, with its markers under the icon. In a
grid, the icon cards of a row share one header height, so a title that wraps does not put its card's bullets lower
than its neighbours'.

```md
<Grid cols="3" align="center">

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
