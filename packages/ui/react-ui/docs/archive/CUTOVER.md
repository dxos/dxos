# Next cut-over (Phase C)

> **Archived.** Historical record: the cut-over log through step 3 (2026-10-02). Not maintained; the current state is in [AUDIT.md](../../src/next/AUDIT.md) and [TASKS.md](../../src/next/TASKS.md).

The cut-over branch (draft PR against `claude/react-ui-next-design-4db6eb`): the Phase B codemods applied for real, then
fixed by hand batch by batch, then the current components deleted and Next made the default export. Plan:
[AUDIT.md](../../src/next/AUDIT.md) §7.

## Status (step 3: the current components are gone)

### What step 3 changed

- **`@dxos/react-ui`:** `src/components` (45 components) is deleted; the root exports the `Next` namespace (plus
  `NextSize`, flat because `@dxos/ui-types` already exports a spacing-scale `Size`). The `./next` subpath is gone and
  every importer reads `@dxos/react-ui` (914 files); `./next/testing` folded into `./testing`; the stylesheet is
  `@dxos/react-ui/theme.css`. `ErrorBoundary` is re-exported from the root index, `ThrowError` moved to `./testing`,
  `parseCaptureOwnerStack` and `Toolbar.SeparatorProps` joined the namespace. The playground stories went with the
  components; the exemplars and flow stories are on Next.
- **Theme:** `defaultTheme` holds no component tables (Next styles through `.nx-*` CSS); `ThemeProvider` and
  `defaultTx` stay for their context (mode, platform, translations). The Density and Elevation contexts are deleted
  (their last readers were current components; five toolbars unwrapped). ui-theme drops `card.css`, `dialog.css`,
  `drawer.css` and `toast.css` (no remaining user; Next ships its own toast rules). Spotlight's frame override now
  targets `.nx-dialog`.
- **`react-ui-menu`, `-list`, `-form`:** the `/next` entries became the root; the current ActionMenu/ActionToolbar,
  Tree/Listbox/OrderedList/Combobox and Form were deleted, their shared models (tree model, form property walk,
  field resolution, layout parser) moved beside the Next components. `MenuActions.iconSize` is a Next size.
  MasterDetail sits on Next OrderedList (its content is the scroll region in horizontal orientation).
