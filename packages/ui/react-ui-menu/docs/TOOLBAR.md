# Toolbar layout and extension (design draft)

A toolbar that another component owns (the markdown editor's) must take items from other components (review's
comment button, transcription's microphone, presenter's slide actions), place them sensibly, and degrade on narrow
screens. This records what exists and the design; the story is
`ui/react-ui-menu/ActionToolbar` (`src/components/ActionToolbar.stories.tsx`).

## What exists

- **Model:** `MenuBuilder` builds an action graph (`ActionGraphProps`): actions, groups (`dropdownMenu`,
  `toggleGroup`), `line`/`gap` separators, and a hand-built overflow dropdown (`.menu('more', …)`).
- **Rendering:** `ActionToolbar` renders each row as a `Toolbar.Root` (a horizontal scroll container) of start and end
  zones, then the overflow menu. `variant: 'custom'` renders a contributor's own element.
- **Extension:** a plugin contributes an app-graph extension whose actions carry `disposition: 'toolbar'`; the owner
  merges them with `graphActions(graph, get, id, { filter: isToolbarAction })` (MarkdownArticle passes them to
  `EditorToolbar` as `customActions`). `useMenuContribution` adds items to a menu by priority.
- **Adopted:** `EditorToolbar` declares an insert group and an overflow menu; plugin-presenter's slide editor extends the
  insert group and builds its own `SlideToolbar` with `MenuBuilder`.

## Proposal

Toolbars and menus share one model, built with `MenuBuilder`; a toolbar is one rendering of the graph, a menu another.

- **Named groups.** The owner declares groups (`formatting`, `blocks`, `tools`, …). A plain group (no `variant`)
  renders inline in a toolbar as a cluster of controls and as a submenu in a menu.
- **Extension.** Another component adds to a named group with `MenuBuilder.extend(groupId, …)` and passes the graph
  as `customActions` (on `ActionToolbar` and on every wrapper of it), which merges it group by group; it may also add
  its own group with a placement. The owner needs no knowledge of review, transcription or presenter.
- **Own controls.** A toolbar has no `children`: a hand-written control is a `custom` item (`MenuBuilder.custom`) and a
  label a `text` item (`MenuBuilder.text`), placed and extended like any other item; neither moves into the menu.
- **Overflow.** Every toolbar ends with an overflow menu (⋮), the named group `TOOLBAR_OVERFLOW_ID`, which others
  extend like any group. It renders only when it has items (its own, contributed or collapsed).
- **Narrow.** While a row is too narrow, items move into the overflow menu (groups as submenus): ranked ones first,
  highest rank first, then the rest, last first, so the toolbar fills its container without overflowing it. A `custom`
  or `text` item, a group holding one, and an empty group never move. Each comes back once the toolbar is wider than
  when it collapsed.

An item or group carries an optional `placement` (`ToolbarPlacement` on `MenuItemChrome`, ignored by menus):

| Field      | Meaning                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `zone`     | `start` (left) or `end` (right) of its row.                                                                            |
| `row`      | Row of a multi-row toolbar; `0` is the first.                                                                          |
| `order`    | Order within its zone or group, so a contributor interleaves with the owner's items.                                   |
| `collapse` | Rank for moving into the overflow menu when the row is too narrow; higher goes first, then unranked items, last first. |

Each row is one `Toolbar.Root` laid out as `start | gap | end`, with the overflow menu last in row 0.
The `ui/react-ui-menu/ActionToolbar` stories cover `Groups`, `Extended` (contributions and two rows), `Narrow` and `AsMenu`.

## Open questions

1. Where do placement defaults come from: the owner per contributed action (`presentation[surface]`), or only the
   contributor?
2. Should `order` be numeric slots the owner documents (e.g. formatting 10–60), or named anchors ("after `link`")?
3. Row 1 on narrow screens: keep two rows, or fold row 1 into the overflow menu first?
4. Keyboard: one roving-focus sequence across rows, or one per row (as now, one `Toolbar.Root` each)?
