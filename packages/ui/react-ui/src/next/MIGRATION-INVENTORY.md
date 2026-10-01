# Next migration inventory

Snapshot of worktree `react-ui-next-design-4db6eb`, branch `claude/react-ui-next-design-4db6eb`, HEAD `590be56754`
(2026-10-01). Read-only survey for planning the single migration PR (current `@dxos/react-ui` / `react-ui-list` /
`react-ui-form` → `Next.*`). All counts come from `git grep` plus small Python import parsers (Appendix); "files"
means `.ts`/`.tsx` files under `packages/**`, excluding the defining package itself, `dist/` and `node_modules/`.

## Headline numbers

| Measure                                                                | Count                     |
| ---------------------------------------------------------------------- | ------------------------- |
| Files importing `@dxos/react-ui` (root entry, named imports)           | 1,255 in 151 packages     |
| Files importing `@dxos/react-ui-list` (root entry)                     | 87 in 39 packages         |
| Files importing `@dxos/react-ui-form` (root entry)                     | 128 in 55 packages        |
| Union of the three                                                     | 1,297 files, 153 packages |
| of which `*.stories.tsx`                                               | 198                       |
| `react-ui-form` incl. `/translations`, `/annotations` subpaths         | 147 files                 |
| `react-ui-list` incl. `/next`, `/util` subpaths                        | 91 files                  |
| Files already on Next (`@dxos/react-ui/next` or `react-ui-list/next`)  | 11 (5 plugin files)       |
| `classNames=` on a react-ui/list/form element                          | 1,139 in 490 files        |
| `classNames=` anywhere in `packages/**/*.tsx` (excl. react-ui)         | 1,653 in 664 files        |
| `density=` on a react-ui element                                       | 66 in 48 files            |
| `@dxos/react-ui-menu` importers (action-graph binding on current Menu) | 125 files, 45 packages    |

