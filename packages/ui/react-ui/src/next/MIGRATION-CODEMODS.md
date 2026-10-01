# Next migration: codemod dry run

Generated 2026-10-01 on `claude/react-ui-next-design-4db6eb` at `02cc8066fd` by the Phase B codemods
(`tools/codemorph`; its README documents each transform). This was a dry run: no source changed. Scope: every
`.ts`/`.tsx` under `packages/**` except `packages/ui/react-ui/src`, `node_modules`, `dist` and symlinks (12,264
files).

```bash
node tools/codemorph/src/main.ts --transform all --dry-run \
  --report temp/codemods.json --summary temp/codemods.md \
  --exclude packages/ui/react-ui/src packages
```

`all` runs `renames`, `layout`, `classnames`, `emphasis` and `imports` in that order. Each transform reads the
previous one's output, so the counts below are what Phase C step 1 would commit. Drop `--dry-run` and add `--format`
to write the files and then sort imports (`oxlint --fix`) and format (`oxfmt`) the ones that changed. For the per-item
residue, rerun the command: `--report` lists the file, line, reason and snippet of each item. The run takes about
three seconds.

## Headline

- **Converted:** 908 files change. That is 2,452 renames in 676 files, 25 layout elements in 14 files, 87
  `classNames` tokens in 65 files, and 2,457 imports in 906 files.
