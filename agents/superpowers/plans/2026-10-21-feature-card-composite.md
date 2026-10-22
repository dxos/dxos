# FeatureCard as a composite

## Problem

`FeatureCard.tsx` (715 lines) is two components, `FeatureCard` and `FeatureCardBody`, configured by flags:

- detail flags: `expanded`, `selected` (derived as `detailed`)
- visibility flags: `showFields`, `showSubfeatures`, `showDependencies`, `scroll`
- host flags: `focusItem`, `inItem`

Every host needs a different subset, and adding a section means adding a flag. Four private helpers share the file
with `SubfeatureEditor`: `StatusIcon`, `StatusItems`, `EditField` and `RowIcon`.

The card also owns focus and click handling that belongs to the tile:

- `focusItem` wraps the card in `Focus.Item` and focuses it on click.
- `inItem` exists only to opt out of that when Masonry's `Focus.Item` already wraps the card.

The repo convention is that `Focus.Item` belongs to the item or tile layer:

- The containers add it themselves: Masonry's tile `div` (`Masonry.tsx:327`), `Board.Item` (`Item.tsx:82`) and `SearchStack`.
- Where a plugin renders its own `Mosaic.Tile`, the plugin's tile adds it: `Mosaic.Tile asChild` → `Focus.Item asChild` →
  `Card.Root`. `KanbanCard` and `CardTile` do this.
- Cards never wrap themselves.

## Target API

A namespace module, `FeatureCard.tsx`, re-exported from the barrel as `export * as FeatureCard from './FeatureCard.tsx'`.
The parts follow the `composite-components` skill:

- `slottable` parts
- dotted `displayName`s
- prefixed internal names
- each part's Props type exported

### Root and context