- **Residue migrated:** the 13 `Column` users (`Next.Container`; a labelled `Column.Section` became a `section` under `Container asChild`
  with a `Typography` heading),
  react-ui-mosaic's `Focus` re-export (20 files to `Next.Focus`), plugin-deck's `useMainSize` (it read the deleted
  Main's context and so never saw the sidebars; now `Next.useMainSidebars`), EditorMenuProvider's `tx('menu.*')`
  rows (now `nx-menu-item`), `stepCount`, `DialogSize`.
- **Kept:** `Flex`/`Grid` layout utilities (`src/layout`, theme-free), `Show`/`Switch`, the hooks, `tools/codemorph`
  (it still targets `@dxos/react-ui/next` by design: it is the record of the migration).

### Step 3 verification

- `moon exec --on-failure continue --quiet :build`: green.
- `tsc -b tsconfig.all.json`: no error in a package the cut-over touched (only the pre-existing ones listed below).
- `moon exec :lint`: clean except `eslint-plugin-rules`, whose tsconfig fails on its own fixtures' emitted
  `dist/types` (pre-existing; unrelated).
- Node test sweep (`MOON_CONCURRENCY=4 moon exec :test -- --no-file-parallelism`): green apart from a
  `SearchResultList` test still querying `listitem` (fixed: Next rows are `option`s), the codemorph exports snapshot
  (regenerated; the sibling entries now read `src/components`), and failures outside the cut-over that also fail
  alone: plugin-sandbox (macOS `realpath -e`), plugin-google Gmail paging and echo-client-e2e merge convergence.
- Storybook vitest, all 118 packages one at a time: 111 green; the seven that failed under load all pass alone
  (plugin-debug `DebugPanelStatus`, plugin-search `SearchDialog`, plugin-space `AddToCollectionDialog`, plugin-tasks
  `Outline`, worker-framework, react-ui-experimental `Ghost`), except react-ui `AttentionGlyph`, which exposed a real
  regression: with the current components gone no utility class named `--color-attention-contains`, so Tailwind
  tree-shook it. ui-theme now scans plain stylesheets (`@source '../../../**/src/**/*.css'`) so every variable Next's
  CSS reads is kept.
- Boot budget (`DX_ENVIRONMENT=dev moon run composer-app:check-boot-budget`): 20 preload entries, 4.50 MB against
  25 entries / 4.55 MB. Passes with 50 KB to spare. (`DX_ENVIRONMENT` must be `dev|preview|staging` for the bundle.)

## Status at the end of step 2 (every batch on Next)

Every batch type-checks: `tsc -b` over the whole repo reports no error in a package the cut-over touched. The errors
it still prints are outside it and were there before (`eslint-plugin-rules` and `hyperformula` fixtures writing over
their inputs, `vscode-extension`, `discord-worker`, `tools/beast`, `tools/storybook-*` config typing). Step 3
(deleting the current components) has not started.

| Batch                                     | After step 1 | After batch 1 | Now | State |
| ----------------------------------------- | -----------: | ------------: | --: | ----- |
| 1 UI libraries                            |          374 |             0 |   0 | done  |
| 2 Shell / SDK / devtools / common         |          177 |           112 |   0 | done  |
| 3 Plugins                                 |          415 |           203 |   0 | done  |
| 4 Plugins (inbox, space, assistant, deck) |          188 |            84 |   0 | done  |
| 5 Apps                                    |           14 |             4 |   0 | done  |

### Verification

- `tsc -b tsconfig.all.json`: no error in a package the cut-over touched (the remaining ones are listed above).
- `oxlint` and `oxfmt --check` clean on every file the branch changed against the design branch (999 files).
- `tools/codemorph`: 68 tests pass.
- Storybook vitest, one package at a time: every `packages/ui/*` package with stories (step 2, then react-ui 470,
  react-ui-list 75, react-ui-form 130, react-ui-menu 23, react-ui-task 41, react-ui-components 36 again after this
  step's additions); batch 2's shell (60), app-framework, app-graph, react-client, worker-framework, storybook-utils
  and the stories packages; all 59 batch-3 plugins with stories; batch 4's inbox (50), assistant (81), deck (22) and
  space. Failures were fixed and rerun alone until green. One flake remains: plugin-space `AddToCollectionDialog`
  `Pick` passes alone and times out (30 s) in a full-package run under load.
- Shell's `dist/lib` must be built (`moon run shell:build`) before stories that import `@dxos/shell/react` run; a
  missing build shows as a `Failed to run dependency scan` and `no tests`, not as a test failure.

### The current Tree's consumers are on Next Tree

All seven: devtools `ObjectsTree`, react-ui-trace `ProcessTree`, react-ui-task `TaskList`, plugin-debug
`DebugPanelSidebar`, plugin-github `FileTree`, plugin-navtree `L1Panel` (the workspace tree) and plugin-sandbox
`RepositoryFileTree`. The current Tree's render props map onto row parts: `renderIcon` is `Tree.ItemIcon` children,
`renderHeading` and `renderColumns` are the cells a row composes after `Tree.ItemText` on the Root's `columns`, and
hover-revealed row controls are `Tree.ItemActions`. The navtree keeps its row paths (`Tree.Root path`, whose first id is
the drag scope every workspace tab shares, so the container's drop monitor is unchanged) and its `treeItem.heading`
test id; e2e expands rows through the branch trigger's `data-state`.

### Codemod changes (each rerun of `renames` is its own commit)

- **Defects fixed:** a part promoted out of an aliased namespace keeps a binding; a `Field` control whose children open
  with text; computed handlers are parenthesised before a call; the i18n `type Label` stays on the current entry; a
  current part with no Next counterpart (the current `Tree`) keeps `density`; `Tree` stays on the current entry
  (its render props have no Next counterpart).
- **New rules:** Select and Listbox `items` from their Items (static or one `.map`); Select `value` → `[value]` and
  `onValueChange` details; `Select.Item value` + `ItemText` → `item`; `Menu.Item` icon + label children → `item`;
  `onOpenChange` details on Popover, Menu, Dialog, AlertDialog, HoverCard, Collapsible, Tour, FloatingPanel;
  Checkbox and Switch `onCheckedChange` details; Content `side`/`align`/`sideOffset`/`collisionPadding` → Root
  `positioning`; Popover `onOpenAutoFocus` preventDefault → Root `autoFocus={false}`; `Card.Root fullWidth`,
  `ScrollArea.Root thin`/`centered` dropped (`padding` reported); `ScrollContainer.Content thin` → `width`;
  `Card.Block end` → `Block rail='end'`; `Card.Poster image` → `src`; `ToggleGroup` → `ToggleGroup.Root`;
  `DragHandle testId` → `data-testid`; SystemButton `active` → `pressed`/`expanded`; Button `asChild` around a popup
  Trigger unwrapped; Button `title` + Icon child → icon-only Button; `Menu.Root modal` and `Select.Trigger variant`
  dropped; a number input with an `onChange` stays a native `Input type='number'`.
- **Reruns exclude** the files written against Next before the cut-over (their Select and popup handlers already take
  details) and the superseded current implementations below.

### Next theme CSS is global

Next components style through `.nx-*` rules that ship separately (`@dxos/react-ui/next/theme.css`); only the pilots
imported them. The shared storybook preview and Composer's entry points (app, devtools and reset pages, the crx root)
now import them, so every converted surface renders styled. Without it, storybook play tests that measure layout
failed: an unstyled ScrollArea viewport does not scroll, so virtualised lists (feed, timeline, mosaic) mounted every
row, and the feed and chat thread hit React's update-depth limit tearing them down. The per-file imports in the
pilots are now redundant.

### Next additions (each with a story)

- `@dxos/react-ui/next` exports the types consumers' declarations name (`ButtonProps`, `ButtonVariantProps`,
  `TooltipSide`, `ComboboxOption`, …); this removed the TS2883 cascade that dropped `react-ui-mosaic`'s exports.
- `Button iconClassNames` styles the leading icon (the current Button's `iconClassNames`; 20+ callers).
- `Icon spin` spinners share one phase (the current Icon's `synchronized`).
- `Dialog.Content placement='end'` and `scrim={false}`: a docked, non-modal dialog (ChatDialog).
- `Dialog.Title`/`Description srOnly`; `Next.toAvatarHue` narrows a stored hue name; `Card.Root size`;
  `Tooltip.Trigger content` takes any node.
- `Dialog`: `placement='start'`, a Root `placement` for Content it does not render (the deck places a surface's
  dialog from `blockAlign`), and `Dialog.Content closeOnInteractOutside={false}` (a surface's dialog holding unsaved
  input; the Root belongs to the layout).
- `Card.Row leading` (an avatar in the icon's Block), replacing the current row-button `Card.Action` with `Card.Row
onClick` at its call sites.
- `Toolbar.Root inactive` (dimmed, still operable) and a `role` it keeps (an app bar's `banner`).
- `Tabs.Trigger asChild` (the navtree's avatar rail), `Combobox.Trigger asChild`, `ToggleGroup.Item classNames`,
  `PasswordInput onBlur`.
- react-ui-list: Tree `path` prefix, `Label srOnly`, `ItemIcon` children, `ItemText` test id, `ItemActions`,
  `multiline` rows; OrderedList single selection (`value`/`onValueChange`) and `DragHandle asChild`.
- react-ui-form: `Form.Content` and `Form.Viewport` forward their ref (Viewport is composable), `Form.Viewport
width='document'`, `Form.Submit icon`/`busy`, `ObjectPicker trigger`, `RefEditor extensions`/`classNames`.
- react-ui-menu: `ActionToolbar` recedes (`inactive`) rather than disabling while its attendable lacks attention, as
  the current toolbar did. Disabling meant the first press on an unattended plank's toolbar did nothing, and stories
  that press a toolbar control without attention failed.

### Superseded current implementations

Deleted in step 3 (see above).

### Behaviour that moved (visual pass)

- Deck dialogs: `overlayClasses`/`overlayStyle` on `LayoutOperation.UpdateDialog` are now inert (Next has no overlay
  part); `blockAlign` maps to the dialog placement.
- Deck popover: positioning, focus and dismissal moved to the Root; layers spawned from the card are zag's nested
  layers, replacing the Radix portal workaround.
- Navtree: row actions reveal on hover/focus/selection through `Tree.ItemActions`; `headingClassName` from the model
  is not applied; the L0 rail tooltip uses the default open delay.
- Shell: `InvitationListItem` avatar stack, `IdentityPanel` avatar (`fill`, `w-16`), contact and invitation rows.
- devtools `ObjectsTree` (two icons in one block), `StatCard` size, `Select.Trigger` without a variant.
- Form `FieldSet appearance='section'` and `descriptionPlacement='tooltip'` dropped (Next nests sections plainly and
  shows descriptions below); plugin-debug's port log row no longer collapses the settings columns.
- Large icons and avatars beyond the size scale use classes (`size-14`) or the nearest step (`PersonCard` avatar `xl`).
- TaskList (from the migration's report): the editor pane is inset by `--nx-gap-size` to line up with rows; flat
  status-group labels sit one block in; multiline rows fade on disclosure; dragging an open branch collapses it; the
  focus ring shows on the selected row; rows use `content-visibility` rather than a window.
- Sync-targets dialog: a multiple-selection listbox with check indicators in place of checkboxes.
- Library download is a `Link`, not a button; Welcome's sign-in menu no longer forces `z-50`.

### Open (decisions)

- **`Next.` prefix:** consumers still write `Next.Button`; flattening the namespace into the root (dropping the prefix
  across ~900 files) is a mechanical follow-up once collisions with local names are settled.
- **`Flex` (75 uses) and `Grid` (14):** kept as theme-free layout utilities; `Next.Container` covers the grid cases.
- **`ThemeProvider` `tx`:** now binds an empty theme; removing the prop (and `ThemeFunction` from ui-types) touches
  every app root and is left for a follow-up.
- **ui-theme leftovers:** `--dx-drawer-size`, the `dx-callout`/`dx-text`/`dx-tag` colour variants with no user,
  and `react-ui-list`'s `List.theme.ts` (only `Picker` reads it).

## Step 1 record

What follows is the step-1 measurement (codemods applied, nothing fixed by hand), kept for comparison.

### What ran

1. `plugins: restore the Next pilots for the cut-over` — plugin-registry `PluginItem`, `PluginList` (+ story),
   `BaseRegistryArticle`; plugin-sheet `RangeList` (+ story), taken from `2acfaabc26`, before the design branch
   merged `main`'s revert.
2. One commit per transform, in README order, each run as:

   ```bash
   node tools/codemorph/src/main.ts --transform <name> --format \
     --report packages/ui/react-ui/src/next/cutover/residue-<name>.json \
     --exclude packages/ui/react-ui/src packages
   ```

   `emphasis` is skipped (its rename table is empty; deferred to a follow-up PR). `tools/codemorph` fixtures are
   outside `packages/` and so out of scope. Each `cutover/residue-<name>.json` lists every changed file and every
   residue item (file, line, reason, snippet).

### Conversions and residue

| Transform    | Files changed | Conversions | Residue items | Residue files |
| ------------ | ------------: | ----------: | ------------: | ------------: |
| `renames`    |           705 |        2607 |           229 |           147 |
| `layout`     |            14 |          25 |           203 |           111 |
| `theme`      |            71 |          75 |             7 |             5 |
| `classnames` |            65 |          87 |            52 |            42 |
| `imports`    |           941 |        2605 |           260 |           197 |

Distinct files changed: 997 in 142 packages. Residue: 751 items in 98 packages.

### Residue per package

| Package                             | Items | renames | layout | theme | classnames | imports |
| ----------------------------------- | ----: | ------: | -----: | ----: | ---------: | ------: |
| `@dxos/shell`                       |    49 |      25 |        |     2 |            |      22 |
| `@dxos/devtools`                    |    43 |      14 |     14 |       |          1 |      14 |
| `@dxos/plugin-assistant`            |    41 |       9 |     21 |       |          2 |       9 |
| `@dxos/plugin-space`                |    41 |       8 |     14 |       |          5 |      14 |
| `@dxos/plugin-inbox`                |    25 |       2 |      5 |       |          7 |      11 |
| `@dxos/react-ui-form`               |    24 |       6 |      2 |       |            |      16 |
| `@dxos/plugin-client`               |    22 |       2 |     13 |       |            |       7 |
| `@dxos/plugin-onboarding`           |    21 |       4 |     14 |       |            |       3 |
| `@dxos/plugin-deck`                 |    19 |       6 |      4 |       |            |       9 |
| `@dxos/plugin-support`              |    18 |       9 |      4 |       |            |       5 |
| `@dxos/react-ui-task`               |    18 |       9 |      3 |       |          1 |       5 |
| `@dxos/react-ui-menu`               |    17 |      13 |        |       |          1 |       3 |
| `@dxos/ui-template`                 |    17 |       4 |     10 |       |            |       3 |
| `@dxos/plugin-debug`                |    15 |       3 |      6 |       |          1 |       5 |
| `@dxos/plugin-github`               |    15 |       2 |      5 |       |          2 |       6 |
| `@dxos/plugin-library`              |    15 |       2 |      9 |       |          1 |       3 |
| `@dxos/react-ui-list`               |    15 |       2 |      2 |     1 |            |      10 |
| `@dxos/plugin-registry`             |    13 |       5 |      4 |       |          2 |       2 |
| `@dxos/plugin-studio`               |    12 |       1 |      4 |       |          1 |       6 |
| `@dxos/plugin-tasks`                |    12 |       1 |      4 |       |          3 |       4 |
| `@dxos/plugin-mobile`               |    11 |       4 |      1 |       |            |       6 |
| `@dxos/react-ui-feed`               |    11 |       4 |      2 |       |          1 |       4 |
| `@dxos/plugin-commerce`             |    10 |       2 |      4 |       |            |       4 |
| `@dxos/plugin-navtree`              |    10 |       5 |        |       |            |       5 |
| `@dxos/react-ui-trace`              |    10 |       5 |        |       |          4 |       1 |
| `@dxos/plugin-routine`              |     9 |       2 |      1 |       |          1 |       5 |
| `@dxos/plugin-script`               |     9 |       1 |      5 |       |            |       3 |
| `@dxos/plugin-review`               |     8 |       2 |      2 |       |          2 |       2 |
| `@dxos/react-ui-canvas`             |     8 |       1 |      5 |       |            |       2 |
| `@dxos/react-ui-editor`             |     8 |       1 |        |     3 |          1 |       3 |
| `@dxos/plugin-magazine`             |     8 |         |      3 |       |          2 |       3 |
| `@dxos/react-ui-canvas-compute`     |     7 |       4 |        |       |          1 |       2 |
| `@dxos/plugin-connector`            |     6 |       2 |      1 |       |            |       3 |
| `@dxos/plugin-ibkr`                 |     6 |       3 |      1 |       |          1 |       1 |
| `@dxos/plugin-video`                |     6 |       2 |      2 |       |            |       2 |
| `@dxos/react-ui-introspect`         |     6 |       6 |        |       |            |         |
| `@dxos/react-ui-pickers`            |     6 |       5 |        |       |            |       1 |
| `@dxos/react-ui-thread`             |     6 |       3 |        |       |          1 |       2 |
| `@dxos/plugin-atproto`              |     6 |         |      3 |       |            |       3 |
| `@dxos/plugin-doctor`               |     5 |       1 |      3 |       |            |       1 |
| `@dxos/plugin-sequencer`            |     5 |       2 |      2 |       |            |       1 |
| `@dxos/react-ui-assistant`          |     5 |       5 |        |       |            |         |
| `@dxos/plugin-chess`                |     5 |         |      2 |       |          2 |       1 |
| `@dxos/plugin-illustrator`          |     5 |         |      3 |       |            |       2 |
| `@dxos/plugin-testing`              |     4 |       2 |        |       |            |       2 |
| `@dxos/plugin-trip`                 |     4 |       1 |      1 |       |            |       2 |
| `@dxos/react-ui-components`         |     4 |       2 |        |     1 |            |       1 |
| `@dxos/plugin-code`                 |     4 |         |      2 |       |            |       2 |
| `@dxos/plugin-status-bar`           |     4 |         |      2 |       |            |       2 |
| `@dxos/react-ui-geo`                |     4 |         |      3 |       |            |       1 |
| `@dxos/testbench-app`               |     3 |       3 |        |       |            |         |
| `@dxos/plugin-calls`                |     3 |       3 |        |       |            |         |
| `@dxos/plugin-meeting`              |     3 |       1 |      1 |       |            |       1 |
| `@dxos/plugin-pipeline`             |     3 |       1 |        |       |            |       2 |
| `@dxos/plugin-preview`              |     3 |       2 |        |       |            |       1 |
| `@dxos/plugin-projects`             |     3 |       1 |      1 |       |            |       1 |
| `@dxos/plugin-search`               |     3 |       2 |        |       |            |       1 |
| `@dxos/react-ui-card`               |     3 |       2 |        |       |          1 |         |
| `@dxos/react-ui-search`             |     3 |       1 |        |       |            |       2 |
| `@dxos/plugin-bookmarks`            |     3 |         |      1 |       |          1 |       1 |
| `@dxos/plugin-conductor`            |     3 |         |      1 |       |            |       2 |
| `@dxos/plugin-crx`                  |     3 |         |      2 |       |            |       1 |
| `@dxos/plugin-devtools`             |     3 |         |      2 |       |            |       1 |
| `@dxos/plugin-map`                  |     3 |         |      1 |       |            |       2 |
| `@dxos/plugin-sandbox`              |     3 |         |      1 |       |            |       2 |
| `@dxos/plugin-spacetime`            |     3 |         |      1 |       |            |       2 |
| `@dxos/composer-app`                |     2 |       1 |        |       |            |       1 |
| `@dxos/plugin-lingo`                |     2 |       1 |        |       |          1 |         |
| `@dxos/plugin-theme`                |     2 |       2 |        |       |            |         |
| `@dxos/plugin-transcription`        |     2 |       2 |        |       |            |         |
| `@dxos/app-framework`               |     2 |       1 |        |       |            |       1 |
| `@dxos/app-toolkit`                 |     2 |       1 |        |       |            |       1 |
| `@dxos/examples`                    |     2 |       2 |        |       |            |         |
| `@dxos/storybook-testing`           |     2 |       2 |        |       |            |         |
| `@dxos/react-ui-canvas-editor`      |     2 |       1 |        |       |            |       1 |
| `@dxos/react-ui-dashboard`          |     2 |       1 |        |       |            |       1 |
| `@dxos/react-ui-debug`              |     2 |       1 |        |       |            |       1 |
| `@dxos/plugin-chess-com`            |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-excalidraw`           |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-payments`             |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-presenter`            |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-tldraw`               |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-zen`                  |     2 |         |      1 |       |            |       1 |
| `@dxos/plugin-iroh-beacon`          |     2 |         |        |       |          2 |         |
| `@dxos/plugin-stack`                |     2 |         |        |       |          1 |       1 |
| `@dxos/composer-crx`                |     1 |       1 |        |       |            |         |
| `@dxos/plugin-file`                 |     1 |       1 |        |       |            |         |
| `@dxos/plugin-heygen`               |     1 |       1 |        |       |            |         |
| `@dxos/plugin-markdown`             |     1 |       1 |        |       |            |         |
| `@dxos/plugin-progress`             |     1 |       1 |        |       |            |         |
| `@dxos/app-graph`                   |     1 |       1 |        |       |            |         |
| `@dxos/plugin-blogger`              |     1 |         |        |       |          1 |         |
| `@dxos/plugin-thread`               |     1 |         |        |       |          1 |         |
| `@dxos/react-ui-syntax-highlighter` |     1 |         |        |       |          1 |         |
| `@dxos/plugin-game`                 |     1 |         |        |       |            |       1 |
| `@dxos/react-ui-dnd`                |     1 |         |        |       |            |       1 |
| `@dxos/react-ui-grid`               |     1 |         |        |       |            |       1 |
| `@dxos/react-ui-masonry`            |     1 |         |        |       |            |       1 |

### Residue per reason

| Transform    | Reason                                                                                                            | Items |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ----: |
| `layout`     | Flex not converted: classNames (layout classes need a person)                                                     |    88 |
| `imports`    | Flex: Flex → Container layout / Group; a layout decision                                                          |    83 |
| `layout`     | Flex not converted: a row (Group pads and wraps, a Container row needs columns)                                   |    38 |
| `renames`    | button size set: its scope is decided by the caller (another component)                                           |    37 |
| `layout`     | Grid not converted: classNames (a person decides the layout)                                                      |    23 |
| `imports`    | Grid: Grid → Container columns; a layout decision                                                                 |    21 |
| `imports`    | Column: Column → gutter Container (+ Block rail); restructure by hand                                             |    20 |
| `renames`    | Listbox.Viewport dropped: Listbox.Content scrolls (scroll={false} to defer to the host)                           |    14 |
| `renames`    | iconClassNames has no Next equivalent (Button has no icon slot)                                                   |    13 |
| `renames`    | Banner.Content unwrapped; its props need a new home (classNames)                                                  |    12 |
| `renames`    | Avatar.Root holds more than a lone Avatar.Content: merge by hand (Label/Description → label or aria-labelledby)   |    12 |
| `imports`    | Avatar.Content has no Next part (run renames first, or port by hand)                                              |    12 |
| `renames`    | Select.Item takes `item` data ({ value, label }); children replace the whole row                                  |    10 |
| `renames`    | size {8} rounded to the nearest step, 'xl'                                                                        |    10 |
| `renames`    | Avatar.Label → Avatar.Root label or aria-labelledby                                                               |    10 |
| `imports`    | Avatar.Label has no Next part (run renames first, or port by hand)                                                |    10 |
| `renames`    | size {iconSize} is computed; map it to xs–xl by hand                                                              |     9 |
| `imports`    | Listbox.ItemContent has no Next part (run renames first, or port by hand)                                         |     8 |
| `renames`    | Listbox.ItemContent: icon is computed or a custom element; pass its props to ItemIcon by hand                     |     7 |
| `theme`      | useThemeContext().tx has no Next hook (tx goes with the current components)                                       |     7 |
| `classnames` | dx-document on Toolbar.Root: the prop exists only on other hosts                                                  |     7 |
| `renames`    | Avatar size is xs–xl (a block across) or fill in Next                                                             |     6 |
| `classnames` | line-clamp-3 on Card.Text: the prop exists only on other hosts                                                    |     6 |
| `imports`    | type ScrollAreaRootProps is now a local alias of ComponentProps<typeof ScrollArea.Root>                           |     6 |
| `renames`    | Toast.Title icon → Toast.Header icon                                                                              |     5 |
| `renames`    | Toast.Title onClose → Toast.Header (CloseTrigger reports through onOpenChange)                                    |     5 |
| `renames`    | size {size} is computed; map it to xs–xl by hand                                                                  |     5 |
| `layout`     | Flex not converted: align or justify other than the grid default                                                  |     5 |
| `layout`     | Flex not converted: spread props                                                                                  |     5 |
| `layout`     | Column.Root not converted: classNames (layout classes need a person)                                              |     5 |
| `layout`     | Column.Section → an inheriting Container, by hand                                                                 |     5 |
| `imports`    | type SelectRootProps is now a local alias of ComponentProps<typeof Select.Root>                                   |     5 |
| `imports`    | ElevationProvider: ElevationProvider → `level` on the host                                                        |     5 |
| `imports`    | ToggleIconButton: ToggleIconButton → Next.Toggle (activeIcon)                                                     |     5 |
| `imports`    | useThemeContext: Next has no tx theme context (decision 3)                                                        |     5 |
| `renames`    | ScrollContainer.Content thin → width                                                                              |     4 |
| `renames`    | Carousel.Content dropped: Root is the grid (a subgrid may be needed)                                              |     4 |
| `renames`    | Carousel.Content unwrapped; its props need a new home (classNames)                                                |     4 |
| `renames`    | button density with a computed value renamed to size; check it is xs–xl                                           |     4 |
| `renames`    | Field.TriggerIcon → DateInput trigger or a Button in the end slot                                                 |     4 |
| `renames`    | size {16} rounded to the nearest step, 'xl'                                                                       |     4 |
| `layout`     | Grid not converted: rows (a person decides the layout)                                                            |     4 |
| `layout`     | Flex not converted: gap='xl' has no Container step                                                                |     4 |
| `layout`     | Grid not converted: cols is missing, computed or subgrid                                                          |     4 |
| `classnames` | text-error-text on Icon inside a computed classNames                                                              |     4 |
| `classnames` | dx-document on ScrollArea.Viewport: the prop exists only on other hosts                                           |     4 |
| `classnames` | animate-spin on Icon inside a computed classNames                                                                 |     4 |
| `classnames` | line-clamp-2 on Card.Text: the prop exists only on other hosts                                                    |     4 |
| `imports`    | createStaticTreeModel: the Next Tree is driven by TreeModel atoms; rewrite the model                              |     4 |
| `imports`    | Field.TriggerIcon has no Next part (run renames first, or port by hand)                                           |     4 |
| `imports`    | Field.DateTime has no Next part (run renames first, or port by hand)                                              |     4 |
| `imports`    | Field.Time has no Next part (run renames first, or port by hand)                                                  |     4 |
| `renames`    | iconEnd is a boolean in the current Button and the icon name in Next                                              |     3 |
| `renames`    | master-detail Tabs are removed: compose Tabs + Splitter (collapseBelow)                                           |     3 |
| `renames`    | size {pinned ? 5 : 4} is computed; map it to xs–xl by hand                                                        |     3 |
| `renames`    | size {10} rounded to the nearest step, 'xl'                                                                       |     3 |
| `renames`    | Accordion items/getId render prop is not ported                                                                   |     3 |
| `layout`     | Flex not converted: asChild (layout classes need a person)                                                        |     3 |
| `layout`     | Column.Root not converted: spread props                                                                           |     3 |
| `classnames` | text-success-text on Icon inside a computed classNames                                                            |     3 |
| `classnames` | text-description on Icon inside a computed classNames                                                             |     3 |
| `imports`    | TREE_BLOCK: the Next Tree sizes rows from its scope                                                               |     3 |
| `imports`    | Tabs.Viewport has no Next part (run renames first, or port by hand)                                               |     3 |
| `imports`    | Combobox.Portal has no Next part (run renames first, or port by hand)                                             |     3 |
| `imports`    | DensityProvider: DensityProvider → `size` on the nearest Container/Panel                                          |     3 |
| `renames`    | size {12} rounded to the nearest step, 'xl'                                                                       |     2 |
| `renames`    | density with a computed value renamed to size; check it is xs–xl                                                  |     2 |
| `renames`    | VirtualTrigger is not a direct child of its Root: add positioning={virtualAnchor(ref)} by hand                    |     2 |
| `renames`    | size {2} rounded to the nearest step, 'xs'                                                                        |     2 |
| `renames`    | AlertDialog.Overlay unwrapped; its props need a new home (classNames, style)                                      |     2 |
| `renames`    | OrderedList.DetailItem → Item collapsible + OrderedList.Detail                                                    |     2 |
| `renames`    | Next.Tag has no asChild                                                                                           |     2 |
| `renames`    | size {28} rounded to the nearest step, 'xl'                                                                       |     2 |
| `layout`     | Grid not converted: align other than 'center' (a Container row centres its cells)                                 |     2 |
| `layout`     | Flex not converted: gap='2xl' has no Container step                                                               |     2 |
| `layout`     | Column.Root not converted: a computed gutter or gap                                                               |     2 |
| `classnames` | dx-document on Panel.Body: the prop exists only on other hosts                                                    |     2 |
| `classnames` | text-subdued on Icon inside a computed classNames                                                                 |     2 |
| `classnames` | col-span-3 on Card.Root: the prop exists only on other hosts                                                      |     2 |
| `imports`    | type FlexProps has no Next counterpart                                                                            |     2 |
| `imports`    | AlertDialog.Overlay has no Next part (run renames first, or port by hand)                                         |     2 |
| `imports`    | Dialog.Overlay has no Next part (run renames first, or port by hand)                                              |     2 |
| `imports`    | Popover.VirtualTrigger has no Next part (run renames first, or port by hand)                                      |     2 |
| `imports`    | Field.Date has no Next part (run renames first, or port by hand)                                                  |     2 |
| `imports`    | OrderedList.DetailItem has no Next part (run renames first, or port by hand)                                      |     2 |
| `imports`    | Form.Label has no Next part (run renames first, or port by hand)                                                  |     2 |
| `imports`    | Picker: Picker → Next.Combobox trigger mode (decision 9)                                                          |     2 |
| `imports`    | type AvatarContentProps has no Next counterpart                                                                   |     2 |
| `imports`    | IconButton is converted by the renames transform; run it first                                                    |     2 |
| `imports`    | useElevationContext: Next has no elevation context; levels come from CSS scope                                    |     2 |
| `imports`    | type DialogContentProps is now a local alias of ComponentProps<typeof Dialog.Content>                             |     2 |
| `imports`    | type ColumnRootProps has no Next counterpart                                                                      |     2 |
| `renames`    | Breadcrumb.Item has no asChild: Item > Link asChild                                                               |     1 |
| `renames`    | Tabs.TabPrimitive is not ported                                                                                   |     1 |
| `renames`    | Banner.Content unwrapped; its props need a new home (data-testid)                                                 |     1 |
| `renames`    | size {isMobile ? 8 : 14} is computed; map it to xs–xl by hand                                                     |     1 |
| `renames`    | Accordion getId is not ported                                                                                     |     1 |
| `renames`    | Tour.Arrow unwrapped; its props need a new home (classNames)                                                      |     1 |
| `renames`    | Tooltip.Provider unwrapped; its props need a new home (delayDuration, skipDelayDuration, disableHoverableContent) |     1 |
| `renames`    | Listbox.Viewport unwrapped; its props need a new home (thin, padding)                                             |     1 |
| `renames`    | AlertDialog.Overlay unwrapped; its props need a new home (classNames)                                             |     1 |
| `renames`    | Dialog.Overlay unwrapped; its props need a new home (blockAlign)                                                  |     1 |
| `renames`    | Listbox.Viewport unwrapped; its props need a new home (thin)                                                      |     1 |
| `renames`    | size {Number(size) >= 8 ? 5 : 4} is computed; map it to xs–xl by hand                                             |     1 |
| `renames`    | TextCrawl textClassNames dropped                                                                                  |     1 |
| `renames`    | Listbox.ItemContent: props other than icon, title, description (in that order); compose the row parts by hand     |     1 |
| `renames`    | Listbox.Viewport unwrapped; its props need a new home (classNames, thin)                                          |     1 |
| `renames`    | Menu.SubContent → a nested Menu.Content inside Menu.Sub                                                           |     1 |
| `renames`    | Menu.Portal unwrapped; its props need a new home (container)                                                      |     1 |
| `renames`    | Menu.Viewport unwrapped; its props need a new home (classNames)                                                   |     1 |
| `renames`    | Listbox.Viewport unwrapped; its props need a new home (classNames, style, ref)                                    |     1 |
| `layout`     | Flex not converted: a child is a computed value                                                                   |     1 |
| `layout`     | Flex not converted: a child has self-start                                                                        |     1 |
| `layout`     | Grid not converted: it grows to fill its parent (Grid grow defaults to true)                                      |     1 |
| `layout`     | Flex not converted: a child spreads props                                                                         |     1 |
| `layout`     | Flex not converted: gap='lg' has no Container step                                                                |     1 |
| `layout`     | Grid not converted: spread props                                                                                  |     1 |
| `layout`     | Flex not converted: gap='form' has no Container step                                                              |     1 |
| `layout`     | Column.Root not converted: style (layout classes need a person)                                                   |     1 |
| `layout`     | Column.Root not converted: a child other than Column.Center / Column.Row (Column places it in a gutter track)     |     1 |
| `layout`     | Flex not converted: wrap, grow or center                                                                          |     1 |
| `classnames` | col-span-2 on Toolbar.Root: the prop exists only on other hosts                                                   |     1 |
| `classnames` | line-clamp-1 on Card.Text: the prop exists only on other hosts                                                    |     1 |
| `classnames` | line-clamp-2 on Collapsible.Trigger: the prop exists only on other hosts                                          |     1 |
| `classnames` | col-span-3 on Input: the prop exists only on other hosts                                                          |     1 |
| `classnames` | col-span-2 on Flex: the prop exists only on other hosts                                                           |     1 |
| `classnames` | dx-document on Grid: the prop exists only on other hosts                                                          |     1 |
| `classnames` | col-span-2 on Grid: the prop exists only on other hosts                                                           |     1 |
| `classnames` | dx-document on Flex: the prop exists only on other hosts                                                          |     1 |
| `classnames` | dx-document on Column.Center: the prop exists only on other hosts                                                 |     1 |
| `classnames` | font-mono on Input: variant is already set                                                                        |     1 |
| `classnames` | col-span-2 on ScrollArea.Root: the prop exists only on other hosts                                                |     1 |
| `imports`    | type AlertDialogRootProps is now a local alias of ComponentProps<typeof AlertDialog.Root>                         |     1 |
| `imports`    | type TreeItemDataProps has no Next counterpart                                                                    |     1 |
| `imports`    | type CardMenuProps is now a local alias of ComponentProps<typeof Card.Menu>                                       |     1 |
| `imports`    | type CardRootProps is now a local alias of ComponentProps<typeof Card.Root>                                       |     1 |
| `imports`    | MasterDetail: MasterDetail is removed: compose the list with Splitter (collapseBelow)                             |     1 |
| `imports`    | Toast is also declared in this file; rewrite its uses by hand                                                     |     1 |
| `imports`    | useDensityContext: Next has no density context; sizes come from CSS scope                                         |     1 |
| `imports`    | Tabs.TabPrimitive has no Next part (run renames first, or port by hand)                                           |     1 |
| `imports`    | type TreeProps is now a local alias of ComponentProps<typeof Tree>                                                |     1 |
| `imports`    | FormFieldHeader: FormFieldHeader is not in react-ui-form/next                                                     |     1 |
| `imports`    | useListSelection: useListSelection → listboxSelection adapter (react-ui-list/next)                                |     1 |
| `imports`    | ThrowError: ThrowError is not ported                                                                              |     1 |
| `imports`    | type AlertDialogContentProps is now a local alias of ComponentProps<typeof AlertDialog.Content>                   |     1 |
| `imports`    | TupleField: TupleField is not in react-ui-form/next                                                               |     1 |
| `imports`    | type ToggleGroupItemProps is now a local alias of ComponentProps<typeof ToggleGroup.Item>                         |     1 |
| `imports`    | useInColumn: Column is not ported                                                                                 |     1 |
| `imports`    | withColumn: Column is not ported                                                                                  |     1 |
| `imports`    | Combobox.VirtualTrigger has no Next part (run renames first, or port by hand)                                     |     1 |
| `imports`    | type ComboboxRootProps has no Next counterpart                                                                    |     1 |
| `imports`    | Popover.Portal has no Next part (run renames first, or port by hand)                                              |     1 |
| `imports`    | type PopoverContentProps is now a local alias of ComponentProps<typeof Popover.Content>                           |     1 |
| `imports`    | type PopoverVirtualTriggerProps has no Next counterpart                                                           |     1 |
| `imports`    | Menu.VirtualTrigger has no Next part (run renames first, or port by hand)                                         |     1 |
| `imports`    | type MenuRootProps is now a local alias of ComponentProps<typeof Menu.Root>                                       |     1 |
| `imports`    | type ToolbarSeparatorProps is now a local alias of ComponentProps<typeof Toolbar.Separator>                       |     1 |
| `imports`    | Toolbar.Button has no Next part (run renames first, or port by hand)                                              |     1 |

### Codemod defects found by the real run

1. **Fixed here** (`codemorph: fix the label fragment start …`): `Field.Checkbox` whose children open with text
   (`Disable{' '}<a>…</a>`) produced `label={<> '}` and oxfmt aborted the `renames` run. `JsxText.getStart()` already
   skips leading whitespace, so subtracting it again cut into the text. Regression case added to
   `composites.test.ts`.
2. **Open:** a part promoted out of an _aliased_ namespace import loses its binding. `Toolbar as NaturalToolbar` →
   `<NaturalToolbar.Button>` becomes `<NaturalButton>`, `Field as NaturalField` → `<NaturalInput>`, and
   `Tour as TourComponent` → `<TourCompoTour>`, with no import for the new name. 44 `TS2304` errors in 3 files
   (react-ui-canvas-editor `Toolbar.tsx`, shell `TextInput.tsx`, plugin-support `GuidedTour.tsx`). Fix in `renames`
   and rerun, rather than hand-edit.
3. **Open (cascade):** `TS2883` ("inferred type cannot be named without a reference to … react-ui/src/next") is
   emitted when an exported composite (`Mosaic`, `Dashboard`, …) infers a Next prop type. tsgo then drops that
   export from the declaration file, so `react-ui-mosaic`'s single `Mosaic.ts` error surfaces as ~60 `TS2305`
   errors downstream (`Mosaic`, `MosaicTileProps`, `useMosaicContainer`, …). Next should export the referenced types
   (`ButtonProps`, `ButtonVariantProps`, `TooltipSide`) from its public entry, or the composites need annotations;
   fixing the 14 `TS2883` sites first removes the cascade.

### Type errors after the codemods

### Method

`moon exec --on-failure continue --quiet :build` stops being informative early: six UI libraries fail
(`react-ui-pickers`, `-dashboard`, `-masonry`, `-syntax-highlighter`, `-board`, `storybook-utils`) and moon skips
every project that depends on them, which is nearly all of them. The table therefore comes from
`pnpm exec tsc -b tsconfig.all.json --pretty false` (tsgo 7.0.2), whose build mode keeps building downstream
projects after upstream errors and emits their declarations anyway, so each package is checked against its real
dependencies. Errors in `eslint-plugin-rules`, `vscode-extension`, `discord-worker`, `tools/**` and the root vite
config are environment noise of `tsc -b` (missing `node` types, `rootDir`) unrelated to react-ui, and are excluded.
Of the 446 files with errors, all but 28 were changed by this branch; the 28 are downstream of a changed
file (Select `onValueChange` details, mosaic exports).

Batches follow AUDIT §7 Phase C step 2 in dependency order; within a batch, packages are ordered by dependency
depth (longest `@dxos/*` dependency chain), so fixing top to bottom never waits on a later row. The estimate
assumes 40 type errors or 15 residue items per agent-hour (residue needs a layout or API decision; most type
errors are mechanical prop renames) and excludes visual verification.

### Summary

| Batch                             | Packages | Type errors | Files with errors | Residue items | Estimate (agent-hours) |
| --------------------------------- | -------: | ----------: | ----------------: | ------------: | ---------------------: |
| 1 UI libraries                    |       33 |         374 |               120 |           182 |                   21.5 |
| 2 Shell / SDK / devtools / common |       13 |         177 |                72 |           101 |                   11.2 |
| 3 Plugins                         |       69 |         415 |               168 |           336 |                   32.8 |
| 4 Plugins (isolated)              |        4 |         188 |                69 |           126 |                   13.1 |
| 5 Apps                            |        3 |          14 |                 6 |             6 |                    0.8 |
| **Total**                         |      122 |        1168 |               435 |           751 |                   79.3 |

#### Batch 1 UI libraries

| Package                             | Depth | Type errors | Files | Residue | Top error kinds                                                                                        |
| ----------------------------------- | ----: | ----------: | ----: | ------: | ------------------------------------------------------------------------------------------------------ |
| `@dxos/react-ui-pickers`            |    12 |          12 |     3 |       6 | TS2322 prop/type mismatch (7), TS2345 argument type (2), TS2741 missing required prop (2)              |
| `@dxos/react-ui-dashboard`          |    12 |           5 |     1 |       2 | TS2883 unnameable inferred type (2), TS2604 no construct signature (1), TS2786 not a JSX component (1) |
| `@dxos/react-ui-masonry`            |    12 |           4 |     2 |       1 | TS2322 prop/type mismatch (2), TS2739 missing required props (1), TS2344 type constraint (1)           |
| `@dxos/react-ui-syntax-highlighter` |    12 |           4 |     2 |       1 | TS2322 prop/type mismatch (3), TS7006 implicit any param (1)                                           |
| `@dxos/react-ui-dnd`                |    12 |           0 |     0 |       1 |                                                                                                        |
| `@dxos/react-ui-geo`                |    12 |           0 |     0 |       4 |                                                                                                        |
| `@dxos/react-ui-board`              |    13 |           1 |     1 |       0 | TS2322 prop/type mismatch (1)                                                                          |
| `@dxos/react-ui-graph`              |    13 |           1 |     1 |       0 | TS2322 prop/type mismatch (1)                                                                          |
| `@dxos/react-ui-menu`               |    27 |          14 |     4 |      17 | TS2322 prop/type mismatch (10), TS2741 missing required prop (1), TS2345 argument type (1)             |
| `@dxos/react-ui-list`               |    28 |          31 |    11 |      15 | TS2322 prop/type mismatch (9), TS2339 missing property/part (7), TS2739 missing required props (6)     |
| `@dxos/react-ui-editor`             |    29 |          15 |     6 |       8 | TS2322 prop/type mismatch (8), TS2749 value used as type (3), TS7006 implicit any param (2)            |
| `@dxos/react-ui-debug`              |    29 |          10 |     1 |       2 | TS2322 prop/type mismatch (6), TS2741 missing required prop (2), TS2367 no-overlap comparison (1)      |
| `@dxos/react-ui-search`             |    29 |           7 |     2 |       3 | TS2739 missing required props (5), TS2322 prop/type mismatch (1), TS2344 type constraint (1)           |
| `@dxos/react-ui-rdf`                |    29 |           3 |     1 |       0 | TS2322 prop/type mismatch (2), TS2741 missing required prop (1)                                        |
| `@dxos/react-ui-mosaic`             |    30 |          21 |     9 |       0 | TS2322 prop/type mismatch (15), TS2367 no-overlap comparison (3), TS2883 unnameable inferred type (2)  |
| `@dxos/react-ui-grid`               |    30 |           8 |     1 |       1 | TS2322 prop/type mismatch (5), TS2305 missing export (1), TS7006 implicit any param (1)                |
| `@dxos/react-ui-markdown`           |    30 |           2 |     2 |       0 | TS2883 unnameable inferred type (1), TS2322 prop/type mismatch (1)                                     |
| `@dxos/react-ui-task`               |    31 |          18 |     6 |      18 | TS2322 prop/type mismatch (6), TS2724 missing export (did you mean) (4), TS7006 implicit any param (3) |
| `@dxos/react-ui-card`               |    31 |          13 |     4 |       3 | TS2322 prop/type mismatch (10), TS2305 missing export (2), TS7006 implicit any param (1)               |
| `@dxos/react-ui-components`         |    31 |           8 |     4 |       4 | TS2322 prop/type mismatch (5), TS2345 argument type (2), TS2367 no-overlap comparison (1)              |
| `@dxos/react-ui-thread`             |    31 |           5 |     2 |       6 | TS2339 missing property/part (3), TS2305 missing export (2)                                            |
| `@dxos/react-ui-form`               |    32 |          55 |    21 |      24 | TS2322 prop/type mismatch (35), TS2339 missing property/part (11), TS2345 argument type (2)            |
| `@dxos/react-ui-trace`              |    32 |          17 |     5 |      10 | TS2322 prop/type mismatch (12), TS2604 no construct signature (1), TS2786 not a JSX component (1)      |
| `@dxos/react-ui-feed`               |    32 |           6 |     4 |      11 | TS2322 prop/type mismatch (2), TS2739 missing required props (2), TS2344 type constraint (1)           |
| `@dxos/react-ui-chat`               |    32 |           3 |     1 |       0 | TS2322 prop/type mismatch (2), TS7006 implicit any param (1)                                           |
| `@dxos/react-ui-canvas`             |    33 |          27 |     4 |       8 | TS2304 name not found (15), TS2741 missing required prop (6), TS2322 prop/type mismatch (5)            |
| `@dxos/react-ui-table`              |    33 |          12 |     4 |       0 | TS2741 missing required prop (7), TS2322 prop/type mismatch (3), TS2749 value used as type (2)         |
| `@dxos/ui-template`                 |    33 |           9 |     3 |      17 | TS2322 prop/type mismatch (5), TS2741 missing required prop (3), TS7006 implicit any param (1)         |
| `@dxos/react-ui-introspect`         |    33 |           7 |     3 |       6 | TS2322 prop/type mismatch (5), TS2741 missing required prop (2)                                        |
| `@dxos/react-ui-assistant`          |    33 |           6 |     2 |       5 | TS2322 prop/type mismatch (2), TS2739 missing required props (1), TS2558 type argument count (1)       |
| `@dxos/react-ui-mcp`                |    33 |           2 |     1 |       0 | TS2741 missing required prop (1), TS2322 prop/type mismatch (1)                                        |
| `@dxos/react-ui-canvas-editor`      |    34 |          28 |     1 |       2 | TS2304 name not found (24), TS2322 prop/type mismatch (2), TS2352 unsafe conversion (1)                |
| `@dxos/react-ui-canvas-compute`     |    43 |          20 |     8 |       7 | TS2322 prop/type mismatch (14), TS2352 unsafe conversion (3), TS2741 missing required prop (2)         |

#### Batch 2 Shell / SDK / devtools / common

| Package                   | Depth | Type errors | Files | Residue | Top error kinds                                                                                      |
| ------------------------- | ----: | ----------: | ----: | ------: | ---------------------------------------------------------------------------------------------------- |
| `@dxos/storybook-utils`   |    12 |           2 |     1 |       0 | TS2322 prop/type mismatch (2)                                                                        |
| `@dxos/app-graph`         |    26 |           1 |     1 |       1 | TS2322 prop/type mismatch (1)                                                                        |
| `dxos-example-template`   |    26 |           1 |     1 |       0 | TS2322 prop/type mismatch (1)                                                                        |
| `@dxos/shell`             |    29 |          72 |    26 |      49 | TS2322 prop/type mismatch (30), TS2339 missing property/part (25), TS2741 missing required prop (11) |
| `@dxos/app-framework`     |    29 |           2 |     1 |       2 | TS2322 prop/type mismatch (1), TS2741 missing required prop (1)                                      |
| `@dxos/app-toolkit`       |    30 |          11 |     4 |       2 | TS2322 prop/type mismatch (6), TS2741 missing required prop (1), TS2883 unnameable inferred type (1) |
| `@dxos/stories-lens`      |    33 |           5 |     2 |       0 | TS2322 prop/type mismatch (5)                                                                        |
| `@dxos/devtools`          |    34 |          51 |    21 |      43 | TS2322 prop/type mismatch (32), TS2741 missing required prop (8), TS2345 argument type (5)           |
| `@dxos/storybook-testing` |    40 |           7 |     3 |       2 | TS2322 prop/type mismatch (5), TS2739 missing required props (1), TS2741 missing required prop (1)   |
| `@dxos/examples`          |    42 |           4 |     1 |       2 | TS2345 argument type (2), TS2322 prop/type mismatch (2)                                              |
| `@dxos/stories-brain`     |    50 |          14 |     7 |       0 | TS2322 prop/type mismatch (8), TS2741 missing required prop (3), TS2367 no-overlap comparison (2)    |
| `@dxos/stories-assistant` |    51 |           4 |     2 |       0 | TS2322 prop/type mismatch (3), TS2345 argument type (1)                                              |
| `@dxos/stories-inbox`     |    51 |           3 |     2 |       0 | TS2322 prop/type mismatch (3)                                                                        |

#### Batch 3 Plugins

| Package                      | Depth | Type errors | Files | Residue | Top error kinds                                                                                     |
| ---------------------------- | ----: | ----------: | ----: | ------: | --------------------------------------------------------------------------------------------------- |
| `@dxos/plugin-theme`         |    31 |           1 |     1 |       2 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-attention`     |    32 |           2 |     1 |       0 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-testing`       |    34 |           8 |     2 |       4 | TS2322 prop/type mismatch (4), TS2339 missing property/part (2), TS7006 implicit any param (1)      |
| `@dxos/plugin-client`        |    36 |          12 |     6 |      22 | TS2322 prop/type mismatch (7), TS2741 missing required prop (4), TS2367 no-overlap comparison (1)   |
| `@dxos/plugin-mobile`        |    37 |          21 |     3 |      11 | TS2322 prop/type mismatch (7), TS2339 missing property/part (6), TS2305 missing export (4)          |
| `@dxos/plugin-navtree`       |    37 |          20 |     9 |      10 | TS2322 prop/type mismatch (12), TS2339 missing property/part (2), TS2604 no construct signature (1) |
| `@dxos/plugin-calls`         |    37 |          16 |     3 |       3 | TS2741 missing required prop (7), TS2322 prop/type mismatch (7), TS2344 type constraint (2)         |
| `@dxos/plugin-registry`      |    37 |          13 |     5 |      13 | TS2322 prop/type mismatch (11), TS2604 no construct signature (1), TS2786 not a JSX component (1)   |
| `@dxos/plugin-search`        |    37 |           9 |     3 |       3 | TS2305 missing export (3), TS2322 prop/type mismatch (2), TS2741 missing required prop (1)          |
| `@dxos/plugin-preview`       |    37 |           5 |     5 |       3 | TS2322 prop/type mismatch (4), TS2739 missing required props (1)                                    |
| `@dxos/plugin-doctor`        |    37 |           3 |     1 |       5 | TS2749 value used as type (3)                                                                       |
| `@dxos/plugin-status-bar`    |    37 |           1 |     1 |       4 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-payments`      |    37 |           0 |     0 |       2 |                                                                                                     |
| `@dxos/plugin-progress`      |    38 |           2 |     1 |       1 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-iroh-beacon`   |    38 |           1 |     1 |       2 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-support`       |    39 |          18 |     5 |      18 | TS2322 prop/type mismatch (6), TS2741 missing required prop (6), TS2304 name not found (4)          |
| `@dxos/plugin-kanban`        |    39 |           9 |     4 |       0 | TS2305 missing export (4), TS2322 prop/type mismatch (4), TS2741 missing required prop (1)          |
| `@dxos/plugin-sequencer`     |    39 |           3 |     2 |       5 | TS2741 missing required prop (1), TS2322 prop/type mismatch (1), TS7006 implicit any param (1)      |
| `@dxos/plugin-terra`         |    39 |           3 |     2 |       0 | TS2322 prop/type mismatch (3)                                                                       |
| `@dxos/plugin-code`          |    39 |           2 |     1 |       4 | TS2322 prop/type mismatch (1), TS7006 implicit any param (1)                                        |
| `@dxos/plugin-explorer`      |    39 |           2 |     2 |       0 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-library`       |    39 |           2 |     2 |      15 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-zen`           |    39 |           2 |     1 |       2 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-game`          |    39 |           1 |     1 |       1 | TS2739 missing required props (1)                                                                   |
| `@dxos/plugin-illustrator`   |    39 |           1 |     1 |       5 | TS2739 missing required props (1)                                                                   |
| `@dxos/plugin-sample`        |    39 |           1 |     1 |       0 | TS2741 missing required prop (1)                                                                    |
| `@dxos/plugin-spacetime`     |    39 |           1 |     1 |       3 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-table`         |    39 |           1 |     1 |       0 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-map`           |    39 |           0 |     0 |       3 |                                                                                                     |
| `@dxos/plugin-thread`        |    39 |           0 |     0 |       1 |                                                                                                     |
| `@dxos/plugin-chess`         |    40 |           1 |     1 |       5 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-tldraw`        |    40 |           1 |     1 |       2 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-excalidraw`    |    40 |           0 |     0 |       2 |                                                                                                     |
| `@dxos/plugin-markdown`      |    41 |           9 |     6 |       1 | TS2749 value used as type (4), TS2322 prop/type mismatch (3), TS2739 missing required props (2)     |
| `@dxos/plugin-chess-com`     |    41 |           2 |     1 |       2 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-stack`         |    42 |          14 |     2 |       2 | TS2741 missing required prop (7), TS2305 missing export (4), TS2344 type constraint (1)             |
| `@dxos/plugin-board`         |    42 |           6 |     1 |       0 | TS2339 missing property/part (4), TS2305 missing export (1), TS7006 implicit any param (1)          |
| `@dxos/plugin-review`        |    42 |           4 |     4 |       8 | TS2322 prop/type mismatch (3), TS2339 missing property/part (1)                                     |
| `@dxos/plugin-file`          |    42 |           3 |     2 |       1 | TS2322 prop/type mismatch (3)                                                                       |
| `@dxos/plugin-video`         |    42 |           2 |     1 |       6 | TS2339 missing property/part (2)                                                                    |
| `@dxos/plugin-crx`           |    42 |           1 |     1 |       3 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-transcription` |    42 |           1 |     1 |       2 | TS2741 missing required prop (1)                                                                    |
| `@dxos/plugin-lingo`         |    42 |           0 |     0 |       2 |                                                                                                     |
| `@dxos/plugin-presenter`     |    42 |           0 |     0 |       2 |                                                                                                     |
| `@dxos/plugin-routine`       |    43 |          33 |     8 |       9 | TS2322 prop/type mismatch (11), TS7006 implicit any param (7), TS2339 missing property/part (4)     |
| `@dxos/plugin-commerce`      |    43 |           7 |     3 |      10 | TS2322 prop/type mismatch (7)                                                                       |
| `@dxos/plugin-sheet`         |    43 |           5 |     1 |       0 | TS2741 missing required prop (3), TS2322 prop/type mismatch (2)                                     |
| `@dxos/plugin-bookmarks`     |    43 |           2 |     2 |       3 | TS2322 prop/type mismatch (2)                                                                       |
| `@dxos/plugin-magazine`      |    44 |          24 |     6 |       8 | TS2322 prop/type mismatch (14), TS2305 missing export (6), TS7006 implicit any param (2)            |
| `@dxos/plugin-connector`     |    44 |           5 |     3 |       6 | TS2741 missing required prop (2), TS2739 missing required props (1), TS2322 prop/type mismatch (1)  |
| `@dxos/plugin-conductor`     |    44 |           0 |     0 |       3 |                                                                                                     |
| `@dxos/plugin-github`        |    45 |          14 |     7 |      15 | TS2322 prop/type mismatch (8), TS7006 implicit any param (2), TS2367 no-overlap comparison (1)      |
| `@dxos/plugin-ibkr`          |    45 |           7 |     5 |       6 | TS2322 prop/type mismatch (6), TS2741 missing required prop (1)                                     |
| `@dxos/plugin-blogger`       |    45 |           5 |     2 |       1 | TS2322 prop/type mismatch (4), TS2739 missing required props (1)                                    |
| `@dxos/plugin-atproto`       |    45 |           0 |     0 |       6 |                                                                                                     |
| `@dxos/plugin-trip`          |    46 |          19 |     6 |       4 | TS2305 missing export (8), TS2322 prop/type mismatch (8), TS7006 implicit any param (2)             |
| `@dxos/plugin-pipeline`      |    46 |          10 |     3 |       3 | TS2305 missing export (2), TS2322 prop/type mismatch (2), TS2883 unnameable inferred type (2)       |
| `@dxos/plugin-tasks`         |    46 |           3 |     3 |      12 | TS2322 prop/type mismatch (3)                                                                       |
| `@dxos/plugin-meeting`       |    46 |           1 |     1 |       3 | TS2741 missing required prop (1)                                                                    |
| `@dxos/plugin-sidekick`      |    47 |           3 |     1 |       0 | TS2367 no-overlap comparison (3)                                                                    |
| `@dxos/plugin-onboarding`    |    48 |          14 |     1 |      21 | TS7006 implicit any param (8), TS2339 missing property/part (3), TS2322 prop/type mismatch (2)      |
| `@dxos/plugin-script`        |    48 |          13 |     5 |       9 | TS2741 missing required prop (5), TS7006 implicit any param (3), TS2305 missing export (2)          |
| `@dxos/plugin-projects`      |    48 |           6 |     4 |       3 | TS2322 prop/type mismatch (4), TS2739 missing required props (2)                                    |
| `@dxos/plugin-studio`        |    49 |          11 |     8 |      12 | TS2322 prop/type mismatch (8), TS2739 missing required props (2), TS2367 no-overlap comparison (1)  |
| `@dxos/plugin-sandbox`       |    49 |           4 |     2 |       3 | TS2322 prop/type mismatch (2), TS2604 no construct signature (1), TS2786 not a JSX component (1)    |
| `@dxos/plugin-crm`           |    49 |           1 |     1 |       0 | TS2322 prop/type mismatch (1)                                                                       |
| `@dxos/plugin-debug`         |    50 |          21 |     8 |      15 | TS2322 prop/type mismatch (15), TS2741 missing required prop (2), TS2344 type constraint (1)        |
| `@dxos/plugin-heygen`        |    50 |           3 |     1 |       1 | TS2322 prop/type mismatch (1), TS7006 implicit any param (1), TS2741 missing required prop (1)      |
| `@dxos/plugin-devtools`      |    51 |           0 |     0 |       3 |                                                                                                     |

#### Batch 4 Plugins (isolated)

| Package                  | Depth | Type errors | Files | Residue | Top error kinds                                                                                     |
| ------------------------ | ----: | ----------: | ----: | ------: | --------------------------------------------------------------------------------------------------- |
| `@dxos/plugin-deck`      |    36 |          41 |    14 |      19 | TS2322 prop/type mismatch (14), TS2305 missing export (11), TS2339 missing property/part (7)        |
| `@dxos/plugin-space`     |    38 |          55 |    23 |      41 | TS2322 prop/type mismatch (25), TS2739 missing required props (7), TS2741 missing required prop (7) |
| `@dxos/plugin-inbox`     |    45 |          46 |    15 |      25 | TS2322 prop/type mismatch (23), TS2305 missing export (12), TS2339 missing property/part (5)        |
| `@dxos/plugin-assistant` |    47 |          46 |    17 |      41 | TS2322 prop/type mismatch (26), TS2741 missing required prop (6), TS2739 missing required props (5) |

#### Batch 5 Apps

| Package               | Depth | Type errors | Files | Residue | Top error kinds                                                 |
| --------------------- | ----: | ----------: | ----: | ------: | --------------------------------------------------------------- |
| `@dxos/composer-crx`  |    33 |           3 |     2 |       1 | TS2322 prop/type mismatch (3)                                   |
| `@dxos/testbench-app` |    35 |           8 |     3 |       3 | TS2322 prop/type mismatch (7), TS2345 argument type (1)         |
| `@dxos/composer-app`  |    52 |           3 |     1 |       2 | TS2322 prop/type mismatch (2), TS2741 missing required prop (1) |

#### Type errors by kind

| Code   | Kind                          | Count |
| ------ | ----------------------------- | ----: |
| TS2322 | prop/type mismatch            |   581 |
| TS2741 | missing required prop         |   122 |
| TS2339 | missing property/part         |   103 |
| TS2305 | missing export                |    68 |
| TS7006 | implicit any param            |    66 |
| TS2739 | missing required props        |    44 |
| TS2304 | name not found                |    44 |
| TS2345 | argument type                 |    23 |
| TS2749 | value used as type            |    20 |
| TS2367 | no-overlap comparison         |    18 |
| TS2883 | unnameable inferred type      |    14 |
| TS2604 | no construct signature        |    13 |
| TS2786 | not a JSX component           |    13 |
| TS2344 | type constraint               |    10 |
| TS2352 | unsafe conversion             |     9 |
| TS2724 | missing export (did you mean) |     4 |
| TS2558 | type argument count           |     4 |
| TS7031 | implicit any binding          |     4 |
| TS2353 | unknown object prop           |     3 |
| TS7053 | implicit any index            |     3 |

### Most common causes

Grouped from the messages; several are one API change seen in many files and could become codemod rules.

| Cause                                                                                                           | Errors |
| --------------------------------------------------------------------------------------------------------------- | -----: |
| Listbox/List `Item` needs `item` data, Root needs `items` (`TS2741`)                                            |    108 |
| ScrollArea props gone: `thin` (36), `padding` (19), `centered` (15)                                             |     70 |
| `react-ui-mosaic` exports dropped by the `TS2883` cascade (`TS2305`)                                            |    ~60 |
| Select/Combobox value is `string[]`, `onValueChange` gets details (`string` → `string[]`, `ValueChangeDetails`) |    ~70 |
| `fullWidth` has no Next counterpart                                                                             |     52 |
| Unbound aliased names (`NaturalButton`, `TourCompoTour`; codemod defect 2)                                      |     44 |
| `asChild` on parts that no longer take it                                                                       |     28 |
| Popover/Menu `side` → Root `positioning`                                                                        |     21 |
| `Block end` (no `end` prop)                                                                                     |     21 |
| Numeric `size` left on Icon/Avatar-like parts (`number` → `Size`)                                               |    ~30 |
| Avatar `Label`/`Content`, Listbox `ItemContent`, `Portal`, `Viewport`, `VirtualTrigger` parts (`TS2339`)        |    ~60 |
| `iconClassNames`, `onOpenAutoFocus`, `image` (Card)                                                             |     27 |
