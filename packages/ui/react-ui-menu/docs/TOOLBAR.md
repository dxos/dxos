# Toolbar layout and extension (design draft)

A toolbar that another component owns (the markdown editor's) must take items from other components (review's
comment button, transcription's microphone, presenter's slide actions), place them sensibly, and degrade on narrow
screens. This draft records what exists, what is missing, and a proposal; the prototype is the story
`ui/react-ui-menu/ToolbarLayout (prototype)` (`src/components/ToolbarLayout.stories.tsx`).

## What exists

- **Model:** `MenuBuilder` builds an action graph (`ActionGraphProps`): actions, groups (`dropdownMenu`,
  `toggleGroup`), `line`/`gap` separators, and a hand-built overflow dropdown (`.menu('more', …)`).
- **Rendering:** `ActionToolbar` renders the root items flat, in insertion order, inside one `Toolbar.Root` (a
  full-width horizontal scroll container). `variant: 'custom'` renders a contributor's own element.
- **Extension:** a plugin contributes an app-graph extension whose actions carry `disposition: 'toolbar'`; the owner
  merges them with `graphActions(graph, get, id, { filter: isToolbarAction })` (MarkdownArticle passes them to
  `EditorToolbar` as `customActions`). `useMenuContribution` adds items to a menu by priority.
- **Missing:** contributors cannot say _where_ an item goes (the editor drops every contribution after its gap), there
  are no zones, no second row, and nothing collapses into the overflow menu when the toolbar is too narrow (it scrolls).

## Proposal

Each item carries an optional **placement** beside its chrome (a typed field of `MenuItemChrome` once settled; the
prototype reads it from the item's properties):

| Field      | Meaning                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `zone`     | `start`, `middle` or `end` of its row.                                                              |
| `row`      | Row of a multi-row toolbar; `0` is the first.                                                       |
| `order`    | Order within the zone, so a contributor interleaves with the owner's items (e.g. beside Link).      |
| `collapse` | Rank for moving into the overflow menu when the row is too narrow; higher goes first; none = never. |
| `menu`     | Always in the overflow menu (the toolbar's extensible menu, at the far right of row 0).             |

The layout renders one `Toolbar.Root` per row as `start | gap | middle | gap | end`, with the overflow menu (⋮) last
in the first row. On resize it collapses items by rank while any row overflows, and restores each one once the toolbar
is wider than when it collapsed (no measuring of hidden items). The owner keeps its items; contributors only add
placed items, so the markdown toolbar needs no knowledge of review, transcription or presenter.

## Open questions

1. Where do placement defaults come from: the owner per contributed action (`presentation[surface]`), or only the
   contributor?
2. Should `order` be numeric slots the owner documents (e.g. formatting 10–60), or named anchors ("after `link`")?
3. Does the middle zone need true centring (a three-column grid) rather than two flexible gaps, which centre only when
   start and end are equally wide?
4. Collapse granularity: single items, or whole groups (a formatting group collapsing into one dropdown)?
5. Row 1 on narrow screens: keep two rows, or fold row 1 into the overflow menu first?
6. Keyboard: one roving-focus sequence across rows, or one per row (as now, one `Toolbar.Root` each)?