Correction to the brief: Next components do **not** forbid `classNames`. DESIGN.md decision 6 says "`className`
passes through as an escape hatch, but needing it is a design smell", and e.g. `Next.Icon` (`IconProps =
ThemedClassName<…>`), `Next.Panel.Body`, `Next.Menu.Separator` all accept `classNames`. Only react-ui-form/next
(AUDIT milestone 6) plans a "no-className test". So `classNames` usage is a styling-debt measure, not a hard
compile break.

## 1. Component usage and Next counterparts

### 1a. `@dxos/react-ui` (grouped by `src/components/<Dir>` or area)

Files / packages count every file importing any export of the group. Next = `Next.*` in `react-ui/src/next`.

| Group                                                                                          |  Files |   Pkgs | Exports used (files)                                                                                                                                  | Next counterpart                                                                                            |
| ---------------------------------------------------------------------------------------------- | -----: | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Button                                                                                         |    313 |     99 | IconButton 183, Button 114, SystemIconButton 41, ButtonGroup 6, ToggleGroup 6, ToggleIconButton 5, ToggleGroupIconItem 3, ToggleGroupItem 3, Toggle 1 | `Button` (absorbs IconButton), `SystemButton`, `Group`, `ToggleGroup`, `Toggle`                             |
| Panel                                                                                          |    248 |     91 | Panel                                                                                                                                                 | `Panel` (Root, Header, Body, Footer)                                                                        |
| Icon                                                                                           |    192 |     73 | Icon 190, IconBlock 7                                                                                                                                 | `Icon`; IconBlock → `Block`                                                                                 |
| Toolbar                                                                                        |    189 |     80 | Toolbar                                                                                                                                               | `Toolbar` (Root, Text, Link, Separator, ToggleGroup); action binding deferred                               |
| Field                                                                                          |    136 |     65 | Field                                                                                                                                                 | `Field`, `Input`, `Textarea`, `Checkbox`, `Switch`, `DateInput`, `PinInput`, `NumberInput`, `PasswordInput` |
| Card                                                                                           |    123 |     48 | Card                                                                                                                                                  | `Card` (minor gaps: ActionIconButton, Html)                                                                 |
| ScrollArea                                                                                     |    116 |     54 | ScrollArea                                                                                                                                            | `ScrollArea`                                                                                                |
| layout/Flex                                                                                    |     88 |     43 | Flex                                                                                                                                                  | `Container layout='stack'/'row'` (no 1:1)                                                                   |
| hooks                                                                                          |     79 |     45 | useThemeContext 76, useElevationContext 2, useDensityContext 1                                                                                        | none (Next has no tx/context; decision 3)                                                                   |
| Banner                                                                                         |     58 |     34 | Banner (Empty in 36 files)                                                                                                                            | **none** (`Next.Empty` decided 2026-10-01, not built)                                                       |
| Dialog                                                                                         |     56 |     23 | Dialog 42, AlertDialog 15, DIALOG_AUTOFOCUS_ATTRIBUTE 4                                                                                               | `Dialog`, `AlertDialog`, `DIALOG_AUTOFOCUS_ATTRIBUTE`                                                       |
| Tooltip                                                                                        |     37 |     20 | Tooltip 35, TextTooltip 2                                                                                                                             | `Tooltip`, `TextTooltip`                                                                                    |
| Select                                                                                         |     37 |     27 | Select                                                                                                                                                | `Select`                                                                                                    |
| Popover                                                                                        |     34 |     25 | Popover                                                                                                                                               | `Popover`                                                                                                   |
| Tag                                                                                            |     22 |     16 | Tag                                                                                                                                                   | `Tag` (no `asChild`)                                                                                        |
| Menu                                                                                           |     21 |     15 | Menu                                                                                                                                                  | `Menu`                                                                                                      |
| Column                                                                                         |     21 |     14 | Column 21, useInColumn 1, withColumn 1                                                                                                                | `Container` (+ `Block rail`); child `span` not built                                                        |
| layout/Grid                                                                                    |     20 |     16 | Grid                                                                                                                                                  | `Container columns` (no 1:1)                                                                                |
| Avatars                                                                                        |     17 |      8 | Avatar                                                                                                                                                | `Avatar` (Phase A4)                                                                                         |
| ThemeProvider area                                                                             |     17 |     16 | ThemeProvider (useTranslation re-export: 423 files, not a component)                                                                                  | keep                                                                                                        |
| theme                                                                                          |     14 |     13 | defaultTx                                                                                                                                             | none                                                                                                        |
| Tabs                                                                                           |     14 |     12 | Tabs                                                                                                                                                  | `Tabs` (master-detail parts not ported)                                                                     |
| Main                                                                                           |      9 |      4 | Main 7, useSidebars 1                                                                                                                                 | `Main` (Phase A4)                                                                                           |
| Progress                                                                                       |      7 |      7 | Progress                                                                                                                                              | `Progress`                                                                                                  |
| Splitter                                                                                       |      7 |      6 | Splitter                                                                                                                                              | `Splitter`                                                                                                  |
| Toast                                                                                          |      7 |      5 | Toast                                                                                                                                                 | `Toast`                                                                                                     |
| ErrorFallback                                                                                  |      6 |      5 | ErrorFallback, ErrorStack, ThrowError                                                                                                                 | `ErrorFallback`, `ErrorStack`                                                                               |
| ElevationProvider                                                                              |      5 |      5 | ElevationProvider                                                                                                                                     | `level` / `data-level` (no provider)                                                                        |
| Focus                                                                                          |      5 |      5 | Focus                                                                                                                                                 | `Focus`                                                                                                     |
| MediaPlayer                                                                                    |      5 |      3 | MediaPlayer                                                                                                                                           | `MediaPlayer`                                                                                               |
| ScrollContainer                                                                                |      4 |      3 | ScrollContainer                                                                                                                                       | `ScrollContainer`                                                                                           |
| Carousel                                                                                       |      4 |      3 | Carousel                                                                                                                                              | `Carousel`                                                                                                  |
| flow                                                                                           |      4 |      1 | Show 3, Switch 1                                                                                                                                      | keep (non-visual)                                                                                           |
| DensityProvider                                                                                |      3 |      3 | DensityProvider                                                                                                                                       | `size` / `data-size` (no provider)                                                                          |
| Image                                                                                          |      3 |      3 | Image                                                                                                                                                 | `Image` (dominant colour → `backdrop='dominant'`, not built)                                                |
| QrCode                                                                                         |      3 |      3 | QrCode                                                                                                                                                | `QrCode`                                                                                                    |
| Link                                                                                           |      3 |      3 | Link                                                                                                                                                  | `Link`, `Toolbar.Link`, `Card.Link`                                                                         |
| Accordion                                                                                      |      3 |      3 | Accordion                                                                                                                                             | `Accordion`                                                                                                 |
| Collapsible                                                                                    |      2 |      2 | Collapsible                                                                                                                                           | `Collapsible`                                                                                               |
| AttentionGlyph                                                                                 |      2 |      1 | AttentionGlyph                                                                                                                                        | `AttentionGlyph`                                                                                            |
| Tour                                                                                           |      2 |      2 | Tour, useTour                                                                                                                                         | `Tour`                                                                                                      |
| Editable                                                                                       |      2 |      1 | useEditable                                                                                                                                           | `Editable`, `useEditable`                                                                                   |
| Timestamp                                                                                      |      2 |      1 | Timestamp                                                                                                                                             | `Timestamp`                                                                                                 |
| Separator                                                                                      |      1 |      1 | Separator                                                                                                                                             | `Separator`                                                                                                 |
| Fieldset                                                                                       |      1 |      1 | Fieldset                                                                                                                                              | `Fieldset`                                                                                                  |
| FloatingPanel, Breadcrumb, Deferred, Skeleton, Slider, Steps, TextCrawl, HoverCard, MenuButton | 1 each | 1 each |                                                                                                                                                       | all (Phase A4)                                                                                              |
| Calendar, DatePicker, Drawer, Toc                                                              |      0 |      0 | (used only inside react-ui)                                                                                                                           | DateInput covers DatePicker                                                                                 |
| util                                                                                           |    130 |     60 | composable 123, composableProps 116, slottable 7                                                                                                      | keep (Next uses them too)                                                                                   |

Not components (re-exports of `@dxos/react-hooks`, `@dxos/ui-types`, i18n): `ThemedClassName` 229 files, `Resource`
106, `toLocalizedString` 41, `useAsyncEffect` 33, etc. They survive the migration, but `ThemedClassName` (229 files) is
the type behind every `classNames` prop.

### 1b. `@dxos/react-ui-list`

| Export                                                                                                  |  Files |   Pkgs | Next counterpart                                                                               |
| ------------------------------------------------------------------------------------------------------- | -----: | -----: | ---------------------------------------------------------------------------------------------- |
| Listbox                                                                                                 |     50 |     27 | `react-ui-list/next` `Listbox` (wraps `Next.Listbox`)                                          |
| Tree (+ TreeData, TreeModel, ColumnRenderer, IconRenderer, TREE_BLOCK, createStaticTreeModel, DropKind) |     18 |      9 | prototype `src/next/Tree` (Root, Label, Content, Item) — **not exported** from `next/index.ts` |
| Combobox                                                                                                |      7 |      6 | `Next.Combobox` (trigger mode, milestone 5 done)                                               |
| OrderedList                                                                                             |      7 |      5 | `react-ui-list/next` `OrderedList`                                                             |
| Path (util)                                                                                             |      4 |      2 | keep                                                                                           |
| Picker                                                                                                  |      2 |      2 | `Next.Combobox` (decision 9)                                                                   |
| useListSelection, useListDisclosure                                                                     | 1 each | 1 each | adapter over Ark selection (group B)                                                           |
| MasterDetail                                                                                            |      1 |      1 | **none** (needs Next Menu action binding)                                                      |
| DropIndicator                                                                                           |      1 |      1 | `Next.DropIndicator`                                                                           |

### 1c. `@dxos/react-ui-form`

No `react-ui-form/next` exists on this branch (the spike lives elsewhere), so every row below is blocking.

| Export                                                                                                               |                         Files |    Pkgs | Notes                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------: | ------: | ------------------------------------------------------------------------- |
| Form                                                                                                                 |                           100 |      52 | `Form.Root` 82 files; 88 elements, of which `variant=` 35, `fieldMap=` 11 |
| FormFieldMap / FormFieldRendererProps                                                                                |                       14 / 13 | 12 / 10 | custom renderers: must be rewritten on Next controls                      |
| omitId                                                                                                               |                            11 |      10 | util, keep                                                                |
| SelectField / createSelectField / RefField / ComboboxField / TextField / TupleField / FormFieldRow / FormFieldHeader | 7 / 2 / 2 / 1 / 1 / 1 / 3 / 1 |       — | renderer building blocks                                                  |
| FormUpdateMeta, useFormValues, useSubmitOnEnter, useFormContext, FormFieldProvider                                   |                 6, 4, 3, 3, 3 |       — | hooks, keep API                                                           |
| ObjectProperties, ObjectForm, ViewEditor, RefEditor, ObjectPicker, FieldEditor                                       |              5, 4, 4, 2, 1, 1 |       — | higher-level (milestone 10)                                               |

`fieldMap` appears in 18 `.ts/.tsx` files (31 occurrences) across 15 packages: plugin-studio 3 files, plugin-routine
2, one each in react-ui-canvas, plugin-support, plugin-assistant, stories-brain, plugin-zen, plugin-space, plugin-map,
plugin-kanban, plugin-file-system, plugin-client, react-ui-canvas-editor, plugin-terra, plugin-markdown.

`variant='settings'` (any element) appears in 38 files outside react-ui-form: plugin-client 8, plugin-space 4,
react-ui 3, plugin-connector 3, plugin-debug 2, plugin-assistant 2, and 1 each in 16 more plugins. On `Form.Root`
specifically: 35 elements.

## 2. Part and prop renames

Class: **M** mechanical (pure rename / drop, codemod by ts-morph or jscodeshift), **S** semi-mechanical (codemod
handles the common shape, a residue needs eyes), **H** manual. Counts are files / JSX occurrences from consumer files
that import the namespace from the current package.

### Panel (248 files)

| Current           | Files / occ. | Next           | Class | Notes                                                                                                                                     |
| ----------------- | -----------: | -------------- | :---: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Panel.Root`      |    246 / 578 | `Panel.Root`   |   M   | `role` passed on 122 elements stays an attribute; `classNames` on 49                                                                      |
| `Panel.Toolbar`   |    196 / 442 | `Panel.Header` |   M   | 187 of 222 elements use `asChild` (122 wrap `Toolbar.Root`, 38 `ActionToolbar`); Next Header holds the toolbar as a child: drop `asChild` |
| `Panel.Content`   |    245 / 573 | `Panel.Body`   |   S   | 135 of 285 use `asChild`; ≥34 wrap `ScrollArea.Root` directly, which Body composes itself (collapse the pair); the rest wrap custom roots |
| `Panel.Statusbar` |      24 / 52 | `Panel.Footer` |   M   |                                                                                                                                           |

### Toolbar (189 files)