- **Residue (Phase C's manual list):** 983 items in 544 files. By area: plugins 338 files, ui 135, sdk 26,
  devtools 18, stories 18, apps 8, common 1. A later transform does not repeat an item an earlier one reported.
- **Round 2 (since the first dry run, which had 981 items in 570 files):**
  - Converted 71 elements that had no mapping before:
    - `Dialog.ActionIconButton` → `SystemButton.Close` (15)
    - `VirtualTrigger` → Root `positioning={virtualAnchor(ref)}` (15)
    - `ToggleGroupIconItem` → `ToggleGroup.Item` (12)
    - `IconBlock` → `Block` (17), and `Field.Block` → `Block` (6)
    - `Listbox.ItemContent` → the row parts (4)
    - `Card.ActionIconButton` → `Card.Action` (2)
  - Converted 25 layout elements: 23 `Flex` columns and 1 `Column.Root` become `Next.Container`, and 1
    `Column.Center` becomes a `div`.
  - Layout residue is now reported per element, not per import. The 109 `Flex`/`Column` import items became 168
    element items that each say why the element stays. Without them the residue fell from 872 items to 815, and the
    total covers 26 fewer files.
- **Largest residue groups:**
  - `Flex` (151) and `Column` (17) elements, mostly because of `classNames` (93) or a row layout (38).
  - react-ui-form, which has no `/next` entry yet: 135.
  - `Panel.Content asChild` hosts: 135 (33 wrap `ScrollArea.Root`).
  - `useThemeContext`: 76.
  - `Field.Switch`/`Field.Checkbox` labels: 56.
  - `*Props` types: 49.
  - Icon sizes off the xs–xl scale: 42.
  - Button `density`: 40.
- **Text emphasis:** deferred. The transform exists with an empty rename table, so it converts nothing.

## Gaps the dry run surfaced

1. **react-ui-form** has no Next entry on this branch, so its imports stay residue until milestone 6 lands. The fix is
   one table change: set `next` on `MODULES['react-ui-form']` in `tools/codemorph/src/react-ui-next/targets.ts` and
   list its names.
2. **`Flex` rows have no unambiguous Next form.** `Group` pads the block axis and wraps, and a `Container` row needs
   `columns`. So 38 rows stay, as do the 88 `Flex` elements with `classNames`.
3. **Button `density`:** Next Button takes no `size`, so the transform drops `density` on 40 buttons and reports each
   one. Set `size` on the host instead.
4. **Icon sizes off the scale:** `size={2}`, `{7}`, `{8}`, `{10}`, `{12}` and computed sizes have no xs–xl step.
5. **Master-detail Tabs** (`Viewport`, `BackButton`, `activePart`) still has no decision (AUDIT §7 Phase A item 4).
6. **Small Next additions this round would need (reported, not added):**
   - `Card.Action` default labels for close and delete. Five `Card.ActionIconButton`s have no `label` and relied on
     the translated default.
   - A `compact` variant on `Next.Block`, for `IconBlock compact`.
7. **Avatar** merges only when `Avatar.Root` holds a lone `Avatar.Content`. Twelve roots also hold a Label or
   Description, and avatar sizes stay numeric (reported).
8. **Tabs orientation:** the current Tabs default to vertical and Next Tabs to horizontal. The transform adds
   `orientation='vertical'` wherever a root sets none, which keeps today's behaviour; drop it where horizontal was meant.
9. **The current `Container`** (a `dx-expand` div) is no longer mapped to `Next.Container`, which is a grid. Its three
   importers are reported.

## Counts by transform

| Transform    | Files scanned | Files changed | Conversions | Residue items | Residue files |
| ------------ | ------------: | ------------: | ----------: | ------------: | ------------: |
| `renames`    |        12,264 |           676 |       2,452 |           425 |           289 |
| `layout`     |        12,264 |            14 |          25 |           168 |            96 |
| `classnames` |        12,264 |            65 |          87 |            52 |            42 |
| `emphasis`   |        12,264 |             0 |           0 |             0 |             0 |
| `imports`    |        12,264 |           906 |       2,457 |           338 |           285 |

### `renames`

| Conversion                            | Count |
| ------------------------------------- | ----: |
| IconButton → Button                   |   346 |
| Panel.Content → Panel.Body            |   285 |
| Panel.Toolbar → Panel.Header          |   222 |
| Panel.Toolbar asChild dropped         |   187 |
| size={n} → size='xs–xl' (Icon)        |   129 |
| Toolbar.IconButton → Button           |   108 |
| Card.Block → Block                    |    98 |
| Field.Input → Input                   |    76 |
| Toolbar.Button → Button               |    58 |
| size={n} → iconSize='xs–xl' (Button)  |    43 |
| Banner.Empty → Empty                  |    41 |
| Select.TriggerButton → Select.Trigger |    40 |
| Select.Portal unwrapped               |    39 |
| Select.Viewport unwrapped             |    39 |
| Select.Option → Select.Item item={…}  |    36 |
| (92 more)                             |   705 |

| Residue reason                                                                                                  | Count |
| --------------------------------------------------------------------------------------------------------------- | ----: |
| density dropped: Next Button sizes from its scope (set size on the host)                                        |    40 |
| Field.Switch → Next.Switch with a label prop                                                                    |    34 |
| Panel.Content asChild wrapped ScrollArea.Root: Panel.Body composes its own ScrollArea; collapse the pair        |    33 |
| Field.Checkbox → Next.Checkbox with a label prop                                                                |    22 |
| Listbox.Viewport dropped: Listbox.Content scrolls (scroll={false} to defer to the host)                         |    14 |
| iconClassNames has no Next equivalent (Button has no icon slot)                                                 |    13 |
| Avatar.Root holds more than a lone Avatar.Content: merge by hand (Label/Description → label or aria-labelledby) |    12 |
| Banner.Content unwrapped; its props need a new home (classNames)                                                |    12 |
| Avatar.Label → Avatar.Root label or aria-labelledby                                                             |    10 |
| Panel.Content asChild wrapped SearchList.Content: Panel.Body renders its own element                            |    10 |
| Select.Item takes `item` data ({ value, label }); children replace the whole row                                |    10 |
| size {8} has no xs–xl step                                                                                      |    10 |
| size {iconSize} has no xs–xl step                                                                               |     9 |
| Listbox.ItemContent: icon is computed or a custom element; pass its props to ItemIcon by hand                   |     7 |
| Avatar size is xs–xl (a block across) or fill in Next                                                           |     6 |
| (94 more)                                                                                                       |   183 |

### `layout`

| Conversion                                 | Count |
| ------------------------------------------ | ----: |
| Flex column → Next.Container gutter='none' |    23 |
| Column.Center → div                        |     1 |
| Column.Root → Next.Container               |     1 |

| Residue reason                                                                                                | Count |
| ------------------------------------------------------------------------------------------------------------- | ----: |
| Flex not converted: classNames (layout classes need a person)                                                 |    88 |
| Flex not converted: a row (Group pads and wraps, a Container row needs columns)                               |    38 |
| Column.Root not converted: classNames (layout classes need a person)                                          |     5 |
| Column.Section → an inheriting Container, by hand                                                             |     5 |
| Flex not converted: align or justify other than the grid default                                              |     5 |
| Flex not converted: spread props                                                                              |     5 |
| Flex not converted: gap='xl' has no Container step                                                            |     4 |
| Column.Root not converted: spread props                                                                       |     3 |
| Flex not converted: asChild (layout classes need a person)                                                    |     3 |
| Column.Root not converted: a computed gutter or gap                                                           |     2 |
| Flex not converted: gap='2xl' has no Container step                                                           |     2 |
| Column.Root not converted: a child other than Column.Center / Column.Row (Column places it in a gutter track) |     1 |
| Column.Root not converted: style (layout classes need a person)                                               |     1 |
| Flex not converted: a child has self-start                                                                    |     1 |
| Flex not converted: a child is a computed value                                                               |     1 |
| (4 more)                                                                                                      |     4 |

### `classnames`

| Conversion                                         | Count |
| -------------------------------------------------- | ----: |
| Icon shrink-0 dropped                              |    18 |
| Panel.Root dx-document → width='document'          |    11 |
| Icon text-subdued → tone='subdued'                 |    10 |
| Icon animate-spin → spin                           |     9 |
| Card.Title line-clamp-2 → lines={2}                |     7 |
| Icon text-description → tone='description'         |     7 |
| Card.Text text-description → variant='description' |     6 |
| Icon text-success-text → valence='success'         |     5 |
| Card.Title truncate → truncate                     |     3 |
| Card.Title text-description → tone='description'   |     2 |
| Icon text-error-text → valence='error'             |     2 |
| Icon text-warning-text → valence='warning'         |     2 |
| Input font-mono → variant='mono'                   |     2 |
| Card.Text truncate → truncate                      |     1 |
| Card.Title line-clamp-1 → lines={1}                |     1 |
| (1 more)                                           |     1 |

| Residue reason                                                          | Count |
| ----------------------------------------------------------------------- | ----: |
| dx-document on Toolbar.Root: the prop exists only on other hosts        |     7 |
| line-clamp-3 on Card.Text: the prop exists only on other hosts          |     6 |
| animate-spin on Icon inside a computed classNames                       |     4 |
| dx-document on ScrollArea.Viewport: the prop exists only on other hosts |     4 |
| line-clamp-2 on Card.Text: the prop exists only on other hosts          |     4 |
| text-error-text on Icon inside a computed classNames                    |     4 |
| text-description on Icon inside a computed classNames                   |     3 |
| text-success-text on Icon inside a computed classNames                  |     3 |
| col-span-3 on Card.Root: the prop exists only on other hosts            |     2 |
| dx-document on Panel.Body: the prop exists only on other hosts          |     2 |
| text-subdued on Icon inside a computed classNames                       |     2 |
| col-span-2 on Flex, Grid, ScrollArea.Root, Toolbar.Root (one each)      |     4 |
| (7 more)                                                                |     7 |

### `emphasis`

No conversions and no residue (the rename table is empty).

### `imports`

| Conversion                                     | Count |
| ---------------------------------------------- | ----: |
| @dxos/react-ui-menu → @dxos/react-ui-menu/next |   362 |
| Button → Next.Button                           |   331 |
| Panel → Next.Panel                             |   248 |
| Icon → Next.Icon                               |   187 |
| Toolbar → Next.Toolbar                         |   185 |
| Card → Next.Card                               |   123 |
| Field → Next.Field                             |   123 |
| ScrollArea → Next.ScrollArea                   |   116 |
| Block → Next.Block                             |    72 |
| Input → Next.Input                             |    66 |
| SystemButton → Next.SystemButton               |    57 |
| Listbox → @dxos/react-ui-list/next             |    50 |
| Dialog → Next.Dialog                           |    42 |
| Select → Next.Select                           |    37 |
| Empty → Next.Empty                             |    36 |
| (78 more)                                      |   422 |

| Residue reason                                                                           | Count |
| ---------------------------------------------------------------------------------------- | ----: |
| Form: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)             |   100 |
| useThemeContext: Next has no tx theme context (decision 3)                               |    76 |
| Grid: Grid → Container columns; a layout decision                                        |    20 |
| Avatar.Content has no Next part (run renames first, or port by hand)                     |    12 |
| type IconButtonProps has no Next counterpart                                             |    12 |
| SelectField: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)      |     7 |
| type ScrollAreaRootProps has no Next counterpart                                         |     6 |
| ElevationProvider: ElevationProvider → `level` on the host                               |     5 |
| ObjectProperties: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2) |     5 |
| ToggleIconButton: ToggleIconButton → Next.Toggle (activeIcon)                            |     5 |
| type SelectRootProps has no Next counterpart                                             |     5 |
| Field.DateTime has no Next part (run renames first, or port by hand)                     |     4 |
| Field.Time has no Next part (run renames first, or port by hand)                         |     4 |
| ObjectForm: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)       |     4 |
| ViewEditor: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)       |     4 |
| (47 more)                                                                                |    69 |
