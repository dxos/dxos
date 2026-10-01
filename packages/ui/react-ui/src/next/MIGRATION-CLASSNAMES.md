# `classNames` → Next props: how mechanical is the cut-over?

Generated 2026-10-01 on `claude/react-ui-next-design-4db6eb`, read-only. Scope: every `classNames=` prop on an element
whose tag is imported from `@dxos/react-ui`, `@dxos/react-ui-list` or `@dxos/react-ui-form` (same population as
MIGRATION-INVENTORY.md §3). Commands in the appendix.

## Answer

Mostly **not** mechanical. Of 1,139 props, a codemod with pure rules (no context check) can remove **29 (2.5%)**.
Add rules that need a context check (the host becomes a Next Container or Panel, or the parent is one) and **298
(26%)** go entirely, with 274 (24%) partly converted. Add six small props (below) and the total becomes **365 (32%)**
removed and 276 (24%) partial. The remaining **498 (44%)** stay as `className`. That is acceptable: decision 6 keeps
`className` as an escape hatch, so they still compile. By file: 106 of 490 files end up with no `classNames` at all,
and 341 are touched.

The work is in the "semi" class (802 of 2,059 tokens, 39%). Those tokens (`flex flex-col gap-2 p-2 h-full min-w-0`)
are only removable if the element is itself replaced: `Flex` → `Container`/`Group`, `Panel.Content` → `Panel.Body`.
That replacement is a layout decision a codemod can propose but not verify. The flex-to-grid model change (Container
is a grid, its `gap` is row gap only) means each one needs a visual check.

## 1. Shapes and tokenisation

| Value shape                                    | Props |
| ---------------------------------------------- | ----: |
| string literal (`'…'`, `{'…'}`)                |   864 |
| array `[…]`                                    |    85 |
| `mx(…)`                                        |    71 |
| conditional only (`a ? 'x' : 'y'`, `a && 'x'`) |    24 |
| opaque (variable/call, no literal)             |    95 |
| template literal (inside the above)            |     3 |

- 2,059 unconditional tokens plus 168 conditional tokens (inside ternaries or `&&`); 573 distinct.
- **264 props (23%) are dynamic** (they have a conditional or opaque part); **114 have no literal at all**.
- Opaque parts: 117 forward a `classNames` variable (wrapper components passing the caller's classes through, which
  becomes `className` passthrough); 11 are Icon `getStyles(hue).text` (→ `hue={hue}`, semi); the rest are
  module constants (`TOUCH_TARGET`, `styles.panel`, `ROW_ACTION_CLASSNAMES`).
- 446 distinct whole literal strings for 864 literal props, and 305 occur exactly once: a per-string lookup table
  does not scale; per-token rules are needed.
- Stories: 127 props in 67 files.

## 2. Categories

Tokens / props / files count every token (conditional included). M/S/N/K count unconditional tokens:
**M** mechanical (a rule maps it), **S** semi (rule plus a context check), **N** needs a proposed prop (then M or
S), **K** keep `className` or restructure.

| Category                                                 | Tokens | Props | Files |   M |   S |   N |   K |
| -------------------------------------------------------- | -----: | ----: | ----: | --: | --: | --: | --: |
| spacing (p-/m-/gap-)                                     |    441 |   348 |   217 |   0 | 176 |   0 | 255 |
| sizing (w-/h-/min-/grow/shrink)                          |    335 |   265 |   174 |  20 | 204 |   0 | 103 |
| layout (flex/grid/align/justify)                         |    325 |   202 |   147 |   8 | 196 |   7 | 101 |
| colour/surface (bg-/border-/rounded/divide)              |    209 |   129 |   107 |   1 |   0 |   0 | 183 |
| `dx-*` utilities                                         |    151 |   139 |   100 |   7 |  71 |  27 |  40 |
| visibility/position                                      |    126 |    95 |    75 |   0 |  23 |   0 |  92 |
| typography: colour                                       |    121 |   113 |    87 |  24 |  13 |  23 |  35 |
| arbitrary `[…]`/`(--var)`                                |    112 |    96 |    73 |   0 |  16 |   0 |  83 |
| interaction/motion                                       |    105 |    77 |    64 |   0 |  20 |   9 |  54 |
| variant prefixes (`hover:` `md:` `data-[…]:` `[&>svg]:`) |     85 |    59 |    46 |   0 |   4 |   0 |  68 |
| typography: size                                         |     82 |    82 |    63 |   0 |  79 |   0 |   2 |
| typography: font                                         |     44 |    42 |    32 |   9 |   0 |  12 |  19 |
| typography: wrap (truncate/line-clamp)                   |     43 |    43 |    36 |  13 |   0 |  19 |  10 |
| typography: align                                        |     21 |    21 |    18 |   0 |   0 |   0 |  21 |
| other                                                    |     27 |    25 |    22 |   0 |   0 |   0 |  12 |