| Part                 | Renders                                                  | Owns                                                                                                                                     |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `FeatureCard.Root`   | `Card.Root` (`asChild`-friendly, forwards props and ref) | context: `feature`, `lookup`, `relation`, `onChange`, `onOpen`, edit mode (controllable: `editing`, `defaultEditing`, `onEditingChange`) |
| `FeatureCard.Header` | `Card.Header`                                            | layout only                                                                                                                              |
| `FeatureCard.Body`   | `Card.Body`                                              | `scroll` (the canvas's only reason for that flag)                                                                                        |

Edit mode comes from context, so each field part renders its editable form on its own; no `editing` prop is threaded
through.

### Header parts

| Part                     | Read-only                                     | Editable (`onChange` and edit mode)           |
| ------------------------ | --------------------------------------------- | --------------------------------------------- |
| `FeatureCard.Status`     | status icon                                   | icon opens the status picker                  |
| `FeatureCard.Title`      | clamped title                                 | `EditField`                                   |
| `FeatureCard.EditToggle` | —                                             | edit / save button; absent without `onChange` |
| `FeatureCard.Menu`       | open, status, remove (`onRemove` on the part) | same                                          |

### Body sections

Each part renders nothing when it has nothing to show.

| Part                       | Content                                                                       | Today's flag it replaces                 |
| -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- |
| `FeatureCard.Description`  | text, `line-clamp-3`; `EditField multiline` in edit mode                      | `showFields`                             |
| `FeatureCard.Tags`         | status, relation and signal tags; `all` shows every signal                    | `detailed`                               |
| `FeatureCard.Summary`      | compact count rows: subfeatures, open tasks, first showcase, depends-on count | `!expanded` / `!detailed`                |
| `FeatureCard.Dependencies` | dependency rows; `onRemove` adds the remove action                            | `showDependencies`, `onRemoveDependency` |
| `FeatureCard.Dependents`   | dependents rows (`dependents` prop)                                           | `expanded`                               |
| `FeatureCard.Subfeatures`  | subfeature rows                                                               | `showSubfeatures`                        |
| `FeatureCard.Tasks`        | task rows, opened with `onOpen`                                               | `expanded`                               |
| `FeatureCard.Showcases`    | showcase rows                                                                 | `expanded`                               |
| `FeatureCard.Specs`        | spec rows (`onOpen`) or GitHub links                                          | `showFields` / `expanded`                |

Every row that opens something calls the context's `onOpen(target)`, so the open-row logic lives in one private helper.

### Hosts compose what they show

| Host                   | Composition                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FeatureKanban          | Header(Status, Title, EditToggle, Menu) + Body(Description, Tags, Summary without dependencies)                                                                                    |
| FeatureBoard (masonry) | same as kanban, plus the depends-on count                                                                                                                                          |
| FeatureCanvas          | kanban composition, `Body scroll`                                                                                                                                                  |
| FeatureArticle         | `Root` with `Card.Root grid border={false}`; Body(Tags all, Dependencies onRemove, Dependents, Tasks, Showcases, Specs); no Description or Subfeatures, since the form edits those |
| FeatureCardContent     | Body only, compact sections                                                                                                                                                        |

`expanded`, `selected`, `showFields`, `showSubfeatures` and `showDependencies` all go away.

### Focus and click: out of the card

- **FeatureKanban's tile** becomes `Mosaic.Tile asChild` → `Focus.Item asChild data-focus-click` →
  `FeatureCard.Root`, as `KanbanCard` does. If `CardTile` fits, the tile uses it instead.
- **FeatureBoard** keeps relying on Masonry's own `Focus.Item`.
- **Card props go:** `focusItem`, `inItem` and the Safari focus workaround leave the card.
- **Opening moves to the host.** ⌘/Ctrl-click and double-click call a small plugin hook, `useCardOpenHandlers(onOpen)`. Each
  host spreads its handlers on the tile, with the existing `isControl` guard. The card no longer takes `onSelect` or decides
  between select and open; the `TODO(richburdon): Make click-to-open a pattern` comment points at this hook.

### File layout (`components/FeatureCard/`)

| File                   | Contents                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| `FeatureCard.tsx`      | the composite: Root, context, and every part listed above                      |
| `fields.tsx`           | `EditField`, `StatusIcon`, `StatusItems`, `RowIcon` (private to the directory) |
| `SubfeatureEditor.tsx` | moved out unchanged; used by the article's form                                |
| `feature.ts`           | unchanged (model, signals, `FeatureTarget`, `FeatureChanges`)                  |

## Steps

Each step ends green on `tsc --noEmit`, `plugin-projects:lint`, `:test` and `:test-storybook`.

1. Move `EditField`, `StatusIcon`, `StatusItems`, `RowIcon` to `fields.tsx` and `SubfeatureEditor` to its own file. No
   behaviour change.
2. Add `FeatureCard.Root` with context and controllable edit mode, and the header parts. The old `FeatureCard` becomes a
   composition of the new parts, so its call sites keep working.
3. Add the body section parts. `FeatureCardBody` becomes a composition of them.
4. Move hosts onto explicit compositions: kanban, board, canvas, article and FeatureCardContent. Delete the old
   `FeatureCard`/`FeatureCardBody` wrappers and their flags.
5. Move focus to the kanban tile; delete `focusItem`, `inItem` and the card's click handling; add `useCardOpenHandlers`.
   Re-run the FeatureKanban and FeatureBoard keyboard plays (arrow movement, click ring, ⌘-click open).
6. Rewrite the stories:
   - The FeatureCard stories show one composition per host: compact, canvas and detail.
   - Each story gets a read-only and an editing variant.
   - Each section part gets one story.

## Risks

- **Click semantics on the board.** Masonry's tile already handles select, so open has to stay on ⌘-click and
  double-click without the card's capture handler. The FeatureBoard play test covers it.
- **Edit-mode control.** Hosts pass `editingId`. Root's controllable state must keep "controlled only when the host
  tracks it", or the edit button's toggle is overridden.