| Current                                                    |                                        Files / occ. | Next                                           | Class | Notes                                                     |
| ---------------------------------------------------------- | --------------------------------------------------: | ---------------------------------------------- | :---: | --------------------------------------------------------- |
| `Toolbar.Root`                                             |                                           183 / 402 | `Toolbar.Root`                                 |   M   | `density=` on 6                                           |
| `Toolbar.IconButton`                                       |                                            50 / 110 | `Button iconOnly` (joins roving focus by hook) |   M   | `iconOnly` on 89 of 110; without it → `Button icon label` |
| `Toolbar.Button`                                           |                                            30 / 117 | `Button`                                       |   M   |                                                           |
| `Toolbar.Separator`                                        |                                             29 / 37 | `Toolbar.Separator`                            |   S   | `variant=` on 12 (`gap`/`line`) — check Next semantics    |
| `Toolbar.Text`                                             |                                             29 / 65 | `Toolbar.Text`                                 |   M   |                                                           |
| `Toolbar.ToggleGroup`                                      |                                             10 / 22 | `Toolbar.ToggleGroup`                          |   M   |                                                           |
| `Toolbar.ToggleGroupItem`                                  |                                              6 / 16 | `ToggleGroup.Item`                             |   M   | decision 35                                               |
| `Toolbar.ToggleGroupIconItem`                              |                                               5 / 7 | `ToggleGroup.Item` + icon                      |   S   |                                                           |
| `Toolbar.Link`, `Toolbar.DragHandle`                       |                                        1 / 2, 1 / 1 | `Toolbar.Link`, `DragHandle`                   |   M   |                                                           |
| react-ui-menu `MenuBuilder`/`useMenuActions`/`ToolbarMenu` | 125 files (MenuBuilder 113 occ., useMenuActions 48) | **none**                                       |   H   | Phase 4 action binding not built                          |

### Buttons (313 files)