Top tokens per category: spacing gap-2 52, px-2 36, p-2 32, p-1 26, gap-1 25, p-0 19, p-4 16; sizing w-full 56,
shrink-0 49, min-w-0 32, h-full 32, min-h-0 19, grow 19, flex-1 15; layout flex 73, grid 60, items-center 45, flex-col
42, justify-center 13; colour rounded-sm 22, border-subdued-separator 16, border-separator 15; dx dx-expand 28,
dx-document 27, dx-hover 10, dx-grow 8; typography colour text-description 42, text-subdued 23, text-error-text 11,
text-success-text 10. Variant prefixes: hover 9, md 9, pointer-fine 8, `[&_svg]` 7, `[&>svg]` 4, data-[state] 6,
container queries (`@md`, `@min-[32rem]`, `@4xl`) 5.

Rules by host (summarised; full rules in `rules.py`):

- **Icon**: `shrink-0` → drop (`.nx-icon` is `flex-shrink:0`) M; `text-{error,success,info,warning}-text` →
  `valence` M; `text-<hue>-500` → `hue` S; `size-N`/`h-N` → drop, size from scope S; `text-description`/`text-subdued`
  → **N** `tone`; `animate-spin` → **N** `spin` (today `data-spin=''`).
- **Button family**: `p-0 px-0 p-1 min-h-1 pointer-fine:px-1` → drop or `compact` S; `w-(--dx-rail-action)` /
  `aspect-square` → `iconOnly` block cell S; `w-full` → `Group fill` S; `justify-start` → **N**.
- **Inputs** (Field.Input, Select.TriggerButton): `w-full grow flex-1 min-w-0` → drop (`.nx-input` fills) S;
  `font-mono tabular-nums` → `Input variant='mono'` (decided) M.
- **Text parts**: `truncate` → `truncate` M (Card.Text, Typography; Next Card.Title has none); `text-description` →
  `tone`/`variant='description'` M; `line-clamp-N` → **N** `lines`; `text-subdued`, `font-mono` → **N**.
- **Containers** (Flex, Grid, Panel.\*, ScrollArea.\*, Card.Root, Listbox.Item/Content, Tabs.\*): `flex flex-col grid`
  → `layout`/Group S; `items-center` → `layout='row'` S; `gap-0..3` → `gap` S (rows only; a flex _row_ gap needs
  Group); `p-0/p-2/p-4/p-8` (and `px-`) → `gutter none/sm/md/lg` S; fill classes (`h-full w-full min-h-0 min-w-0 grow
flex-1 dx-expand dx-fill dx-grow`) → drop S; `overflow-*` on Panel/ScrollArea → drop S; `grid-cols-*` → `columns` S;
  `dx-hover dx-current dx-focus-ring* cursor-pointer` → part state from `onClick`/`selected`/`current` S;
  `dx-card-popover*` → popup sizing S.
- **Anywhere**: `col-span-N` → `span` (decided) M; `dx-base-surface` → `level='base'` M; `dx-document` → **N**;
  `text-sm/xs/lg` → `size` on the nearest scope S (changes control metrics too, so effectively manual).
- **Banner.Empty** → `Next.Empty` (decided) absorbs its layout/sizing classes S.

## 2a. Top 60 tokens

Class column: occurrences per class across hosts (e.g. `S57/K16`).

