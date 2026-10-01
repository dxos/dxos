# Next migration: codemod dry run

Generated 2026-10-01 on `claude/react-ui-next-design-4db6eb` at `22a6f1a00a` by the Phase B codemods
(`tools/codemorph`; its README documents each transform). This was a dry run: no source changed. Scope: every
`.ts`/`.tsx` under `packages/**` except `packages/ui/react-ui/src`, `node_modules`, `dist` and symlinks (12,315
files).

```bash
node tools/codemorph/src/main.ts --transform all --dry-run \
  --report temp/codemods.json --summary temp/codemods.md \
  --exclude packages/ui/react-ui/src packages
```

`all` runs `renames`, `layout`, `theme`, `classnames`, `emphasis` and `imports` in that order. Each transform reads
the previous one's output, so the counts below are what Phase C step 1 would commit. Drop `--dry-run` and add
`--format` to write the files and then sort imports (`oxlint --fix`) and format (`oxfmt`) the ones that changed. For
the per-item residue, rerun the command: `--report` lists the file, line, reason and snippet of each item.

## Headline

- **Converted:** 993 files change.
- **Residue (Phase C's manual list):** 583 items in 296 files. By area: plugins 179 files, ui 73, sdk 22, devtools 16,
  apps 5, stories 1. A later transform does not repeat an item an earlier one reported.
- **History:** the first dry run left 981 items in 570 files. Round 2 mapped the composites Next can build and added
  the `layout` transform; round 3 resolved button `density` from the enclosing scope.
- **Round 4 (user decisions) took the residue from 983 items in 543 files to 583 in 296:**
  - **`Panel.Content` → `Panel.Body`** is a pure rename. Body is a plain slot, so `asChild` and the inner
    `ScrollArea` stay; the 135 `asChild` residue items are gone.
  - **react-ui-form** imports move to `@dxos/react-ui-form/next` (133 imports). Only `FormFieldHeader` and
    `TupleField`, which the Next entry lacks, are reported.
  - **`useThemeContext()`** destructurings become Next hooks: `themeMode` → `Next.useThemeMode()` (72),
    `hasIosKeyboard` → `Next.useIosKeyboard()` (2), `platform` → `Next.usePlatform()` (1). The 7 `tx` uses are reported
    per call site.
  - **`Field.Switch` / `Field.Checkbox`** (56) become `Next.Switch` / `Next.Checkbox`, with their children moved to the
    control's `label` prop (13 had children). The Next spelling is used because the current entry's `Switch` is the
    flow control, which stays.
  - **`*Props` types** take a renamed Next type where one exists (`IconButtonProps` → `Next.ButtonProps`, 12;
    `ButtonGroupProps` → `Next.GroupProps`, 1). Otherwise they become a local alias,
    `type X = ComponentProps<typeof Next.Part>`, which is reported (22). 9 types have no Next part to alias: `FlexProps`, `ColumnRootProps`, `AvatarContentProps` and the
    like.
  - **Icon sizes off the scale** round to the nearest step and are reported (23); 19 computed sizes stay.
  - **`Grid` → `Container layout='row' columns`** converts only a static, non-growing, centred Grid with no
    `classNames`. None in the repo qualifies: 22 of 34 carry `classNames`. Each Grid is now reported per element.
- **Largest residue groups:**
  - `Flex` (151), `Grid` (34) and `Column` (17) elements, mostly for `classNames` (115) or a row layout (38).
  - Avatar merges, labels and sizes: 40.
  - Buttons whose size the caller's scope should decide: 37.
  - Icon sizes: 23 rounded (reported) and 19 computed.
  - `*Props` aliases to check: 22.
  - `Listbox.Viewport` scroll ownership: 18.
- **Text emphasis:** deferred. The transform exists with an empty rename table, so it converts nothing.

## Gaps the dry run surfaced

1. **Design-branch prerequisites are in:** `Next.useThemeMode`, `Next.usePlatform` and `Next.useIosKeyboard`
   (`22a6f1a00a`) and the plain-slot `Panel.Body` (`a4835092e2`). A test checks that every hook the theme transform
   emits is a Next export.
2. **`Flex` rows and most `Grid`s have no unambiguous Next form.** `Group` pads the block axis and wraps, and a
   `Container` row centres its cells and needs `columns`. So 38 `Flex` rows stay, as do the elements whose
   `classNames` carry the layout.
3. **Button sizes set across files:** 37 buttons get `size` on themselves because their scope is in the calling
   component. Where every caller passes the same size, move it to the caller's scope by hand.
4. **Master-detail Tabs** (`Viewport`, `BackButton`, `activePart`) and react-ui-list `MasterDetail` are removed
   (follow-ups decision): ChatOptions, Welcome and VideoArticle compose Tabs + `Splitter` by hand.
5. **Card actions and compact blocks map directly:** `Card.ActionIconButton action` becomes `Card.Action system`
   (the SystemButton preset, label optional; 7 converted), and `IconBlock compact` becomes `Block compact`.
6. **Avatar** merges only when `Avatar.Root` holds a lone `Avatar.Content`. Twelve roots also hold a Label or
   Description, and avatar sizes stay numeric (reported).
7. **Tabs orientation:** the current Tabs default to vertical and Next Tabs to horizontal. The transform adds
   `orientation='vertical'` wherever a root sets none, which keeps today's behaviour; drop it where horizontal was meant.
8. **The current `Container`** (a `dx-expand` div) is not mapped to `Next.Container`, which is a grid. Its importers are
   reported.

## Counts by transform

| Transform    | Files scanned | Files changed | Conversions | Residue items | Residue files |
| ------------ | ------------: | ------------: | ----------: | ------------: | ------------: |
| `renames`    |         12315 |           702 |        2598 |           229 |           147 |
| `layout`     |         12315 |            14 |          25 |           202 |           110 |
| `theme`      |         12315 |            71 |          75 |             7 |             5 |
| `classnames` |         12315 |            65 |          87 |            52 |            42 |
| `emphasis`   |         12315 |             0 |           0 |             0 |             0 |
| `imports`    |         12315 |           942 |        2606 |            93 |            75 |

### `renames`

| Conversion                            | Count |
| ------------------------------------- | ----: |
| IconButton → Button                   |   346 |
| Panel.Content → Panel.Body            |   285 |
| Panel.Toolbar → Panel.Header          |   222 |
| Panel.Toolbar asChild dropped         |   187 |
| size={n} → size='xs–xl'               |   129 |
| Toolbar.IconButton → Button           |   108 |
| Card.Block → Block                    |    98 |
| Field.Input → Input                   |    77 |
| Toolbar.Button → Button               |    58 |
| button density → size                 |    45 |
| size={n} → iconSize='xs–xl'           |    43 |
| Banner.Empty → Empty                  |    41 |
| Select.TriggerButton → Select.Trigger |    40 |
| Select.Portal unwrapped               |    39 |
| Select.Viewport unwrapped             |    39 |
| (101 more)                            |   841 |

| Residue reason                                                                                                  | Count |
| --------------------------------------------------------------------------------------------------------------- | ----: |
| button size set: its scope is decided by the caller (another component)                                         |    37 |
| Listbox.Viewport dropped: Listbox.Content scrolls (scroll={false} to defer to the host)                         |    14 |
| iconClassNames has no Next equivalent (Button has no icon slot)                                                 |    13 |
| Avatar.Root holds more than a lone Avatar.Content: merge by hand (Label/Description → label or aria-labelledby) |    12 |
| Banner.Content unwrapped; its props need a new home (classNames)                                                |    12 |
| Avatar.Label → Avatar.Root label or aria-labelledby                                                             |    10 |
| Select.Item takes `item` data ({ value, label }); children replace the whole row                                |    10 |
| size {8} rounded to the nearest step, 'xl'                                                                      |    10 |
| size {iconSize} is computed; map it to xs–xl by hand                                                            |     9 |
| Listbox.ItemContent: icon is computed or a custom element; pass its props to ItemIcon by hand                   |     7 |
| Avatar size is xs–xl (a block across) or fill in Next                                                           |     6 |
| size {size} is computed; map it to xs–xl by hand                                                                |     5 |
| Toast.Title icon → Toast.Header icon                                                                            |     5 |
| Toast.Title onClose → Toast.Header (CloseTrigger reports through onOpenChange)                                  |     5 |
| button density with a computed value renamed to size; check it is xs–xl                                         |     4 |
| (37 more)                                                                                                       |    70 |

### `layout`

| Conversion                                 | Count |
| ------------------------------------------ | ----: |
| Flex column → Next.Container gutter='none' |    23 |
| Column.Center → div                        |     1 |
| Column.Root → Next.Container               |     1 |

| Residue reason                                                                    | Count |
| --------------------------------------------------------------------------------- | ----: |
| Flex not converted: classNames (layout classes need a person)                     |    88 |
| Flex not converted: a row (Group pads and wraps, a Container row needs columns)   |    38 |
| Grid not converted: classNames (a person decides the layout)                      |    22 |
| Column.Root not converted: classNames (layout classes need a person)              |     5 |
| Column.Section → an inheriting Container, by hand                                 |     5 |
| Flex not converted: align or justify other than the grid default                  |     5 |
| Flex not converted: spread props                                                  |     5 |
| Flex not converted: gap='xl' has no Container step                                |     4 |
| Grid not converted: cols is missing, computed or subgrid                          |     4 |
| Grid not converted: rows (a person decides the layout)                            |     4 |
| Column.Root not converted: spread props                                           |     3 |
| Flex not converted: asChild (layout classes need a person)                        |     3 |
| Column.Root not converted: a computed gutter or gap                               |     2 |
| Flex not converted: gap='2xl' has no Container step                               |     2 |
| Grid not converted: align other than 'center' (a Container row centres its cells) |     2 |
| (10 more)                                                                         |    10 |

### `theme`

| Conversion                                               | Count |
| -------------------------------------------------------- | ----: |
| useThemeContext().themeMode → Next.useThemeMode()        |    72 |
| useThemeContext().hasIosKeyboard → Next.useIosKeyboard() |     2 |
| useThemeContext().platform → Next.usePlatform()          |     1 |

| Residue reason                                                              | Count |
| --------------------------------------------------------------------------- | ----: |
| useThemeContext().tx has no Next hook (tx goes with the current components) |     7 |

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
| col-span-2 on Flex: the prop exists only on other hosts                 |     1 |
| col-span-2 on Grid: the prop exists only on other hosts                 |     1 |
| col-span-2 on ScrollArea.Root: the prop exists only on other hosts      |     1 |
| col-span-2 on Toolbar.Root: the prop exists only on other hosts         |     1 |
| (7 more)                                                                |     7 |

### `emphasis`

No conversions and no residue.

### `imports`

| Conversion                                     | Count |
| ---------------------------------------------- | ----: |
| @dxos/react-ui-menu → @dxos/react-ui-menu/next |   362 |
| Button → Next.Button                           |   331 |
| Panel → Next.Panel                             |   248 |
| Icon → Next.Icon                               |   187 |
| Toolbar → Next.Toolbar                         |   185 |
| Card → Next.Card                               |   123 |
| ScrollArea → Next.ScrollArea                   |   116 |
| Field → Next.Field                             |   104 |
| Form → @dxos/react-ui-form/next                |    98 |
| Block → Next.Block                             |    72 |
| Input → Next.Input                             |    67 |
| SystemButton → Next.SystemButton               |    57 |
| Listbox → @dxos/react-ui-list/next             |    50 |
| Dialog → Next.Dialog                           |    42 |
| Select → Next.Select                           |    37 |
| (106 more)                                     |   527 |

| Residue reason                                                                          | Count |
| --------------------------------------------------------------------------------------- | ----: |
| Avatar.Content has no Next part (run renames first, or port by hand)                    |    12 |
| type ScrollAreaRootProps is now a local alias of ComponentProps<typeof ScrollArea.Root> |     6 |
| ElevationProvider: ElevationProvider → `level` on the host                              |     5 |
| ToggleIconButton: ToggleIconButton → Next.Toggle (activeIcon)                           |     5 |
| type SelectRootProps is now a local alias of ComponentProps<typeof Select.Root>         |     5 |
| Field.DateTime has no Next part (run renames first, or port by hand)                    |     4 |
| Field.Time has no Next part (run renames first, or port by hand)                        |     4 |
| Combobox.Portal has no Next part (run renames first, or port by hand)                   |     3 |
| createStaticTreeModel: the Next Tree is driven by TreeModel atoms; rewrite the model    |     3 |
| DensityProvider: DensityProvider → `size` on the nearest Container/Panel                |     3 |
| TREE_BLOCK: the Next Tree sizes rows from its scope                                     |     3 |
| Field.Date has no Next part (run renames first, or port by hand)                        |     2 |
| Form.Label has no Next part (run renames first, or port by hand)                        |     2 |
| IconButton is converted by the renames transform; run it first                          |     2 |
| Picker: Picker → Next.Combobox trigger mode (decision 9)                                |     2 |
| (27 more)                                                                               |    32 |
