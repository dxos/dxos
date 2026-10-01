# Next migration: codemod dry run

Generated 2026-10-01 on `claude/react-ui-next-design-4db6eb` at `b7b3613b22` by the Phase B codemods
(`tools/codemorph`; its README documents each transform). This was a dry run: no source changed. Scope: every
`.ts`/`.tsx` under `packages/**` except `packages/ui/react-ui/src`, `node_modules`, `dist` and symlinks (12,264
files).

```bash
node tools/codemorph/src/main.ts --transform all --dry-run \
  --report temp/codemods.json --summary temp/codemods.md \
  --exclude packages/ui/react-ui/src packages
```

`all` runs `renames`, `classnames`, `emphasis` and `imports` in that order. Each transform reads the previous one's
output, so the counts below are what Phase C step 1 would commit. Rerun the command for the per-item residue:
`--report` lists the file, line, reason and snippet of each item. The run takes about three seconds.

## Headline

- **Converted:** 2,376 renames in 672 files, 88 `classNames` tokens in 66 files, and 2,421 imports in 906 files.
- **Residue (Phase C's manual list):** 981 items in 570 files. By area: plugins 354 files, ui 144, sdk 27, devtools 18,
  stories 18, apps 8, common 1. A later transform does not repeat an item an earlier one reported.
- **Largest residue groups:**
  - react-ui-form has no `/next` entry yet: 135 items, 100 of them `Form`.
  - `Flex`, `Grid` and `Column` layout: 129.
  - `useThemeContext`: 76.
  - `Field.Switch` and `Field.Checkbox` need their label moved to a prop: 56.
  - `Panel.Content asChild` hosts: 135, of which 33 wrap `ScrollArea.Root` (collapse the pair) and the rest wrap
    custom roots.
  - `*Props` types with no Next name: 49.
  - Icon sizes off the xs–xl scale: 41.
  - Button `density`: 40.
- **Text emphasis:** deferred. The transform exists with an empty rename table, so it converts nothing.

## Gaps the dry run surfaced

1. **react-ui-form** has no Next entry on this branch, so its imports stay residue until milestone 6 lands. The fix is
   one table change: set `next` on `MODULES['react-ui-form']` in `tools/codemorph/src/react-ui-next/targets.ts` and
   list its names.
2. **Button `density`:** Next Button takes no `size`, so the transform drops `density` on 40 buttons and reports each
   one. Set `size` on the host instead.
3. **Icon sizes off the scale:** `size={2}`, `{7}`, `{8}`, `{10}`, `{12}` and computed sizes have no xs–xl step.
4. **Master-detail Tabs** (`Viewport`, `BackButton`, `activePart`) still has no decision (AUDIT §7 Phase A item 4).
5. **No Next counterpart:** `Dialog.ActionIconButton`/`Card.ActionIconButton` (22), `VirtualTrigger` (16, which
   needs `positioning.getAnchorRect`), `Toolbar.ToggleGroupIconItem`, `Field.Block`, `IconBlock`,
   `Listbox.ItemContent`.
6. **Avatar** merges only when `Avatar.Root` holds a lone `Avatar.Content`. Twelve roots also hold a Label or
   Description, and avatar sizes stay numeric (reported).
7. **Tabs orientation:** the current Tabs default to vertical and Next Tabs to horizontal. The transform adds
   `orientation='vertical'` wherever a root sets none, which keeps today's behaviour; drop it where horizontal was meant.

## Counts by transform

| Transform    | Files scanned | Files changed | Conversions | Residue items | Residue files |
| ------------ | ------------: | ------------: | ----------: | ------------: | ------------: |
| `renames`    |        12,264 |           672 |       2,376 |           458 |           316 |
| `classnames` |        12,264 |            66 |          88 |            52 |            42 |
| `emphasis`   |        12,264 |             0 |           0 |             0 |             0 |
| `imports`    |        12,264 |           906 |       2,421 |           471 |           362 |

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
| (81 more)                             |   629 |

| Residue reason                                                                                                  | Count |
| --------------------------------------------------------------------------------------------------------------- | ----: |
| density dropped: Next Button sizes from its scope (set size on the host)                                        |    40 |
| Field.Switch → Next.Switch with a label prop                                                                    |    34 |
| Panel.Content asChild wrapped ScrollArea.Root: Panel.Body composes its own ScrollArea; collapse the pair        |    33 |
| Field.Checkbox → Next.Checkbox with a label prop                                                                |    22 |
| VirtualTrigger → Root positioning.getAnchorRect (useVirtualAnchor)                                              |    16 |
| Dialog.ActionIconButton has no Next counterpart                                                                 |    15 |
| Listbox.Viewport dropped: Listbox.Content scrolls (scroll={false} to defer to the host)                         |    14 |
| Avatar.Root holds more than a lone Avatar.Content: merge by hand (Label/Description → label or aria-labelledby) |    12 |
| Banner.Content unwrapped; its props need a new home (classNames)                                                |    12 |
| iconClassNames has no Next equivalent (Button has no icon slot)                                                 |    12 |
| Listbox.ItemContent → compose ItemIcon / ItemText / ItemDescription                                             |    12 |
| Avatar.Label → Avatar.Root label or aria-labelledby                                                             |    10 |
| Panel.Content asChild wrapped SearchList.Content: Panel.Body renders its own element                            |    10 |
| Select.Item takes `item` data ({ value, label }); children replace the whole row                                |    10 |
| size {8} has no xs–xl step                                                                                      |    10 |
| (94 more)                                                                                                       |   196 |

### `classnames`

| Conversion                                         | Count |
| -------------------------------------------------- | ----: |
| Icon shrink-0 dropped                              |    18 |
| Panel.Root dx-document → width='document'          |    11 |
| Icon text-subdued → tone='subdued'                 |    10 |
| Icon animate-spin → spin                           |     9 |
| Icon text-description → tone='description'         |     8 |
| Card.Title line-clamp-2 → lines={2}                |     7 |
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
| Icon → Next.Icon                               |   190 |
| Toolbar → Next.Toolbar                         |   186 |
| Field → Next.Field                             |   126 |
| Card → Next.Card                               |   123 |
| ScrollArea → Next.ScrollArea                   |   116 |
| Input → Next.Input                             |    66 |
| Block → Next.Block                             |    61 |
| Listbox → @dxos/react-ui-list/next             |    50 |
| SystemButton → Next.SystemButton               |    43 |
| Dialog → Next.Dialog                           |    42 |
| Select → Next.Select                           |    37 |
| Empty → Next.Empty                             |    36 |
| (77 more)                                      |   404 |

| Residue reason                                                                           | Count |
| ---------------------------------------------------------------------------------------- | ----: |
| Form: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)             |   100 |
| Flex: Flex → Container layout / Group; a layout decision                                 |    88 |
| useThemeContext: Next has no tx theme context (decision 3)                               |    76 |
| Column: Column → gutter Container (+ Block rail); restructure by hand                    |    21 |
| Grid: Grid → Container columns; a layout decision                                        |    20 |
| Avatar.Content has no Next part (run renames first, or port by hand)                     |    12 |
| type IconButtonProps has no Next counterpart                                             |    12 |
| IconBlock: IconBlock → Block + Icon                                                      |     7 |
| SelectField: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2)      |     7 |
| Toolbar.ToggleGroupIconItem has no Next part (run renames first, or port by hand)        |     7 |
| Field.Block has no Next part (run renames first, or port by hand)                        |     6 |
| type ScrollAreaRootProps has no Next counterpart                                         |     6 |
| ElevationProvider: ElevationProvider → `level` on the host                               |     5 |
| ObjectProperties: react-ui-form/next is not on this branch yet (AUDIT §7 Phase A item 2) |     5 |
| ToggleIconButton: ToggleIconButton → Next.Toggle (activeIcon)                            |     5 |
| (53 more)                                                                                |    94 |