|   # | Token                      | Count | Category            | Hosts                                                      | Next equivalent                                                                                             | Class                                                 |
| --: | -------------------------- | ----: | ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
|   1 | `flex`                     |    73 | layout              | Panel.Content 20, ScrollArea.Viewport 10, Listbox.Item 6   | Container layout='stack'                                                                                    | 'row' / Group (57); keep className / restructure (16) | S57/K16                                     |
|   2 | `grid`                     |    60 | layout              | Panel.Content 24, Listbox.Item 7, Toolbar.Root 3           | Container layout='stack'                                                                                    | 'row' / Group (57); keep className / restructure (3)  | S57/K3                                      |
|   3 | `w-full`                   |    56 | sizing              | Select.TriggerButton 10, Button 9, IconButton 7            | Group fill (29); drop (Panel/Container fill) (19)                                                           | S53/K3                                                |
|   4 | `gap-2`                    |    52 | spacing             | Listbox.Item 18, Panel.Content 6, Button 6                 | gap='sm'                                                                                                    | 'md'                                                  | 'lg'                                        | 'none' (rows) / Group (43); keep className / restructure (9) | S43/K9 |
|   5 | `text-sm`                  |    50 | typography:size     | Flex 7, Avatar.Label 6, Select.Option 4                    | size= on nearest scope                                                                                      | S50                                                   |
|   6 | `shrink-0`                 |    49 | sizing              | Icon 20, IconButton 7, Button 4                            | drop (nx-icon is flex-shrink:0) (20); drop (13)                                                             | S22/M20/K7                                            |
|   7 | `items-center`             |    45 | layout              | Listbox.Item 12, Panel.Content 5, Panel.Statusbar 3        | layout='row' centres (31); keep className / restructure (14)                                                | S31/K14                                               |
|   8 | `text-description`         |    42 | typography:colour   | Icon 11, Card.Text 6, Flex 6                               | keep className / restructure (18); tone='description' (Typography) / variant='description' (Card.Text) (13) | K18/M13/N11                                           |
|   9 | `flex-col`                 |    42 | layout              | Panel.Content 15, ScrollArea.Viewport 9, Listbox.Content 4 | Container layout='stack'                                                                                    | 'row' / Group (41); keep className / restructure (1)  | S41/K1                                      |
|  10 | `px-2`                     |    36 | spacing             | IconButton 6, Listbox.Item 6, Flex 3                       | keep className / restructure (18); gutter='sm'                                                              | 'md'                                                  | 'lg' (16)                                   | S18/K18                                                      |
|  11 | `min-w-0`                  |    32 | sizing              | Flex 17, Field.Input 5, Button 3                           | drop (Panel/Container fill) (20); keep className / restructure (7)                                          | S25/K7                                                |
|  12 | `p-2`                      |    32 | spacing             | Flex 8, ScrollArea.Viewport 6, Panel.Content 6             | gutter='sm'                                                                                                 | 'md'                                                  | 'lg' (28); keep className / restructure (4) | S28/K4                                                       |
|  13 | `h-full`                   |    32 | sizing              | Flex 12, Banner.Empty 7, ScrollArea.Root 5                 | drop (Panel/Container fill) (25); Next.Empty owns layout (decided) (7)                                      | S32                                                   |
|  14 | `dx-expand`                |    28 | dx                  | Flex 8, Panel.Toolbar 7, Banner.Empty 3                    | drop (Panel/Container fill) (22); Next.Empty owns layout (decided) (3)                                      | S25/K3                                                |
|  15 | `cursor-pointer`           |    27 | interaction/motion  | Card.Root 9, OrderedList.Item 4, Listbox.Item 4            | part state (onClick/selected/current) (18); drop when onClick (9)                                           | S27                                                   |
|  16 | `dx-document`              |    27 | dx                  | Panel.Root 11, Toolbar.Root 7, ScrollArea.Viewport 4       | Container width='document'                                                                                  | N27                                                   |
|  17 | `p-1`                      |    26 | spacing             | IconButton 9, Card.Root 3, Panel.Statusbar 2               | keep className / restructure (17); drop / compact (9)                                                       | K17/S9                                                |
|  18 | `gap-1`                    |    25 | spacing             | Listbox.Content 9, Tabs.Tablist 2, IconButton 2            | gap='sm'                                                                                                    | 'md'                                                  | 'lg'                                        | 'none' (rows) / Group (18); keep className / restructure (7) | S18/K7 |
|  19 | `overflow-hidden`          |    24 | visibility/position | Tabs.Panel 8, Panel.Content 4, Grid 2                      | drop (Panel.Body scrolls) (14); keep className / restructure (10)                                           | S14/K10                                               |
|  20 | `font-mono`                |    23 | typography:font     | SystemIconButton.Clipboard 4, Grid 4, Field.Input 4        | keep className / restructure (9); Input variant='mono' (decided) (7)                                        | K9/M7/N7                                              |
|  21 | `text-xs`                  |    23 | typography:size     | Flex 7, Card.Text 3, Field.Label 3                         | size= on nearest scope                                                                                      | S23                                                   |
|  22 | `text-subdued`             |    23 | typography:colour   | Icon 12, Flex 5, Toolbar.Text 2                            | Icon tone='subdued' (12); keep className / restructure (6)                                                  | N17/K6                                                |
|  23 | `rounded-sm`               |    22 | colour/surface      | Listbox.Item 6, Flex 6, IconButton 6                       | keep className / restructure                                                                                | K22                                                   |
|  24 | `min-h-0`                  |    19 | sizing              | Panel.Content 5, Flex 4, IconButton 4                      | drop (Panel/Container fill) (13); drop / compact (6)                                                        | S19                                                   |
|  25 | `p-0`                      |    19 | spacing             | IconButton 8, Listbox.Item 2, Accordion.ItemBody 2         | drop / compact (11); gutter='none' (8)                                                                      | S19                                                   |
|  26 | `grow`                     |    19 | sizing              | Field.Input 7, Toolbar.Text 4, Button 2                    | keep className / restructure (10); drop (nx-input fills its cell) (7)                                       | K10/S9                                                |
|  27 | `border-subdued-separator` |    16 | colour/surface      | Panel.Statusbar 5, Toolbar.Root 4, Flex 3                  | keep className / restructure                                                                                | K16                                                   |
|  28 | `p-4`                      |    16 | spacing             | Flex 6, ScrollArea.Viewport 5, Panel.Content 3             | gutter='sm'                                                                                                 | 'md'                                                  | 'lg'                                        | S16                                                          |
|  29 | `relative`                 |    16 | visibility/position | Panel.Root 5, Panel.Content 3, Avatar.Content 2            | keep className / restructure                                                                                | K16                                                   |
|  30 | `border-separator`         |    15 | colour/surface      | Panel.Root 3, ScrollArea.Root 2, Flex 2                    | keep className / restructure                                                                                | K15                                                   |
|  31 | `flex-1`                   |    15 | sizing              | Field.Input 4, Flex 3, Panel.Content 2                     | drop (Panel/Container fill) (6); keep className / restructure (5)                                           | S10/K5                                                |
|  32 | `absolute`                 |    15 | visibility/position | Icon 3, IconButton 3, Button 2                             | keep className / restructure                                                                                | K15                                                   |
|  33 | `truncate`                 |    15 | typography:wrap     | Avatar.Label 7, Card.Title 3, Card.Text 2                  | truncate (14); keep className / restructure (1)                                                             | M14/K1                                                |
|  34 | `animate-spin`             |    14 | interaction/motion  | Icon 13, IconButton 1                                      | spin (today: data-spin='') (13); keep className / restructure (1)                                           | N13/K1                                                |
|  35 | `px-0`                     |    14 | spacing             | IconButton 5, Button 5, Field.Input 2                      | drop / compact (11); keep className / restructure (3)                                                       | S11/K3                                                |
|  36 | `tabular-nums`             |    13 | typography:font     | Toolbar.Text 3, Tag 3, Grid 2                              | Typography mono (6); keep className / restructure (5)                                                       | N6/K5/M2                                              |
|  37 | `py-1`                     |    13 | spacing             | Listbox.Item 4, ScrollArea.Viewport 4, Card.Root 2         | keep className / restructure                                                                                | K13                                                   |
|  38 | `p-3`                      |    13 | spacing             | Flex 8, ScrollArea.Viewport 2, Panel.Content 1             | keep className / restructure                                                                                | K13                                                   |
|  39 | `aspect-square`            |    13 | sizing              | Card.Section 3, Flex 3, IconButton 3                       | keep className / restructure (9); iconOnly is block-sized (4)                                               | K9/S4                                                 |
|  40 | `justify-center`           |    13 | layout              | Panel.Content 5, Icon 2, Tag 2                             | keep className / restructure                                                                                | K13                                                   |
|  41 | `line-clamp-2`             |    12 | typography:wrap     | Card.Title 7, Card.Text 4, Collapsible.Trigger 1           | Typography lines={n} (11); keep className / restructure (1)                                                 | N11/K1                                                |
|  42 | `text-error-text`          |    11 | typography:colour   | Icon 6, Grid 1, Field.ErrorText 1                          | valence='error' (6); keep className / restructure (2)                                                       | M6/K2/N2/S1                                           |
|  43 | `overflow-auto`            |    10 | visibility/position | Panel.Content 6, Tabs.Panel 2, Banner.Content 1            | drop (Panel.Body scrolls) (8); keep className / restructure (2)                                             | S8/K2                                                 |
|  44 | `my-2`                     |    10 | spacing             | Flex 4, Card.Root 1, Image 1                               | keep className / restructure                                                                                | K10                                                   |
|  45 | `dx-hover`                 |    10 | dx                  | Card.Root 6, Panel.Root 1, Listbox.Item 1                  | part state (onClick/selected/current) (9); keep className / restructure (1)                                 | S9/K1                                                 |
|  46 | `text-success-text`        |    10 | typography:colour   | Icon 9, Toolbar.IconButton 1                               | valence='success' (9); variant='valence' valence='success' (1)                                              | M9/S1                                                 |
|  47 | `border-b`                 |     9 | colour/surface      | Toolbar.Root 4, Tabs.Tablist 2, Flex 1                     | keep className / restructure                                                                                | K9                                                    |
|  48 | `py-2`                     |     9 | spacing             | Column.Root 2, Panel.Content 1, OrderedList.Item 1         | keep className / restructure                                                                                | K9                                                    |
|  49 | `transition-opacity`       |     9 | interaction/motion  | IconButton 6, Button 1, Card.Root 1                        | keep className / restructure                                                                                | K9                                                    |
|  50 | `gap-4`                    |     8 | spacing             | ScrollArea.Viewport 4, Panel.Content 4                     | keep className / restructure                                                                                | K8                                                    |
|  51 | `divide-y`                 |     8 | colour/surface      | ScrollArea.Viewport 3, Grid 3, Panel.Content 1             | keep className / restructure                                                                                | K8                                                    |
|  52 | `text-end`                 |     8 | typography:align    | Grid 8                                                     | keep className / restructure                                                                                | K8                                                    |
|  53 | `rounded-xs`               |     8 | colour/surface      | Listbox.Item 3, Picker.Item 2, Carousel.Content 1          | keep className / restructure                                                                                | K8                                                    |
|  54 | `border`                   |     8 | colour/surface      | Flex 3, Listbox.Item 1, Panel.Root 1                       | keep className / restructure                                                                                | K8                                                    |
|  55 | `dx-grow`                  |     8 | dx                  | Panel.Content 3, ScrollArea.Root 2, Column.Center 1        | drop (Panel/Container fill)                                                                                 | S8                                                    |
|  56 | `invisible`                |     8 | visibility/position | Icon 3, IconButton 2, Toolbar.IconButton 1                 | keep className / restructure                                                                                | K8                                                    |
|  57 | `hidden`                   |     8 | visibility/position | Toolbar.IconButton 2, Panel.Root 2, IconButton 2           | keep className / restructure                                                                                | K8                                                    |
|  58 | `dx-fill`                  |     7 | dx                  | Panel.Root 3, ScrollArea.Viewport 2, MediaPlayer 1         | drop (Panel/Container fill) (6); keep className / restructure (1)                                           | S6/K1                                                 |
|  59 | `pointer-fine:px-1`        |     7 | variant             | IconButton 5, Banner.Empty 2                               | drop (button owns padding) / compact (5); variant/responsive: keep className (2)                            | S5/K2                                                 |
|  60 | `dx-focus-ring-inset`      |     7 | dx                  | Tabs.Panel 5, IconButton 1, OrderedList.Item 1             | part state (onClick/selected/current) (6); keep className / restructure (1)                                 | S6/K1                                                 |