| Current                   | Files / elements | Next                           | Class | Notes                                                                                                                                                                                                   |
| ------------------------- | ---------------: | ------------------------------ | :---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IconButton`              |        183 / 347 | `Button icon label [iconOnly]` |   M   | `iconOnly` 277, `size` 45 (drop), `density` 26 (drop), `noTooltip` 12 → `showTooltip={false}`, `iconClassNames` 9 (no equivalent: H), `iconEnd` 5 (boolean → icon name: S), `square` (deprecated, drop) |
| `Button`                  |        114 / 212 | `Button`                       |   M   | `variant` 93 (ghost/primary/destructive/outline map 1:1)                                                                                                                                                |
| `SystemIconButton.*`      |         41 / 33+ | `SystemButton.*`               |   M   | `.Clipboard` 31 files; Star, Close, Mic, Upload, Add, Download, Disclosure all exist in Next                                                                                                            |
| `ToggleIconButton`        |            5 / 5 | `Toggle` (`activeIcon`)        |   S   |                                                                                                                                                                                                         |
| `ButtonGroup`             |            6 / 8 | `Group`                        |   M   |                                                                                                                                                                                                         |
| `ToggleGroup`/`Item`      |            6 / 3 | `ToggleGroup.Root/Item`        |   M   |                                                                                                                                                                                                         |
| `variant='tag'` on Button |                3 | `Button hue` or `Tag`          |   S   | decision 34/40                                                                                                                                                                                          |

### Icon (192 files)

| Current           | Files / elements | Next             | Class | Notes                                                                                                                     |
| ----------------- | ---------------: | ---------------- | :---: | ------------------------------------------------------------------------------------------------------------------------- |
| `Icon size=`      |        108 / 161 | removed          |   S   | values: `{4}` 62, `{6}` 23, `{5}` 21, `{3}` 13, `{8}` 7, other 35; Next sizes from `--nx-icon-size` (md = size-4)         |
| `Icon classNames` |        100 / 139 | `hue`/`valence`  |   S   | colour classes (`text-description`, `text-subdued`, `text-success-text`) → `valence`/`hue`; `animate-spin` 7 needs a prop |
| `IconBlock`       |           7 / 17 | `Block` + `Icon` |   S   |                                                                                                                           |

### Field (136 files)

| Current                          |        Files / occ. | Next                                                                       | Class |
| -------------------------------- | ------------------: | -------------------------------------------------------------------------- | :---: |
| `Field.Root`                     |           101 / 287 | `Field.Root`                                                               |   M   |
| `Field.Input`                    |             79 / 95 | `Input` (`type=number` → `NumberInput`, `type=password` → `PasswordInput`) |   S   |
| `Field.Label`                    |            49 / 143 | `Field.Label`                                                              |   M   |
| `Field.Switch`                   |             30 / 41 | `Switch` (label as prop)                                                   |   S   |
| `Field.Checkbox`                 |             19 / 30 | `Checkbox` (label as prop)                                                 |   S   |
| `Field.Textarea`                 |              9 / 10 | `Textarea`                                                                 |   M   |
| `Field.ErrorText` / `HelperText` |       5 / 10, 4 / 8 | same                                                                       |   M   |
| `Field.Block`                    |              5 / 12 | none (controls occupy a block cell)                                        |   S   |
| `Field.Date`/`Time`/`DateTime`   | 2 / 5, 2 / 5, 4 / 9 | `DateInput granularity`                                                    |   S   |
| `Field.TriggerIcon`              |               3 / 5 | DateInput trigger or `Button` in `end` slot                                |   H   |
| `Field.PinInput`                 |               1 / 1 | `PinInput`                                                                 |   M   |
| `Fieldset.*`                     |               1 / 6 | `Fieldset.*` (renders `div role=group`)                                    |   M   |

### Card (123 files)

| Current                                                    |                            Files / occ. | Next               | Class | Notes                                                                           |
| ---------------------------------------------------------- | --------------------------------------: | ------------------ | :---: | ------------------------------------------------------------------------------- |
| `Card.Root`                                                |                                89 / 209 | `Card.Root`        |   S   | `fullWidth` on 40 of 90 (dropped: width belongs to host); `border` 26 kept      |
| `Card.Header/Title/Body/Row/Text/Section/Poster/Menu/Link` | 68, 70, 63, 62, 47, 12, 11, 15, 3 files | same names         |   M   | `Card.Text variant='description'` 46 → `Card.Text` tone / `Typography tone` (S) |
| `Card.Block`                                               |                                61 / 192 | `Block`            |   M   |                                                                                 |
| `Card.DragHandle`                                          |                                 12 / 14 | `DragHandle`       |   M   | decision 35                                                                     |
| `Card.Action`                                              |                                   4 / 7 | `Card.Row onClick` |   S   |                                                                                 |
| `Card.ActionIconButton`                                    |                                   6 / 8 | **none** (Phase 4) |   H   |                                                                                 |

### Dialog / AlertDialog (56 files)

| Current                                                                |              Files / occ. | Next                     | Class |
| ---------------------------------------------------------------------- | ------------------------: | ------------------------ | :---: |
| `Dialog.Root/Content/Title/Header/Body/Description/Trigger`            |  23, 28, 24, 20, 25, 3, 2 | same                     |   M   |
| `Dialog.Overlay`, `Dialog.Portal`                                      |            21 / 42, 3 / 6 | bundled (rule 9): unwrap |   M   |
| `Dialog.Close`                                                         |                   23 / 59 | `Dialog.CloseTrigger`    |   M   |
| `Dialog.ActionBar`                                                     |                    9 / 20 | `Dialog.Footer`          |   M   |
| `Dialog.ActionIconButton`                                              |                   14 / 15 | **none** (Phase 4)       |   H   |
| `Dialog.Heading`                                                       |                     2 / 2 | `Dialog.Title`?          |   S   |
| `AlertDialog.Root/Content/Title/Description/Body/Header/Action/Cancel` | 13, 10, 8, 10, 9, 1, 7, 6 | same                     |   M   |
| `AlertDialog.Overlay`, `Portal`                                        |            12 / 22, 2 / 4 | bundled                  |   M   |
| `AlertDialog.ActionBar`                                                |                    7 / 14 | `AlertDialog.Footer`     |   M   |

### Popover, Tooltip, Select, Menu

| Current                                                               |            Files / occ. | Next                                                  |         Class          |
| --------------------------------------------------------------------- | ----------------------: | ----------------------------------------------------- | :--------------------: |
| `Popover.Root/Trigger/Anchor/Content`                                 |           26, 15, 4, 28 | same                                                  |           M            |
| `Popover.Portal`, `Popover.Arrow`                                     |        26 / 56, 27 / 29 | bundled (arrow on by default)                         |           M            |
| `Popover.Viewport`                                                    |                 22 / 47 | `Popover.Body` (scrolling)                            |           M            |
| `Popover.Close`                                                       |                   3 / 6 | `Popover.CloseTrigger`                                |           M            |
| `Popover.VirtualTrigger`                                              |                 11 / 11 | Root `positioning.getAnchorRect`                      |           H            |
| `Tooltip.Provider`                                                    |                 13 / 37 | removed (zag store is global)                         |           M            |
| `Tooltip.Trigger`                                                     |                 25 / 55 | `Tooltip.Trigger content side`                        |           M            |
| `Select.Root`                                                         |                 37 / 81 | `Select.Root` (string values only, 2.14)              |           S            |
| `Select.TriggerButton`                                                |                 37 / 42 | `Select.Trigger`                                      |           M            |
| `Select.Portal`, `Select.Viewport`                                    |            36 / 78 each | bundled                                               |           M            |
| `Select.Content`                                                      |                 37 / 80 | `Select.Content`                                      |           M            |
| `Select.Option` / `Select.Item`                                       |          34 / 92, 3 / 8 | `Select.Item` (`item` data; children replace the row) |           S            |
| `Select.Group`, `Select.ItemText`                                     |            1 / 2, 1 / 4 | `Select.ItemGroup`, `Select.ItemText`                 |           M            |
| `Menu.Root/Trigger/Content/Item/Separator/CheckboxItem/ItemIndicator` | 20, 15, 19, 17, 6, 3, 2 | same                                                  | M (Item: S, item data) |
| `Menu.Portal`, `Menu.Viewport`, `Menu.Arrow`                          |              12, 17, 13 | bundled                                               |           M            |
| `Menu.VirtualTrigger`                                                 |                   6 / 6 | Root `positioning.getAnchorRect`                      |           H            |
| `Menu.Sub` / `SubTrigger` / `SubContent`                              |              1 / 2 each | `Menu.Sub` / `TriggerItem` / nested Content           |           S            |
| `Menu.Group`                                                          |                   1 / 2 | `Menu.ItemGroup`                                      |           M            |
| `Menu.RadioGroup`                                                     |                       0 | `Menu.RadioItemGroup`                                 |           M            |

### ScrollArea, Column, layout

| Current                              |                                Files / occ. | Next                                                                       | Class |
| ------------------------------------ | ------------------------------------------: | -------------------------------------------------------------------------- | :---: |
| `ScrollArea.Root` / `Viewport`       |                        116 / 245, 116 / 246 | same; `padding`/`centered` → Container gutter; inside Panel → `Panel.Body` |   S   |
| `Column.Root` / `Center` / `Section` |                    13 / 28, 15 / 43, 5 / 10 | gutter Container / default placement / `gutter='inherit'` Container        |   S   |
| `Flex`                               | 88 files (174 elements, `classNames` on 96) | `Container layout`                                                         |   H   |
| `Grid`                               |                      20 files (34 elements) | `Container columns`                                                        |   H   |

### react-ui-list

| Current                                                                                 | Files / occ. | Next (`react-ui-list/next`)                                                                        | Class |
| --------------------------------------------------------------------------------------- | -----------: | -------------------------------------------------------------------------------------------------- | :---: |
| `Listbox.Root/Content/Item`                                                             |   46, 45, 43 | same; Item takes `id`; `classNames` on 36 of 50 Items                                              |   S   |
| `Listbox.ItemLabel`                                                                     |      15 / 36 | `Listbox.ItemText`                                                                                 |   M   |
| `Listbox.Viewport`                                                                      |      13 / 29 | `Listbox.Content scroll` (Viewport belongs to ScrollArea)                                          |   S   |
| `Listbox.ItemContent`                                                                   |      11 / 13 | children composed from ItemIcon/ItemText/ItemDescription                                           |   H   |
| `Listbox.Indicator`                                                                     |        4 / 6 | `Listbox.ItemIndicator`                                                                            |   M   |
| `OrderedList.Root/Content/Item/DragHandle`                                              |   7, 7, 5, 4 | same                                                                                               |   M   |
| `OrderedList.DetailItem`                                                                |        2 / 4 | `Item collapsible` + `OrderedList.Detail` (not built; `DetailItem` still in next)                  |   H   |
| `OrderedList.Title`                                                                     |        1 / 1 | `OrderedList.ItemText`                                                                             |   M   |
| `OrderedList.IconButton` / `DeleteButton`                                               | 1 / 1, 2 / 2 | `Button` / `SystemButton.Remove`                                                                   |   M   |
| `Combobox.*` (Root, Input, Trigger, Content, List, Item, Empty, Portal, VirtualTrigger) |      7 files | `Next.Combobox` (Control, Input, Trigger, Content, List, Item, Empty; virtual via `getAnchorRect`) |   S   |
| `Picker.*`                                                                              |       2 / 11 | `Next.Combobox` trigger mode                                                                       |   H   |
| `Tree` + model types                                                                    |           18 | next Tree prototype (unexported)                                                                   |   H   |

### react-ui-form

| Current                                                                                  |                           Files / occ. | Next                               |                    Class                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------: | ---------------------------------- | :------------------------------------------: |
| `Form.Root/Viewport/Content/Fields/FieldSet/Field/Actions/Submit/Layout/Label/ErrorText` | 82, 68, 80, 59, 53, 30, 15, 4, 3, 2, 2 | react-ui-form/next (not on branch) | S once it exists (names expected to be kept) |
| `variant='settings'`                                                                     |                        35 on Form.Root | settings layout (group C decision) |                      S                       |
| `fieldMap` renderers                                                                     |                     18 files / 15 pkgs | rewrite each renderer on `Next.*`  |                      H                       |
| `FormFieldRendererProps` implementations                                                 |                               14 files | same                               |                      H                       |

### Cross-cutting props

| Prop                      | Count                                                                                                                                         | Next                                                  | Class |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | :---: |
| `density=` on elements    | 66 in 48 files (`sm` 51, `md` 6, `lg` 3, expr 6); IconButton 26, SystemIconButton.Clipboard 9, Button 6, Toolbar.Root 6, Toolbar.IconButton 4 | `size` on the nearest Container/Panel/Toolbar (xs–xl) |   S   |
| `DensityProvider`         | 3 files (10 occ.)                                                                                                                             | `Container size`                                      |   M   |
| `useDensityContext`       | 1 file outside react-ui (3 occ.)                                                                                                              | none (CSS)                                            |   H   |
| `elevation=`              | 6 in 6 files; `ElevationProvider` 5 files; `useElevationContext` 2 files                                                                      | `level`                                               |   S   |
| `useThemeContext` (`tx`)  | 76 files / 43 pkgs                                                                                                                            | none                                                  |   H   |
| `classNames=` on elements | 1,139 in 490 files                                                                                                                            | props/parts; escape hatch kept                        |   H   |

## 3. `classNames` on react-ui components

Totals: **1,139** `classNames=` props on elements whose tag is imported from `@dxos/react-ui`, `-list` or `-form`, in
**490** files; plus **46** raw `className=` on such elements (Listbox.ItemContent 12, Popover.Content 5, Flex 4,
Banner.Empty 4, Tooltip.Trigger 4, Listbox.Item 4, Listbox.Viewport 4, …). Value shapes: string literal 862, `mx(…)`
71, array 85, other expression 119, `{'…'}` 2.

By element (classNames props / files / total elements of that tag):

| Element                                          |   Props |            Files |          Elements |
| ------------------------------------------------ | ------: | ---------------: | ----------------: |
| Icon                                             |     139 |              100 |               324 |
| Flex                                             |      96 |               63 |               174 |
| IconButton                                       |      92 |               53 |               347 |
| Panel.Content                                    |      64 |               58 |               285 |
| Panel.Root                                       |      49 |               45 |               286 |
| Field.Input                                      |      39 |               32 |                94 |
| Card.Root                                        |      37 |               36 |                90 |
| Toolbar.Root                                     |      36 |               31 |               204 |
| Listbox.Item                                     |      36 |               30 |                50 |
| ScrollArea.Viewport                              |      34 |               33 |               120 |
| Button                                           |      30 |               25 |               212 |
| Grid                                             |      26 |               15 |                34 |
| Card.Text                                        |      24 |               22 |                70 |
| Listbox.Content                                  |      21 |               19 |                53 |
| Select.TriggerButton                             |      19 |               17 |                40 |
| ScrollArea.Root                                  |      18 |               18 |               120 |
| Field.Label                                      |      17 |               14 |                69 |
| Banner.Empty                                     |      15 |                9 |                41 |
| Card.Title                                       |      14 |               14 |                74 |
| Popover.Content                                  |      14 |               11 |                30 |
| Panel.Toolbar                                    |      12 |               12 |               222 |
| Tabs.Panel / Toolbar.Text / Tag / Banner.Content | 12 each | 6 / 10 / 10 / 11 | 20 / 32 / 33 / 35 |
| Panel.Statusbar                                  |      11 |                9 |                26 |
| Card.Row                                         |      11 |                9 |               113 |

Top 20 whole `classNames` string literals:

| Value                      | Count | Typical host / Next replacement                                        |
| -------------------------- | ----: | ---------------------------------------------------------------------- |
| `w-full`                   |    24 | Select.TriggerButton 7, Button 3 → Container/Group `fill`, track width |
| `dx-expand`                |    22 | Panel.Toolbar 7, Flex 5, Banner.Empty 3 → Panel Header sizing          |
| `dx-document`              |    21 | Panel.Root 11, Toolbar.Root 6 → Container gutter / document width      |
| `p-2`                      |    13 | Container gutter                                                       |
| `h-full`                   |    13 | Panel/ScrollArea fill                                                  |
| `min-w-0`                  |    12 | Container cell (subgrid)                                               |
| `text-sm`                  |    12 | `size` / Typography                                                    |
| `text-description`         |    11 | `Typography tone='description'`, Icon `valence`                        |
| `grow`                     |    10 | Container layout                                                       |
| `gap-1`                    |     9 | Container `gap`                                                        |
| `line-clamp-2`             |     9 | Typography (only `truncate` today)                                     |
| `p-0`                      |     9 | gutter `none`                                                          |
| `shrink-0`                 |     9 | Block                                                                  |
| `animate-spin`             |     8 | Icon (no spin prop in Next)                                            |
| `gap-2`                    |     8 | Container `gap`                                                        |
| `cursor-pointer`           |     8 | clickable parts (`onClick`)                                            |
| `text-sm text-description` |     7 | Typography tone + size                                                 |
| `overflow-hidden`          |     7 | ScrollArea / Container                                                 |
| `shrink-0 text-subdued`    |     6 | Icon valence                                                           |
| `flex flex-col`            |     6 | Container `layout='stack'`                                             |

Most common individual classes inside those props: flex 71, grid 56, w-full 55, gap-2 51, text-sm 49, shrink-0 49,
items-center 44, text-description 42, flex-col 41, px-2 35, min-w-0 32, p-2 32, h-full 31, dx-expand 28, dx-document
27, p-1 26, cursor-pointer 25, overflow-hidden 24, gap-1 24, font-mono 23, text-xs 23, rounded-sm 22, text-subdued 20.
Layout classes (flex/grid/gap/padding/width) dominate, so most removals are "replace the element with a Container",
which is manual.

## 4. Theme: text colours and density

DESIGN.md "Text emphasis" renames these when the old components go: base → `--nx-text`, description →
`--nx-text-muted`, subdued → `--nx-text-subtle`.

| Utility / variable    |                 `.ts/.tsx` occ. | `.ts/.tsx` files | Packages (ts/tsx/css) | Target             |
| --------------------- | ------------------------------: | ---------------: | --------------------: | ------------------ |
| `text-description`    |                             533 |              271 |                    88 | `--nx-text-muted`  |
| `text-subdued`        |                             186 |              111 |                    52 | `--nx-text-subtle` |
| `text-base-fg`        |                              53 |               34 |                    17 | `--nx-text`        |
| `text-placeholder`    |                               7 |                6 |                     5 | (host-derived)     |
| `--color-description` | 37 occ. in 24 files (all types) |                  |                       | `--nx-text-muted`  |
| `--color-subdued`     |             22 occ. in 11 files |                  |                       | `--nx-text-subtle` |
| `--color-base-fg`     |             22 occ. in 11 files |                  |                       | `--nx-text`        |

Other text colours (ts/tsx occurrences): text-error-text 72, text-accent-text 31, text-success-text 28,
text-warning-text 17, text-info-text 14, text-green-text 10, text-blue-text 8, text-accent-fg 8, text-inverse-fg 7.
Not in the emphasis rename; Next maps message colours to `valence`. The `text-description`/`text-subdued` rename is a
pure token rename (**M**, one regex pass over ts/tsx/css), provided it runs after the old components are deleted.

Density and elevation (outside `packages/ui/react-ui`):

| Symbol                          |                                    Occurrences / files |
| ------------------------------- | -----------------------------------------------------: |
| `density=` (any element)        |                                                67 / 51 |
| `density=` on react-ui elements | 66 / 48 (`'sm'` 51, `'md'` 6, `'lg'` 3, expressions 6) |
| `density:` (object keys)        |                                                  3 / 2 |
| `DensityProvider`               |                                                 10 / 3 |
| `useDensityContext`             |                                                  3 / 1 |
| `Density` (type, any use)       |                                                47 / 18 |
| `elevation=`                    |                                                  6 / 6 |
| `ElevationProvider`             |                                                 15 / 5 |
| `useElevationContext`           |                                                  4 / 2 |

## 5. Translations consumed via `osTranslations` (`org.dxos.i18n.os`)

react-ui and react-ui-list call `useTranslation(osTranslations)` in four places; the namespace is populated only by
`plugin-theme/src/translations.ts` (the sole `[osTranslations]:` block).

| Consumer                                                                | Key                    | Defined in `osTranslations`?                                   |
| ----------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| react-ui-list `components/OrderedList/OrderedListItem.tsx` (DragHandle) | `drag-handle.label`    | **No** (only in `org.dxos.i18n.shell`, sdk/shell)              |
| same (DeleteButton)                                                     | `delete.label`         | yes (plugin-theme)                                             |
| same (expand caret)                                                     | `toggle-expand.label`  | yes (plugin-theme)                                             |
| react-ui-list `next/OrderedList/OrderedList.tsx` (DragHandle)           | `drag-handle.label`    | **No**                                                         |
| react-ui `components/Dialog/Dialog.tsx` (`ActionIconButton` close)      | `close-dialog.label`   | yes (plugin-theme)                                             |
| same (`ActionIconButton` delete)                                        | `toolbar-delete.label` | **No** (defined under `@dxos/react-ui` translationKey instead) |
| react-ui `components/Main/Main.tsx` (drawer resize handle)              | `drawer.resize.label`  | **No** (defined under `@dxos/react-ui` translationKey instead) |

Four lookups resolve to a key that the `osTranslations` namespace does not define, so they would render the raw key
unless a fallback namespace supplies it. Group B (point 21) moves list chrome strings into react-ui translations;
the migration should move all seven lookups off `osTranslations`.

## 6. Package ordering (batches)

Tier = location (0 `packages/ui`, 1 sdk/devtools/stories/common, 2 plugins, 3 apps). Depth = longest chain of
`dependencies`/`peerDependencies`/`devDependencies` through other consuming packages (0 = depends on no other
consumer), so a batch at depth _n_ only needs batches < _n_ done. Columns are files importing each root entry.

Totals per tier: UI 43 packages / 350 files; SDK etc. 16 / 168; plugins 91 / 756; apps 3 / 23.

Suggested batches: (1) tier 0 depth 0–4 (leaf UI libs plus react-ui-menu, react-ui-list); (2) tier 0 depth 5–19
(editor, mosaic, components, form, table, canvas); (3) tier 1 (shell 45, devtools 53, app-toolkit, stories); (4)
plugins in depth order, big ones isolated: plugin-inbox 44, plugin-space 43, plugin-assistant 41, plugin-deck 29,
plugin-debug 24, plugin-studio 24, plugin-script 22, plugin-navtree 21; (5) apps.

#### Tier 0: UI packages (packages/ui) (43 packages, 350 files)

| Depth | Package                             | react-ui | react-ui-list | react-ui-form | Files |
| ----: | ----------------------------------- | -------: | ------------: | ------------: | ----: |
|     0 | `@dxos/brand`                       |        3 |             0 |             0 |     3 |
|     0 | `@dxos/react-ui-audio`              |        1 |             0 |             0 |     1 |
|     0 | `@dxos/react-ui-calendar`           |        4 |             0 |             0 |     4 |
|     0 | `@dxos/react-ui-dashboard`          |        1 |             0 |             0 |     1 |
|     0 | `@dxos/react-ui-dnd`                |        1 |             0 |             0 |     1 |
|     0 | `@dxos/react-ui-gameboard`          |        5 |             0 |             0 |     5 |
|     0 | `@dxos/react-ui-geo`                |        9 |             0 |             0 |     9 |
|     0 | `@dxos/react-ui-masonry`            |        2 |             0 |             0 |     2 |
|     0 | `@dxos/react-ui-pickers`            |        7 |             0 |             0 |     7 |
|     0 | `@dxos/react-ui-syntax-highlighter` |        3 |             0 |             0 |     3 |
|     0 | `@dxos/react-ui-terminal`           |        1 |             0 |             0 |     1 |
|     0 | `@dxos/react-ui-virtual`            |        3 |             0 |             0 |     3 |
|     0 | `@dxos/ui-icons`                    |        1 |             0 |             0 |     1 |
|     1 | `@dxos/react-ui-board`              |        5 |             0 |             0 |     5 |
|     1 | `@dxos/react-ui-experimental`       |       11 |             0 |             0 |    11 |
|     1 | `@dxos/react-ui-graph`              |       12 |             0 |             0 |    12 |
|     3 | `@dxos/react-ui-menu`               |        8 |             0 |             0 |     8 |
|     4 | `@dxos/react-ui-list`               |       23 |             0 |             0 |    23 |
|     5 | `@dxos/react-ui-debug`              |        4 |             1 |             0 |     4 |
|     5 | `@dxos/react-ui-editor`             |       21 |             1 |             0 |    21 |
|     5 | `@dxos/react-ui-rdf`                |        1 |             1 |             0 |     1 |
|     5 | `@dxos/react-ui-search`             |        5 |             1 |             0 |     5 |
|     6 | `@dxos/react-ui-diagram`            |        2 |             0 |             0 |     2 |
|     6 | `@dxos/react-ui-grid`               |        2 |             1 |             0 |     2 |
|     6 | `@dxos/react-ui-markdown`           |        5 |             0 |             0 |     5 |
|     6 | `@dxos/react-ui-mosaic`             |       18 |             0 |             0 |    18 |
|     6 | `@dxos/react-ui-transcription`      |        3 |             0 |             0 |     3 |
|     7 | `@dxos/react-ui-card`               |        6 |             0 |             0 |     6 |
|     7 | `@dxos/react-ui-components`         |       24 |             0 |             0 |    24 |
|     7 | `@dxos/react-ui-task`               |       14 |             3 |             0 |    15 |
|     7 | `@dxos/react-ui-thread`             |        3 |             0 |             0 |     3 |
|     8 | `@dxos/react-ui-chat`               |        9 |             0 |             0 |     9 |
|     8 | `@dxos/react-ui-feed`               |       12 |             0 |             0 |    12 |
|     8 | `@dxos/react-ui-form`               |       39 |             5 |             0 |    40 |
|     8 | `@dxos/react-ui-trace`              |        7 |             1 |             0 |     7 |
|     9 | `@dxos/react-ui-assistant`          |        6 |             0 |             0 |     6 |
|     9 | `@dxos/react-ui-canvas`             |       14 |             0 |             2 |    14 |
|     9 | `@dxos/react-ui-introspect`         |        5 |             3 |             1 |     6 |
|     9 | `@dxos/react-ui-mcp`                |        2 |             1 |             1 |     2 |
|     9 | `@dxos/react-ui-table`              |       12 |             0 |             5 |    13 |
|     9 | `@dxos/ui-template`                 |        2 |             3 |             2 |     4 |
|    10 | `@dxos/react-ui-canvas-editor`      |       12 |             0 |             1 |    12 |
|    19 | `@dxos/react-ui-canvas-compute`     |       16 |             0 |             1 |    16 |

#### Tier 1: SDK, devtools, stories, common (16 packages, 168 files)

| Depth | Package                   | react-ui | react-ui-list | react-ui-form | Files |
| ----: | ------------------------- | -------: | ------------: | ------------: | ----: |
|     0 | `@dxos/storybook-utils`   |        2 |             0 |             0 |     2 |
|     1 | `@dxos/react-client`      |        4 |             0 |             0 |     4 |
|     2 | `@dxos/app-graph`         |        1 |             0 |             0 |     1 |
|     2 | `dxos-example-template`   |        2 |             0 |             0 |     2 |
|     5 | `@dxos/app-framework`     |        5 |             1 |             0 |     5 |
|     5 | `@dxos/shell`             |       45 |            10 |             0 |    45 |
|     6 | `@dxos/app-toolkit`       |       12 |             3 |             0 |    14 |
|     9 | `@dxos/stories-lens`      |        3 |             0 |             1 |     3 |
|    10 | `@dxos/devtools`          |       53 |             1 |             0 |    53 |
|    16 | `@dxos/storybook-testing` |        8 |             1 |             0 |     8 |
|    18 | `@dxos/assistant-toolkit` |        1 |             0 |             0 |     1 |
|    18 | `@dxos/examples`          |        2 |             0 |             0 |     2 |
|    26 | `@dxos/stories-assistant` |        9 |             0 |             0 |     9 |
|    26 | `@dxos/stories-brain`     |       12 |             3 |             2 |    12 |
|    26 | `@dxos/stories-inbox`     |        6 |             0 |             0 |     6 |
|    26 | `@dxos/stories-projects`  |        1 |             0 |             0 |     1 |

#### Tier 2: Plugins (packages/plugins) (91 packages, 756 files)

| Depth | Package                      | react-ui | react-ui-list | react-ui-form | Files |
| ----: | ---------------------------- | -------: | ------------: | ------------: | ----: |
|     7 | `@dxos/plugin-claude`        |        1 |             0 |             0 |     1 |
|     7 | `@dxos/plugin-graph`         |        0 |             2 |             0 |     2 |
|     7 | `@dxos/plugin-theme`         |        3 |             0 |             0 |     3 |
|     8 | `@dxos/plugin-attention`     |        1 |             1 |             0 |     1 |
|     9 | `@dxos/plugin-pwa`           |        2 |             0 |             1 |     2 |
|     9 | `@dxos/plugin-settings`      |        0 |             0 |             1 |     1 |
|    10 | `@dxos/plugin-testing`       |        3 |             0 |             0 |     3 |
|    11 | `@dxos/plugin-observability` |        2 |             0 |             1 |     2 |
|    12 | `@dxos/plugin-client`        |       18 |             3 |             8 |    18 |
|    12 | `@dxos/plugin-deck`          |       29 |             2 |             1 |    29 |
|    12 | `@dxos/plugin-registry`      |       11 |             0 |             1 |    11 |
|    13 | `@dxos/plugin-calls`         |       11 |             0 |             0 |    11 |
|    13 | `@dxos/plugin-doctor`        |        2 |             0 |             0 |     2 |
|    13 | `@dxos/plugin-mobile`        |       13 |             0 |             0 |    13 |
|    13 | `@dxos/plugin-navtree`       |       18 |             8 |             0 |    21 |
|    13 | `@dxos/plugin-payments`      |        2 |             0 |             1 |     2 |
|    13 | `@dxos/plugin-preview`       |       12 |             0 |             2 |    12 |
|    13 | `@dxos/plugin-search`        |        7 |             1 |             0 |     7 |
|    13 | `@dxos/plugin-status-bar`    |        5 |             0 |             0 |     5 |
|    13 | `@dxos/plugin-transformer`   |        1 |             0 |             0 |     1 |
|    14 | `@dxos/plugin-iroh-beacon`   |        2 |             0 |             0 |     2 |
|    14 | `@dxos/plugin-progress`      |        2 |             0 |             0 |     2 |
|    14 | `@dxos/plugin-space`         |       41 |             6 |            13 |    43 |
|    14 | `@dxos/plugin-spotlight`     |        2 |             0 |             0 |     2 |
|    15 | `@dxos/plugin-code`          |        7 |             0 |             1 |     7 |
|    15 | `@dxos/plugin-explorer`      |        7 |             0 |             0 |     7 |
|    15 | `@dxos/plugin-game`          |        4 |             0 |             1 |     4 |
|    15 | `@dxos/plugin-illustrator`   |        7 |             0 |             1 |     7 |
|    15 | `@dxos/plugin-kanban`        |        7 |             0 |             3 |    10 |
|    15 | `@dxos/plugin-lametric`      |        1 |             0 |             0 |     1 |
|    15 | `@dxos/plugin-library`       |        7 |             0 |             1 |     7 |
|    15 | `@dxos/plugin-map`           |        4 |             0 |             2 |     6 |
|    15 | `@dxos/plugin-qa`            |        6 |             0 |             0 |     6 |
|    15 | `@dxos/plugin-sample`        |        8 |             1 |             1 |     9 |
|    15 | `@dxos/plugin-sequencer`     |        4 |             1 |             0 |     4 |
|    15 | `@dxos/plugin-spacetime`     |        7 |             0 |             0 |     7 |
|    15 | `@dxos/plugin-stream-deck`   |        5 |             0 |             0 |     5 |
|    15 | `@dxos/plugin-support`       |       15 |             0 |             5 |    17 |
|    15 | `@dxos/plugin-table`         |        3 |             0 |             0 |     3 |
|    15 | `@dxos/plugin-template`      |        2 |             0 |             0 |     2 |
|    15 | `@dxos/plugin-terra`         |        8 |             0 |             1 |     8 |
|    15 | `@dxos/plugin-thread`        |        5 |             0 |             1 |     6 |
|    15 | `@dxos/plugin-voxel`         |        4 |             0 |             0 |     4 |
|    15 | `@dxos/plugin-zen`           |        4 |             1 |             2 |     5 |
|    16 | `@dxos/plugin-chess`         |        5 |             0 |             0 |     5 |
|    16 | `@dxos/plugin-excalidraw`    |        3 |             0 |             1 |     4 |
|    16 | `@dxos/plugin-tldraw`        |        8 |             0 |             0 |     8 |
|    17 | `@dxos/plugin-canvas`        |        2 |             0 |             0 |     2 |
|    17 | `@dxos/plugin-chess-com`     |        2 |             0 |             0 |     2 |
|    17 | `@dxos/plugin-markdown`      |       17 |             0 |             1 |    17 |
|    18 | `@dxos/plugin-board`         |        2 |             0 |             1 |     2 |
|    18 | `@dxos/plugin-crx`           |        3 |             0 |             1 |     3 |
|    18 | `@dxos/plugin-file`          |       10 |             0 |             3 |    11 |
|    18 | `@dxos/plugin-file-system`   |        2 |             0 |             1 |     2 |
|    18 | `@dxos/plugin-lingo`         |        8 |             0 |             0 |     8 |
|    18 | `@dxos/plugin-mermaid`       |        1 |             0 |             0 |     1 |
|    18 | `@dxos/plugin-presenter`     |        9 |             0 |             0 |     9 |
|    18 | `@dxos/plugin-review`        |       10 |             0 |             2 |    11 |
|    18 | `@dxos/plugin-stack`         |        3 |             0 |             0 |     3 |
|    18 | `@dxos/plugin-transcription` |        6 |             1 |             0 |     6 |
|    18 | `@dxos/plugin-video`         |        8 |             0 |             0 |     8 |
|    19 | `@dxos/plugin-bookmarks`     |        4 |             0 |             0 |     4 |
|    19 | `@dxos/plugin-commerce`      |        8 |             0 |             1 |     8 |
|    19 | `@dxos/plugin-routine`       |       15 |             2 |             6 |    16 |
|    19 | `@dxos/plugin-sheet`         |        9 |             0 |             1 |    10 |
|    19 | `@dxos/plugin-wnfs`          |        1 |             0 |             0 |     1 |
|    20 | `@dxos/plugin-conductor`     |        2 |             0 |             0 |     2 |
|    20 | `@dxos/plugin-connector`     |        9 |             2 |             5 |     9 |
|    20 | `@dxos/plugin-magazine`      |       16 |             0 |             1 |    16 |
|    21 | `@dxos/plugin-atproto`       |        3 |             1 |             0 |     3 |
|    21 | `@dxos/plugin-blogger`       |        3 |             0 |             1 |     3 |
|    21 | `@dxos/plugin-github`        |       19 |             2 |             2 |    19 |
|    21 | `@dxos/plugin-ibkr`          |        9 |             1 |             2 |     9 |
|    21 | `@dxos/plugin-inbox`         |       44 |             0 |             4 |    44 |
|    22 | `@dxos/plugin-meeting`       |        4 |             1 |             0 |     4 |
|    22 | `@dxos/plugin-pipeline`      |        5 |             1 |             3 |     7 |
|    22 | `@dxos/plugin-tasks`         |       20 |             0 |             2 |    20 |
|    22 | `@dxos/plugin-trip`          |        8 |             0 |             3 |     8 |
|    23 | `@dxos/plugin-assistant`     |       39 |             4 |             5 |    41 |
|    23 | `@dxos/plugin-duffel`        |        1 |             0 |             0 |     1 |
|    23 | `@dxos/plugin-sidekick`      |        7 |             0 |             0 |     7 |
|    24 | `@dxos/plugin-native`        |        2 |             0 |             1 |     2 |
|    24 | `@dxos/plugin-onboarding`    |       10 |             0 |             0 |    10 |
|    24 | `@dxos/plugin-projects`      |        9 |             0 |             2 |     9 |
|    24 | `@dxos/plugin-script`        |       20 |             0 |             6 |    22 |
|    25 | `@dxos/plugin-brain`         |        1 |             0 |             0 |     1 |
|    25 | `@dxos/plugin-crm`           |        2 |             0 |             0 |     2 |
|    25 | `@dxos/plugin-debug`         |       22 |             3 |             3 |    24 |
|    25 | `@dxos/plugin-studio`        |       21 |             2 |             5 |    24 |
|    26 | `@dxos/plugin-devtools`      |        6 |             0 |             0 |     6 |
|    26 | `@dxos/plugin-heygen`        |        1 |             1 |             0 |     1 |

#### Tier 3: Apps (packages/apps) (3 packages, 23 files)

| Depth | Package               | react-ui | react-ui-list | react-ui-form | Files |
| ----: | --------------------- | -------: | ------------: | ------------: | ----: |
|     9 | `@dxos/composer-crx`  |        7 |             0 |             0 |     7 |
|    11 | `@dxos/testbench-app` |       12 |             0 |             0 |    12 |
|    27 | `@dxos/composer-app`  |        4 |             0 |             1 |     4 |

## 7. Gaps: blocking the migration

Current API in use with no Next counterpart on this branch.

| Gap                                                                                                              |                              Importing files | Status / decision                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------: | ----------------------------------------------------------------------------------- |
| `react-ui-form/next` (Form and all renderers)                                                                    |                            128 (+19 subpath) | not on this branch; milestones 6–10                                                 |
| Menu/Toolbar action binding (`react-ui-menu`: MenuBuilder, useMenuActions, ToolbarMenu)                          |                                          125 | Phase 4, not started; also blocks MasterDetail, `Card/Dialog.ActionIconButton`      |
| `Banner` (incl. `Banner.Empty` in 36 files)                                                                      |                                           58 | `Next.Empty` decided 2026-10-01, not built; Banner port separate                    |
| `Flex` / `Grid` layout primitives                                                                                |                                      88 / 20 | Container covers the role, no 1:1 API; manual                                       |
| `Tree` (react-ui-list)                                                                                           |                                           18 | Next prototype exists, not exported from `react-ui-list/next`                       |
| `Avatar`                                                                                                         |                                           17 | ported (Phase A4)                                                                   |
| `Tabs`                                                                                                           |                                           14 | ported (Phase A4); master-detail parts not ported                                   |
| `Dialog.ActionIconButton` / `Card.ActionIconButton`                                                              |                                       14 / 6 | Phase 4                                                                             |
| `Popover.VirtualTrigger` / `Menu.VirtualTrigger`                                                                 |                                       11 / 6 | `positioning.getAnchorRect` (exists; manual rewrite)                                |
| `Main` (app shell, sidebars, drawer)                                                                             |                                            9 | ported (Phase A4)                                                                   |
| `Progress`, `Splitter`, `Toast`                                                                                  |                                    7 / 7 / 7 | ported (Phase A4)                                                                   |
| `ErrorFallback`, `Focus`, `MediaPlayer`                                                                          |                                    6 / 5 / 5 | ported (Phase A4)                                                                   |
| `ScrollContainer`, `Carousel`                                                                                    |                                        4 / 4 | ported (Phase A4)                                                                   |
| `Accordion`, `QrCode`, `Link` (standalone)                                                                       |                                    3 / 3 / 3 | ported (Phase A4)                                                                   |
| `AttentionGlyph`, `Tour`, `Editable`, `Timestamp`                                                                |                                       2 each | ported (Phase A4)                                                                   |
| `FloatingPanel`, `Breadcrumb`, `Deferred`, `Skeleton`, `Slider`, `Steps`, `TextCrawl`, `HoverCard`, `MenuButton` |                                       1 each | ported (Phase A4)                                                                   |
| `MasterDetail` (react-ui-list)                                                                                   |                                            1 | needs action binding                                                                |
| `OrderedList` collapsible `Item` + `Detail`                                                                      |                                            2 | decided (group B), not built (`DetailItem` still exported)                          |
| Container `span`, `ControlFrame`, `Field.Label` required mark via `RequiredIndicator`                            |                                          n/a | point 7 / 10 decided; `span`, `ControlFrame` not built (`RequiredIndicator` exists) |
| `Image backdrop='dominant'`                                                                                      |                                    (Image 3) | decided, not built                                                                  |
| `useThemeContext` / `tx` consumers                                                                               |                                           76 | no Next equivalent (CSS recipes)                                                    |
| Icon spin, Typography `line-clamp-n`                                                                             | `animate-spin` 13 classes, `line-clamp-2` 12 | no prop                                                                             |

Non-blocking (keep or trivially replaced): `ThemeProvider`, `useTranslation`/`Trans`/`Resource`, `composable`/
`slottable` utilities, `Show`/`Switch` flow helpers, `DIALOG_AUTOFOCUS_ATTRIBUTE`, `ErrorBoundary`.

## Appendix: commands

All from the worktree root. Helper scripts are in this scratchpad directory (`inv.py`, `agg.py`, `cls.py`,
`attrs.py`, `order.py`).

```
git ls-files 'packages/**/*.ts' 'packages/**/*.tsx' | grep -v /dist/
python3 inv.py inv.json
python3 agg.py groups @dxos/react-ui
python3 agg.py groups @dxos/react-ui-list
python3 agg.py groups @dxos/react-ui-form
python3 agg.py parts @dxos/react-ui
python3 agg.py names @dxos/react-ui
python3 cls.py
python3 attrs.py IconButton,Toolbar.IconButton,Button,Icon,Panel.Root,Panel.Content,Panel.Toolbar,Form.Root,Listbox.Item,Card.Root
python3 order.py
git grep -hoE "from '@dxos/react-ui[a-z-]*(/[a-z-]+)?'" -- 'packages/**' | sort | uniq -c | sort -rn
git grep -lE "from '@dxos/react-ui-form(/[a-z-]+)?'" -- 'packages/**' ':!packages/ui/react-ui-form/**'
git grep -c fieldMap -- 'packages/**/*.ts' 'packages/**/*.tsx' ':!packages/ui/react-ui-form/**'
git grep -lE "variant=['\"{]+settings" -- 'packages/**' ':!packages/ui/react-ui-form/**'
git grep -hoP '(?<![\w-])classNames=' -- 'packages/**/*.tsx' ':!packages/ui/react-ui/**'
git grep -hoP "(?<![\w-])text-description(?![\w-])" -- 'packages/**/*.ts' 'packages/**/*.tsx'
git grep -hoF -- '--color-description' -- 'packages/**'
git grep -hoF -- 'density=' -- 'packages/**/*.ts' 'packages/**/*.tsx' ':!packages/ui/react-ui/**'
git grep -n osTranslations -- packages/ui/react-ui/src packages/ui/react-ui-list/src
git grep -hoP "<Icon\b[^>]*?size=\{[^}]*\}" -- 'packages/**/*.tsx' ':!packages/ui/react-ui/**'
git grep -hA1 -P "<Panel\.(Content|Toolbar)\b[^>]*asChild" -- 'packages/**/*.tsx' ':!packages/ui/react-ui/**'
```

Method notes:

- `inv.py` parses `import {…} from '<module>'` (multi-line, `type` and `as` aliases) in every tracked file; exports
  are mapped to their `src/components/<Dir>` by scanning `export const|function|type|{…}` in the package source.
  It counts root-entry imports only; `git grep -l "from '@dxos/react-ui'"` reports 1,258 files (3 more: re-exports).
- Part counts (`Panel.Content` etc.) are `<local>.<Part>` references in files that import `<local>` from the module,
  so aliased imports are followed; JSX element/attribute counts (`cls.py`, `attrs.py`) scan each opening tag with
  brace/quote tracking. Attribute names inside JSX comments add small noise to `attrs.py` tallies (not to the
  props quoted above).
- Depth in §6 ignores dependency cycles (a cycle edge counts 0).