## 2b. Top 40 whole strings (literal props)

Class is the worst token class in the string.

|   # | String                                | Count | Hosts                                                     | Proposed Next                                                                               | Class                                                             |
| --: | ------------------------------------- | ----: | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
|   1 | `w-full`                              |    24 | Select.TriggerButton 7, IconButton 6, Button 3            | Group fill                                                                                  | S                                                                 |
|   2 | `dx-expand`                           |    22 | Panel.Toolbar 7, Flex 5, Banner.Empty 3                   | drop (Panel/Container fill)                                                                 | S                                                                 |
|   3 | `dx-document`                         |    21 | Panel.Root 11, Toolbar.Root 6, ScrollArea.Viewport 3      | Container width='document'                                                                  | N                                                                 |
|   4 | `p-2`                                 |    13 | Flex 6, ScrollArea.Viewport 4, Panel.Statusbar 2          | gutter='sm'                                                                                 | 'md'                                                              | 'lg' | S                     |
|   5 | `h-full`                              |    13 | Banner.Empty 7, ScrollArea.Root 4, ScrollArea.Viewport 1  | Next.Empty owns layout (decided)                                                            | S                                                                 |
|   6 | `min-w-0`                             |    12 | Flex 12                                                   | drop (Panel/Container fill)                                                                 | S                                                                 |
|   7 | `text-sm`                             |    12 | Select.Option 4, Grid 3, Tabs.Button 2                    | size= on nearest scope                                                                      | S                                                                 |
|   8 | `text-description`                    |    11 | Icon 6, Listbox.ItemContent 1, Card.Title 1               | Icon tone='description'                                                                     | N                                                                 |
|   9 | `grow`                                |    10 | Field.Input 6, Toolbar.Text 3, Listbox.ItemContent 1      | drop (nx-input fills its cell)                                                              | S                                                                 |
|  10 | `gap-1`                               |     9 | Listbox.Content 7, Breadcrumb.List 1, Grid 1              | gap='sm'                                                                                    | 'md'                                                              | 'lg' | 'none' (rows) / Group | S   |
|  11 | `line-clamp-2`                        |     9 | Card.Title 7, Collapsible.Trigger 1, Card.Text 1          | Typography lines={n}                                                                        | N                                                                 |
|  12 | `p-0`                                 |     9 | IconButton 5, Accordion.ItemBody 2, Listbox.Item 1        | drop / compact                                                                              | S                                                                 |
|  13 | `shrink-0`                            |     9 | Icon 3, IconButton 2, Button 2                            | drop (nx-icon is flex-shrink:0)                                                             | M                                                                 |
|  14 | `animate-spin`                        |     8 | Icon 7, IconButton 1                                      | spin (today: data-spin='')                                                                  | N                                                                 |
|  15 | `gap-2`                               |     8 | Listbox.Item 4, Listbox.Content 1, Menu.CheckboxItem 1    | gap='sm'                                                                                    | 'md'                                                              | 'lg' | 'none' (rows) / Group | S   |
|  16 | `cursor-pointer`                      |     8 | Card.Root 3, Listbox.Item 1, Card.Title 1                 | part state (onClick/selected/current)                                                       | S                                                                 |
|  17 | `text-sm text-description`            |     7 | Card.Text 2, Link 2, Field.Label 2                        | size= on nearest scope; tone='description' (Typography) / variant='description' (Card.Text) | S                                                                 |
|  18 | `overflow-hidden`                     |     7 | Field.DateTime 2, Tabs.Panel 2, Card.Section 1            | keep className / restructure                                                                | K                                                                 |
|  19 | `shrink-0 text-subdued`               |     6 | Icon 4, Flex 1, Button 1                                  | drop (nx-icon is flex-shrink:0); Icon tone='subdued'                                        | N                                                                 |
|  20 | `flex flex-col`                       |     6 | Panel.Content 5, Panel.Statusbar 1                        | Container layout='stack'                                                                    | 'row' / Group                                                     | S    |
|  21 | `text-success-text`                   |     6 | Icon 5, Toolbar.IconButton 1                              | valence='success'                                                                           | M                                                                 |
|  22 | `sr-only`                             |     6 | Dialog.Title 3, Dialog.Description 1, Listbox.ItemLabel 1 | keep className / restructure                                                                | K                                                                 |
|  23 | `flex flex-col gap-4 p-4`             |     5 | Panel.Content 3, ScrollArea.Viewport 2                    | Container layout='stack'                                                                    | 'row' / Group; keep className / restructure; gutter='sm'          | 'md' | 'lg'                  | K   |
|  24 | `dx-focus-ring-inset overflow-hidden` |     5 | Tabs.Panel 5                                              | part state (onClick/selected/current); drop (Panel.Body scrolls)                            | S                                                                 |
|  25 | `px-2`                                |     5 | Card.Row 2, Toolbar.Root 1, Field.Label 1                 | gutter='sm'                                                                                 | 'md'                                                              | 'lg' | S                     |
|  26 | `text-subdued`                        |     5 | Icon 4, Toolbar.Text 1                                    | Icon tone='subdued'                                                                         | N                                                                 |
|  27 | `dx-card-popover`                     |     5 | Card.Root 5                                               | popup size (decided 2.2)                                                                    | S                                                                 |
|  28 | `p-1`                                 |     5 | Card.Root 2, Popover.Viewport 1, IconButton 1             | keep className / restructure                                                                | K                                                                 |
|  29 | `truncate`                            |     5 | Card.Text 2, Card.Title 2, Select.TriggerButton 1         | truncate                                                                                    | M                                                                 |
|  30 | `relative`                            |     5 | Panel.Root 3, Tabs.Root 1, Panel.Content 1                | keep className / restructure                                                                | K                                                                 |
|  31 | `flex items-center justify-center`    |     5 | Panel.Content 5                                           | Container layout='stack'                                                                    | 'row' / Group; layout='row' centres; keep className / restructure | K    |
|  32 | `overflow-auto`                       |     4 | Panel.Content 3, Banner.Content 1                         | drop (Panel.Body scrolls)                                                                   | S                                                                 |
|  33 | `self-start`                          |     4 | Button 2, Field.Label 1, Card.Block 1                     | keep className / restructure                                                                | K                                                                 |
|  34 | `flex-1`                              |     4 | Panel.Content 1, Field.Root 1, Flex 1                     | drop (Panel/Container fill)                                                                 | S                                                                 |
|  35 | `border-b border-subdued-separator`   |     4 | Toolbar.Root 4                                            | keep className / restructure                                                                | K                                                                 |
|  36 | `contents`                            |     4 | IconButton 1, Tabs.Root 1, Carousel.Content 1             | keep className / restructure                                                                | K                                                                 |
|  37 | `my-2`                                |     4 | Card.Root 1, Image 1, Flex 1                              | keep className / restructure                                                                | K                                                                 |
|  38 | `line-clamp-3`                        |     4 | Card.Text 4                                               | Typography lines={n}                                                                        | N                                                                 |
|  39 | `dx-card-popover-width`               |     4 | Popover.Viewport 3, ObjectPicker.Content 1                | popup size (decided 2.2)                                                                    | S                                                                 |
|  40 | `rounded-t-xs`                        |     4 | Card.Poster 4                                             | keep className / restructure                                                                | K                                                                 |

## 3. Codemod estimate

| Rule set                         | Removed | Partial | Left (all K) | Left (dynamic only) | Files with no `classNames` | Files touched |
| -------------------------------- | ------: | ------: | -----------: | ------------------: | -------------------------: | ------------: |
| M only (rules, no context check) |      29 |      52 |          899 |                 159 |                          4 |            64 |
| M + S (context-checked)          |     298 |     274 |          408 |                 159 |                         79 |           317 |
| M + S + N (six proposed props)   | **365** | **276** |      **339** |             **159** |                    **106** |       **341** |

Percentages of 1,139 for the last row: 32% removed, 24% partial, 44% left. Token level (2,059 unconditional): M 82
(4%), S 802 (39%), N 97 (5%), K 1,078 (52%).

By host group (M+S+N): container 589 props → 198 removed, 174 partial, 217 left; button 178 → 46 / 41 / 91; icon 144 →
47 / 22 / 75; text 113 → 42 / 24 / 47; input 53 → 17 / 11 / 25; Banner.Empty 15 → 11 / 3 / 1; other 47 → 4 / 1 / 42.

Assumptions:

1. "Removed" means the `classNames` prop disappears, replaced by props, a part swap, or nothing.
2. S rules assume the host _becomes_ a Next Container/Panel.Body/Group (or its parent already is one). The codemod can
   emit the swap; it cannot verify the visual result. Treat S as "codemod proposes, human reviews a story/screenshot".
3. Dynamic props (conditional or opaque parts) are never fully removed. Conditional-only tokens split M 4 / S 1 / N 3 /
   K 10; a few (`busy ? 'animate-spin' : ''` → `spin={busy}`) could be handled by hand.
4. K tokens stay as `className` (decision 6 escape hatch); "left" is not "broken".
5. `text-sm`/`text-xs` → `size` counted as S, though it rescales the whole scope rather than the text. Treat as manual
   in practice, which moves about 80 tokens and roughly 40 removals out of "removed".
6. Off-ramp values have no target: `p-1`, `p-3`, `py-*`, `gap-4+` and margins are K. Decision 6 says containers own
   gaps and nothing sets an outer margin.

## 4. Minimal new props

Ranked by props fully unlocked (beyond M+S):

| Proposed prop                                                 |                           Tokens | Props unlocked | Replaces                                                                 |
| ------------------------------------------------------------- | -------------------------------: | -------------: | ------------------------------------------------------------------------ |
| Container/Panel.Root `width='document'`                       |                               27 |             21 | `dx-document` (Panel.Root 11, Toolbar.Root 7, ScrollArea.Viewport 4)     |
| Typography `lines={n}` (+ Card.Title on Typography)           |                               19 |             19 | `line-clamp-1/2/3` (Card.Title 7, Card.Text 10)                          |
| Icon `tone` (`description`/`subdued`, shared with Typography) | 18 + 11 Icon `getStyles` → `hue` |             16 | `text-description`, `text-subdued` on Icon (and `shrink-0 text-subdued`) |
| Icon `spin`                                                   |                               13 |              9 | `animate-spin` (13 Icon; conditional `busy ? …` → `spin={busy}`)         |
| Typography `tone='subdued'` and `mono`/`numeric`              |                               15 |              3 | `text-subdued`, `font-mono`, `tabular-nums` on text parts                |
| Button `align='start'`                                        |                                7 |              0 | `justify-start` (all on Button; always with other classes)               |

Also build first (already decided): Container `span`, `Input variant='mono'`, `Next.Empty`. Optional second tier,
since each is a K cluster today: a Panel.Header/Footer `separator` (border-b/t + border-(subdued-)separator, about 40
tokens on Toolbar.Root/Panel.Statusbar), and centring (`justify-center`/`place-items-center`, 19) if `Next.Empty`
does not absorb it.

Should stay `className` (or be restructured by hand):

- Positioning: `relative`, `absolute`, `inset-*`, `top/left/right-*`, `z-*` (about 60). Overlays and badges are
  bespoke.
- Borders, radius, dividers, `bg-*` other than surface levels (`rounded-sm` 22, `divide-y` 8, …): 183 K tokens.
- Variant and responsive prefixes (`hover:`, `md:`, `@md:`, `data-[state]:`, `[&>svg]:`, `group-data-*`): 68 K. Next
  resolves state in CSS, so these should disappear when the part owns the state, not become props.
- Arbitrary values (`w-[180px]`, `grid-rows-[auto_1fr]`, `[min-inline-size:1.5rem]`): 83 K.
- Motion (`transition-*`, `duration-*`, `opacity-*`, hover-reveal patterns on IconButton): restructure.
- Off-ramp spacing and margins (`p-1`, `p-3`, `py-1/2`, `my-2`, `gap-4`): restructure into container gutters/gaps
  or keep.
- `sr-only` (Dialog.Title 3), `text-end`/`text-right` (numeric Grid cells), `contents`.

## 5. Examples

|   # | Location                                     | Current                                                                                                                                    | Proposed Next                                                                                                                  | Class |
| --: | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
|   1 | plugin-client/…/InvitationsContainer.tsx:132 | `<Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text' />`                                                        | `<Icon icon='ph--check-circle--duotone' valence='success' />` (size from scope)                                                | M     |
|   2 | plugin-assistant/…/IntegrationPrompt.tsx:53  | `<Icon icon='ph--plugs--regular' size={5} classNames='shrink-0 text-subdued' />`                                                           | `<Icon icon='ph--plugs--regular' tone='subdued' />`                                                                            | M + N |
|   3 | plugin-library/…/BookReader.tsx:36           | `<Icon icon='ph--spinner-gap--regular' size={6} classNames='animate-spin' />`                                                              | `<Icon icon='ph--spinner-gap--regular' spin />` (today `data-spin=''`)                                                         | N     |
|   4 | devtools/…/StatCard.tsx:65                   | `<Icon icon={icon} classNames={hue && getStyles(hue).text} />`                                                                             | `<Icon icon={icon} hue={hue} />`                                                                                               | S     |
|   5 | devtools/…/SqliteArticle.tsx:367             | `<Field.Input … classNames='font-mono text-xs' />`                                                                                         | `<Input … variant='mono' />` in a `size='xs'` Field (or keep `text-xs`)                                                        | M + S |
|   6 | plugin-blogger/…/PostCard.tsx:61             | `<Card.Title classNames='line-clamp-2'>{title}</Card.Title>`                                                                               | `<Card.Title lines={2}>{title}</Card.Title>`                                                                                   | N     |
|   7 | plugin-assistant/…/AssistantSurfaces.tsx:65  | `<Panel.Root role={role} classNames='dx-document'>`                                                                                        | `<Panel.Root role={role} width='document'>`                                                                                    | N     |
|   8 | devtools/…/TestingArticle.tsx:38             | `<Panel.Content classNames='flex flex-col gap-4 p-4'>`                                                                                     | `<Panel.Body gutter='md' gap='lg'>` (gap-4 = 1rem has no step; `lg` is 0.75rem)                                                | S + K |
|   9 | plugin-presenter/…/Pager.tsx:86              | `<IconButton icon='ph--caret-double-left--regular' size={6} label='Jump to first' iconOnly noTooltip variant='ghost' classNames='p-0' …/>` | `<Button icon='ph--caret-double-left--regular' label='Jump to first' iconOnly compact showTooltip={false} variant='ghost' …/>` | S     |
|  10 | devtools/…/InvocationTraceContainer.tsx:178  | `<Toolbar.Root classNames='border-b border-subdued-separator'>`                                                                            | `<Toolbar.Root className='border-b border-subdued-separator'>`, or drop if Panel.Header draws the separator                    | K     |
|  11 | plugin-commerce/…/SearchArticle.tsx:159      | `<Banner.Empty … classNames='h-full' />`                                                                                                   | `<Next.Empty icon=…>…</Next.Empty>` (decided)                                                                                  | S     |
|  12 | plugin-deck/…/FoldSpine.tsx:39               | `<Button classNames={mx('dx-fold-spine absolute inset-y-0 … z-[1] … group-data-[folded]/tile:opacity-100', classNames)}>`                  | unchanged: `className={mx(…, className)}`                                                                                      | K     |

Full paths: packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx,
packages/plugins/plugin-assistant/src/containers/IntegrationPrompt/IntegrationPrompt.tsx,
packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx,
packages/devtools/devtools/src/components/StatCard/StatCard.tsx,
packages/devtools/devtools/src/containers/panels/client/SqliteArticle/SqliteArticle.tsx,
packages/plugins/plugin-blogger/src/components/PostCard/PostCard.tsx,
packages/plugins/plugin-assistant/src/capabilities/AssistantSurfaces.tsx,
packages/devtools/devtools/src/containers/panels/edge/TestingArticle/TestingArticle.tsx,
packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx,
packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/InvocationTraceContainer.tsx,
packages/plugins/plugin-commerce/src/containers/SearchArticle/SearchArticle.tsx,
packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx.

## Appendix: commands

All scripts are in this scratchpad; `inv.json` is the importer index from the earlier inventory run (`inv.py`).

```
python3 inv.py inv.json
python3 extract.py
python3 ana.py 90
python3 dispo.py
python3 tables.py
python3 tables2.py
```

- `extract.py`: finds every JSX element whose tag is a non-type import from the three packages (outside the
  packages themselves), reads its `classNames=`/`className=` value with balanced braces and quotes (comments
  skipped), and classifies the shape. Literal tokens are unconditional; literals inside ternaries/`&&` are
  conditional; non-literal args are opaque. Output `cls-rows.json` (1,139 `classNames` + 46 `className` rows,
  matching inventory §3).
- `cat.py`: token categoriser (variant prefix split on top-level `:`; `[`/`(--` → arbitrary).
- `rules.py`: host grouping and the M/S/N/K rule per (host, token).
- `dispo.py`: per-prop disposition at three rule levels, plus file roll-up → `dispo.json`.
- `tables.py`, `tables2.py`: the token, whole-string, category and host tables above.
- Next API read from `packages/ui/react-ui/src/next/components/{Container,Block,Group,Typography,Icon,Button,Panel,
ScrollArea,Card,Input}`, `theme/{container,control,panel}.css`, DESIGN.md decision 6 and "Text emphasis", AUDIT.md
  §6 group A (span, Empty) and §7.
