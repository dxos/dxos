# react-ui-form and react-ui-list on Next: audit and plan

Status and open questions: [§6 Decision points](#6-decision-points).

Next can already render every scalar form row, a nested field set, a dialog and a card. It cannot yet host
a form inside a real plank, open a correctly sized popup from a form without per-call-site props, pick a
reference object, or render a list row. Five gaps block the rewrite (see [Blocking gaps](#blocking-gaps)); the
[Plan](#5-plan) orders eleven PR-sized milestones so that each lands with stories, play tests and one pilot
plugin.

Scope: the 27 components under `components/` as of DESIGN.md follow-up 36 (Button absorbs IconButton; Toggle
replaces ToggleIconButton), the current primitives in `react-ui/src/components/`, `@dxos/react-ui-form`
(155 importing files) and `@dxos/react-ui-list` (97 importing files).

## Blocking gaps

1. **No sized, queryable host outside stories.** Every Next story wraps itself in `.nx-scope @container`. Plugin
   surfaces render inside the current `Panel`, which sets neither, so a Next form in a plank reads the `:root`
   defaults (md) and its rails never collapse (decision 5, Responsive).
2. **Popups do not inherit size.** Select, Combobox, Menu, Popover, Tooltip and Dialog take an explicit `size`
   (finding 9, follow-up 2). A form renderer does not know its row's size, so a `sm` settings form opens `md`
   listboxes unless every renderer threads `size` by hand.
3. **Combobox is input-only.** RefField, ObjectPicker and ComboboxField need a button trigger with the search
   input inside the popup, item descriptions, a "create" row, async results and a virtual trigger.
4. **No list primitives.** There is no Listbox (selectable rows), row layout, drag handle or drop indicator, so
   neither react-ui-list nor the form's ArrayField and SelectOptionField can move.
5. **`variant='settings'` is undecided.** 37 files use the bordered two-column settings layout, which conflicts
   with decision 13 (label above control).

## 1. Component parity

Verdicts: **parity** (drop-in for the form/list rewrite), **minor** (gaps a caller can work around or a small
follow-up closes), **major** (the rewrite is blocked on a missing part). Gaps that DESIGN.md chose on purpose
are listed under "Deliberate" and do not count toward the verdict.

### Layout and text

| Next         | Current counterpart(s)                                                                     | Missing in Next                                                                                                                                       | Next adds                                                                                                                                                                                        | Verdict | Deliberate                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Container`  | `Column.Root/Row/Section/Center`, `withColumn.center()`, `useInColumn()`, Card/Panel grids | a child column span (`Form.Layout` `span`)                                                                                                            | `size`, `level`, `columns`, `layout` stack/row, `place`, `gap` (rows only), real subgrid at any depth, pane collapse                                                                             | minor   | no `useInColumn` hook or context (3, 11); gaps owned by containers (6); `Column.Section label` composed as `Typography asChild` `<h2>` in an inheriting Container (39)                                                                      |
| `Block`      | `Column.Block`, `Card.Block`, `Field.Block`, `IconBlock`                                   |                                                                                                                                                       | `rail='start'\|'end'` at any depth                                                                                                                                                               | parity  | `square` is the only shape and `compact` would break rail alignment (39)                                                                                                                                                                    |
| `ScrollArea` | `ScrollArea.Root/Viewport`                                                                 |                                                                                                                                                       | `mode` overlay/reserve, `width`, subgrid frame, query container; `orientation`, `autoHide`, `snap`, `scrollbars` (39)                                                                            | parity  | `padding`/`centered` replaced by Container gutter (5)                                                                                                                                                                                       |
| `Typography` | Tailwind text classes, `Card.Text` (`truncate`, `variant='description'`)                   |                                                                                                                                                       | first-line centring in a block; `truncate`, `tone=description` (39)                                                                                                                              | parity  |                                                                                                                                                                                                                                             |
| `Group`      | `ButtonGroup`, `Dialog.ActionBar`, `Form.Actions` grid                                     |                                                                                                                                                       | no role, no track per child; `fill` (equal widths, a lone child stretches) (39)                                                                                                                  | parity  |                                                                                                                                                                                                                                             |
| `Card`       | `Card.*` (16 parts)                                                                        | `Html` (sanitised markup: deferred, the isolating `Html` of react-ui-components is the better home); `ActionIconButton` (the action binding, Phase 4) | `level=+1`, shared content edge, `Poster` as Image; `Section`, `Row` (icon, text, trailing), `Text`, `Action`, `Link`, `Menu`, `DragHandle`; root `border`, `selected`, clickable `onClick` (46) | minor   | `elevation` replaced by level (4); `fullWidth`: a card fills its track, width belongs to its host (6); `subgrid`: Body and Section always inherit; `Block` is `Next.Block`; the current row-button `Card.Action` is `Card.Row onClick` (46) |
| `Image`      | `Image`                                                                                    | dominant-colour sampling (`sampleSize`, `contrast`, `crossOrigin` fallback): deferred (47)                                                            | fixed `aspectRatio`, well while loading, broken-image fallback; `onClick` as a button (47)                                                                                                       | minor   |                                                                                                                                                                                                                                             |
| `Separator`  | `Separator`, `Toolbar.Separator`, `Menu.Separator`, `Select.Separator`                     |                                                                                                                                                       | `decorative`; control-tall vertical rule; one rule reused by Toolbar, Menu and Select                                                                                                            | parity  |                                                                                                                                                                                                                                             |
| `Icon`       | `Icon`                                                                                     | `synchronized`                                                                                                                                        | `label` gives `role=img`                                                                                                                                                                         | parity  | `size` prop replaced by CSS (2)                                                                                                                                                                                                             |

### Controls and fields

| Next            | Current counterpart(s)                                                    | Missing in Next                                                                                                                                   | Next adds                                                                                                                                                                                                                     | Verdict | Deliberate                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`        | `Button`, `IconButton`, `SystemIconButton.*`, `ButtonGroup`               |                                                                                                                                                   | block-cell `iconOnly`, valence adopted from the surface, `iconEnd`; `hue`, `caretDown`, `compact`, `tooltipSide` (40); `SystemButton.*` presets (51)                                                                          | minor   | `tag` variant moved to Tag (34), its colour kept as `hue` (40); `density`/`elevation` (2, 4); `iconClassNames` (no class escape hatch for icons, 6: colour comes from `hue` or valence) |
| `Toggle`        | `Toggle`, `ToggleIconButton`, `ToggleGroup`                               |                                                                                                                                                   | text toggles, `aria-pressed` from zag; `activeIcon` (40); `Next.ToggleGroup` single (`radiogroup`) / multiple, `Toolbar.ToggleGroup` (40)                                                                                     | parity  | the 90° rotation without `activeIcon`: a disclosure is `Collapsible` (15)                                                                                                               |
| `Label`         | `Field.Label`                                                             |                                                                                                                                                   | `srOnly` (39)                                                                                                                                                                                                                 | parity  |                                                                                                                                                                                         |
| `Field`         | `Field.Root/Label/HelperText/ErrorText/Block/TriggerIcon/PinInput`        |                                                                                                                                                   | `Field.Header` label row with trailing Blocks; `invalid` inherited from FieldSet; `validationValence` (all four tones) and `Label srOnly` (41); `asChild`, `required`, `readOnly` roots; every field type in one story (54)   | parity  | `Field.Block` needs no part: Checkbox/Switch occupy a block cell (19, 54); `TriggerIcon` is the DateInput trigger or a Button in an `end` slot (54)                                     |
| `FieldSet`      | `Fieldset.*`                                                              |                                                                                                                                                   | legend as an sm label row                                                                                                                                                                                                     | parity  |                                                                                                                                                                                         |
| `Input`         | `Field.Input`                                                             |                                                                                                                                                   | Field wiring from Ark; `start`/`end` adornments in a control row, `noAutoFill`, `variant=subdued` (41)                                                                                                                        | parity  | `density`/`elevation` (2, 4)                                                                                                                                                            |
| `Textarea`      | `Field.Textarea`                                                          |                                                                                                                                                   | `autoResize`, 3-row minimum; `variant=subdued` (54)                                                                                                                                                                           | parity  |                                                                                                                                                                                         |
| `Checkbox`      | `Field.Checkbox`                                                          |                                                                                                                                                   | block cell aligned with icon buttons                                                                                                                                                                                          | parity  | `size` (2)                                                                                                                                                                              |
| `Switch`        | `Field.Switch`                                                            |                                                                                                                                                   | `role=switch`                                                                                                                                                                                                                 | parity  |                                                                                                                                                                                         |
| `DateInput`     | `Field.Date/Time/DateTime` (segmented), `Field.TriggerIcon`, `DatePicker` |                                                                                                                                                   | zag `date-input` segments (locale order, typing, arrow steps), Ark `DatePicker` calendar (day/month/year views) behind the trailing trigger, `min`/`max`, `granularity`, `hourCycle`, `locale`, the native value strings (54) | parity  | native input dropped (54, supersedes 25); range/multiple selection not exposed (no current caller)                                                                                      |
| `PinInput`      | `Field.PinInput`                                                          |                                                                                                                                                   | Ark `pin-input`: `mask`, `otp`, `type`, `onValueComplete`; control-sized cells (54)                                                                                                                                           | parity  |                                                                                                                                                                                         |
| `NumberInput`   | `Field.Input type=number`                                                 |                                                                                                                                                   | Ark `number-input`: locale parsing/formatting, `step`, clamping, stepper buttons (54)                                                                                                                                         | parity  |                                                                                                                                                                                         |
| `PasswordInput` | `Field.Input type=password`                                               |                                                                                                                                                   | Ark `password-input`: visibility toggle, `ignorePasswordManagers` (54)                                                                                                                                                        | parity  |                                                                                                                                                                                         |
| `Select`        | `Select.*` (15 parts)                                                     |                                                                                                                                                   | option icons in item and trigger, `items` collection; `ItemGroup`/`ItemGroupLabel`, `Separator`, `iconHue`, Item children, `multiple`, Trigger `loading` (42); portal `container` (45)                                        | parity  | explicit `size` on Content (follow-up 2); number values: options stay strings and SelectField maps them back (2.14, 42)                                                                 |
| `Combobox`      | `react-ui-list` `Combobox.*` and `Picker.*`                               | button trigger with the input in the popup, `VirtualTrigger`, item `description`, a create row, async/loading, groups, `multiple`, `displayValue` | input-in-trigger, `filter`, `empty` row, autohighlight Enter; portal `container` (45)                                                                                                                                         | major   |                                                                                                                                                                                         |
| `Tag`           | `Tag`                                                                     | `asChild`                                                                                                                                         | pill sized to fit a control                                                                                                                                                                                                   | parity  |                                                                                                                                                                                         |

### Overlays and toolbars

| Next          | Current counterpart(s)                     | Missing in Next                                                                                                                   | Next adds                                                                                                                                                                                           | Verdict | Deliberate                                                                                                                                                                      |
| ------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Toolbar`     | `Toolbar.*` (13 parts)                     | `ActionIconButton`, `Menu` (the `useMenuActions` action-graph binding): deferred to Phase 4, with react-ui-menu on Next Menu      | zag roving machine; any Next control joins by hook; `Separator`, `ToggleGroup`, `Text`, `Link`, `DragHandle`, `loop`, `disabled` (38, 40, 43)                                                       | minor   | `elevation` (4)                                                                                                                                                                 |
| `Menu`        | `Menu.*` (20 parts), `@dxos/react-ui-menu` | the `@dxos/react-ui-menu` action-graph binding: Phase 4                                                                           | item `icon`/`shortcut`, popup focus ring; `ContextTrigger`, `CheckboxItem`, `RadioGroup`/`RadioItem`, `ItemIndicator`, `Sub`/`SubTrigger`, `arrow`, scrolling content (44); portal `container` (45) | minor   | explicit `size` (16); `VirtualTrigger` is `positioning.getAnchorRect` on Root (Ark has no such part, 44); `Viewport` is the content itself, capped at the available height (44) |
| `Popover`     | `Popover.*`                                |                                                                                                                                   | `Header`, `Title`, `Description`, arrow on by default; `Body` (scrolling), `modal`, portal `container`, title/description naming that survives lazy mounting (45)                                   | parity  | explicit `size` (26); `VirtualTrigger` is `positioning.getAnchorRect` or an `Anchor` (Ark has no such part, 45)                                                                 |
| `Tooltip`     | `Tooltip.Provider/Trigger`, `TextTooltip`  |                                                                                                                                   | delay handling fixed for focus swap and click, a press suppressing it only until the next focus or hover (48); `Trigger content`/`side` shorthand, `Next.TextTooltip`, portal `container` (45)      | parity  | no Provider: zag store is global (17)                                                                                                                                           |
| `Dialog`      | `Dialog.*`, `AlertDialog.*`                | `Overlay blockAlign` (top-aligned dialogs): deferred until a pilot needs one; `ActionIconButton`: Phase 4 with the action binding | Body as a gutter Container in a ScrollArea; `Next.AlertDialog` (Cancel, Action), `DIALOG_AUTOFOCUS_ATTRIBUTE`, portal `container` (45)                                                              | minor   | explicit `size`; `elevation` (10)                                                                                                                                               |
| `Collapsible` | `Collapsible.*` (headless)                 |                                                                                                                                   | caret trigger row, height animation                                                                                                                                                                 | parity  |                                                                                                                                                                                 |

### Needed by form or list but absent from Next

| Missing                                                                    | Used by                                          | Candidate                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `Panel` (plank host: sized scope, query container, toolbar/content/footer) | every plugin container                           | Next.Panel as a template root                                               |
| `Listbox`                                                                  | Listbox (112 roots), MasterDetail, Combobox list | Ark `listbox` (zag listbox machine)                                         |
| List row layout (icon, title, description, trailing actions)               | `Listbox.ItemContent`, `useListGrid`, Tree rows  | `Container layout='row'` with `columns`                                     |
| `DragHandle`, `DropIndicator`                                              | OrderedList, Tree, ArrayField                    | Button `iconOnly` ghost; CSS on `--nx-*`                                    |
| `Tree` / `TreeView`                                                        | plugin-navtree, react-ui-form ObjectTree         | Ark `tree-view`, or the current model on Next rows                          |
| `Banner`                                                                   | ViewEditor                                       | valence surface (follow-up 34 already adopts it)                            |
| `TagsInput`                                                                | string arrays                                    | Ark `tags-input` (`PasswordInput`, `NumberInput` done, 54)                  |
| `HuePicker`, `IconPicker` on Next Popover                                  | HueField, SelectOptionField, ObjectForm          | `react-ui-pickers` restyle                                                  |
| A control frame for third-party editors                                    | MarkdownField, RefEditor                         | `.nx-input-row` (Input, DateInput, NumberInput, PasswordInput share it, 54) |

## 2. Shortcomings of the Next model

Each entry states what gets harder than in current react-ui, the impact on the two rewrites, and a mitigation.

### 2.1 The sized scope must be created by someone

Sizes, levels and the responsive collapse are all CSS inherited from an ancestor. Current primitives fall back
to a React context default, so a control anywhere is sized. A Next part outside any `.nx-scope` or Container
takes `:root` (md), and a Container that is not inside a query container never collapses its rails.

- **Impact.** High. Every plugin container is a `Panel`; none is a Next scope.
- **Mitigation.** Add a Next pane host (Next.Panel, or `Panel.Root` setting `container-type: inline-size` and
  `data-size`) before the first pilot. A dev warning when a Next Container finds no `.nx-scope` ancestor.

### 2.2 Portal size propagation

Portalled content leaves the sized scope, so each popup takes `size` (finding 9). Decision 3 rules out context,
decision 11 rules out measurement.

- **Impact.** High for forms. SelectField, ComboboxField, RefField, HueField and every `createSelectField`
  renderer open popups. Missing a `size` is silent: the popup renders md.
- **Mitigation.** Two options, to spike in milestone 1.
  1. Portal into the nearest sized ancestor instead of `body` (Ark `Portal container`), so the popup inherits
     `data-size` and level through CSS. Risk: clipping by `overflow` or a transformed ancestor.
  2. The form layer reads `size` from `Form.Root` (form context already exists and carries data, not a
     primitive's size) and passes it to every popup it renders. Custom renderers get `size` in
     `FormFieldRendererProps`.

### 2.3 Consumers rely on density and elevation contexts

Plugins use `DensityProvider` (10 files), `ElevationProvider` (12), `density=` (27) and `useDensityContext` (3).
Next has neither context; size and level are attributes.

- **Impact.** Medium. Each provider becomes a `data-size`/`level` on the nearest Container; a JS reader of
  density (`useDensityContext`) has no equivalent.
- **Mitigation.** A mapping table (`coarse`→`md`, `fine`→`sm`) in the migration notes, and replace JS readers
  with CSS rules during each pilot.

### 2.4 Nested panes, planks and container queries

A template root cannot query its own width, and an inheriting Container must never be a query container
(finding 2). The collapse threshold (`width < 24rem`) is fixed in `container.css`.

- **Impact.** Medium. A settings form in a narrow companion plank collapses correctly only if the plank is the
  query container. A Card holding a form inside a plank starts a fresh template, so its fields do not align
  with the plank's rails.
- **Mitigation.** The pane host of 2.1 is the query container. Document that a Card body in a form uses
  `gutter='inherit'` when it must align, and add a story with a form inside a Card inside a pane.

### 2.5 Virtualization

The Tree windows its rows by translating a window element and measuring each mounted row (`row-window.ts`,
nominal 40px). Next knows the row height only as `--nx-block-size` in CSS.

- **Impact.** High for Tree, low for forms. Subgrid alignment across windowed rows needs the sizer and the
  window to be subgrids too, and a row's nominal extent must match the block size of its scope.
- **Mitigation.** Read `--nx-block-size` once per scope with `getComputedStyle` (a one-off read, like the
  overlay thumbs' exception to decision 11) to seed the nominal extent. Virtualized rows use their own fixed
  template rather than subgrid (fixed tracks align across subtrees, decision 5).

### 2.6 Drag and drop

OrderedList and Tree use pragmatic-drag-and-drop: absolute drop indicators and an optional portalled
`dragPreview`.

- **Impact.** Medium. A portalled preview loses size and level like any popup (2.2). Drag handles must not
  join a Toolbar's roving focus by accident. Synthetic drags cannot be automated (repo memory), so play tests
  cannot cover a drop.
- **Mitigation.** The preview copies `data-size` and `data-surface` from the source row's closest ancestors
  (an attribute read, not layout). Drop indicators are CSS on `--nx-*` variables. Tests assert
  `[draggable]` and the reorder callback, and a manual story covers the drop.

### 2.7 Deep subgrids and `:has`

The benchmark (1,000 flat rows, ~110ms) does not cover depth. A schema form nests FieldSet, Collapsible, an
array of structs and inline refs: four or five inheriting Containers deep.

- **Impact.** Unknown. Typing in an input must not trigger layout of the whole form; style queries resolve
  `level='+1'` on every element.
- **Mitigation.** Extend the benchmark with a depth-5 form of 500 fields; record style-recalc and layout time
  on a keystroke in milestone 1, and fail the story above a budget.

### 2.8 Browser differences

Style queries are Baseline only since Firefox 151 (May 2026) and Safari 18. `DateInput` is segmented in every
browser (54). Composer also ships in WebKit shells (plugin-native).

- **Impact.** Medium. On an older WebKit `level='+1'` resolves to nothing, so a Card paints on its host's
  surface.
- **Mitigation.** A fallback rung for `+1` (raised) outside `@container style()`. Run the Next play tests in
  Firefox and WebKit through Playwright in CI, not only Chromium.

### 2.9 Theming third-party widgets

CodeMirror (MarkdownField, RefEditor), `HuePicker`, `DxAnchor` (Lit) and `QueryForm` size themselves from
`--dx-control` and density.

- **Impact.** Medium. These controls stay at the current control height inside a Next row, so they misalign
  by the control inset.
- **Mitigation.** Inside `.nx-scope`, define the `--dx-control*` variables from `--nx-control-size` and
  friends, and give editors a Next control frame (the DateInput row, generalised).

### 2.10 No i18n in Next

Next hard-codes English defaults (`'Close'` in Dialog and Popover `CloseTrigger`, `'No results'` in Combobox).
react-ui-form has 68 translation keys.

- **Impact.** Low. The form layer already translates.
- **Mitigation.** Drop the English defaults and make those labels required; the form passes `t(...)`.

### 2.11 The parallel namespace invites mixing

Plugins write 161 `Form.Field` rows by hand, with current `@dxos/react-ui` controls as children. A current
control inside a Next row renders, but at the wrong height and with the wrong focus ring.

- **Impact.** High during migration; the failure is visual and silent.
- **Mitigation.** An oxlint `no-restricted-imports` rule for files that import `@dxos/react-ui-form/next`,
  and a dev-only warning when a `.dx-*` control renders inside `.nx-field`. A plugin migrates one container
  at a time, with all of that container's renderers.

### 2.12 Ark and zag behaviour

Each Ark component so far brought a quirk: the tooltip focus swap (20), toolbar item ids (31), a modal dialog's
one-time `aria-hidden` sweep (10), `CloseTrigger` renaming its child (26).

- **Impact.** Medium. Listbox, TreeView and TagsInput are still to come.
- **Mitigation.** Budget a play test per interaction contract, not only per render; keep zag on one catalog
  version.

### 2.13 Testing ergonomics

Next geometry lives in CSS: container queries, subgrid and style queries do not run in happy-dom or jsdom.

- **Impact.** Medium. react-ui-form's vitest suites (FormFields, ObjectProperties, ViewEditor, FieldEditor) test
  behaviour in node; geometry needs the storybook browser runner, which is slower.
- **Mitigation.** Keep logic tests in node and share them between both entries (`resolveFieldRenderer`,
  `useFormHandler`, layout parser). Put geometry and roles in play tests using `testing.ts` helpers.

### 2.14 String-only values

Next Select and Combobox options are `{ value: string }`. Schema literal unions are `string | number`
(`Format.Options`).

- **Impact.** Low.
- **Mitigation.** SelectField keeps a value map from `String(option)` back to the literal.

## 3. react-ui-form rewrite

### 3.1 Inventory

**Form parts.**

| Part                            | Today                                                                               | Next mapping                                                                                                             | Missing                                          |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `Form.Root`                     | `FormContextProvider` + `useFormHandler`                                            | unchanged (logic)                                                                                                        | `size` for popups (2.2)                          |
| `Form.Viewport`                 | `Column.Root gutter`, optional `ScrollArea`, `useInColumn` branch                   | `ScrollArea.Root > Viewport asChild > Container gutter='rail'` (scroll) or `Container gutter='inherit'` (in a host)      | none                                             |
| `Form.Content`                  | `div role=form` + `withColumn.center()` + `pb-form-padding`                         | `Container gutter='inherit' role='form'`                                                                                 | bottom padding owned by the container            |
| `Form.FieldSet`                 | `Fieldset` + `Collapsible` + `Tooltip` + `MarkdownView`; depth/appearance recipe    | `FieldSet.Root/Legend/HelperText` + `Collapsible`; nested depth = `Container gutter='inherit' level='+1'`                | a bordered group body; section heading size      |
| `Form.Fields`                   | schema walk                                                                         | unchanged (logic)                                                                                                        |                                                  |
| `Form.Layout`                   | DSL → `div grid` with `repeat(n, 1fr)` and inline `gridColumn: span`                | `Container layout='row' columns='repeat(n, minmax(0,1fr))'`                                                              | child span (`place` takes only content/full)     |
| `Form.Label` / `FormFieldLabel` | 4-column label grid, error icon + Tooltip, `labelEnd`, `button`, `::after` asterisk | `Field.Header` + `Field.Label`; error as a trailing `Block` with `Icon` + `Tooltip`; asterisk from Ark's `data-required` | required marker rule                             |
| `Form.Field` / `FormFieldRow`   | `Field.Root validationValence` + recipe slots                                       | `Field.Root invalid required readOnly` + Header + control + `HelperText` + `ErrorText`                                   | `success`/`warning` valence (unused by the form) |
| `FormFieldHeader`               | label + add `CompactIconButton` + actions                                           | `Field.Header` with `Button iconOnly variant='ghost'`                                                                    |                                                  |
| `CompactIconButton`             | `Field.Block > IconButton density=sm size=3`                                        | `Button iconOnly variant='ghost'` (block cell, follow-up 19)                                                             |                                                  |
| `Form.Actions`                  | `div grid auto-cols-fr` + two IconButtons                                           | `Group justify='end'` + `Button icon label` + `Button variant='primary'`                                                 | initial focus on Cancel inside a Dialog          |
| `Form.Submit`                   | full-width primary IconButton                                                       | `Group` stretch + `Button variant='primary'`                                                                             | Group stretch                                    |
| `Form.ErrorText`                | `Field.Root validationValence='error'` + `ErrorText`                                | `Field.Root invalid` + `Field.ErrorText`                                                                                 |                                                  |
| `FormStaticValue`               | `p.truncate`                                                                        | `Typography`                                                                                                             | `truncate`                                       |
| `FormFieldErrorBoundary`        | bordered `div`                                                                      | `Tag hue='error'` + `Typography`                                                                                         |                                                  |

**Field renderers.**

| Renderer                     | Today                                                                      | Next mapping                                                    | Missing                                      |
| ---------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `TextField`                  | `Field.Input`                                                              | `Input`                                                         |                                              |
| `PasswordField`              | `Field.Input type=password noAutoFill`                                     | `PasswordInput ignorePasswordManagers`                          |                                              |
| `NumberField`                | `Field.Input` + numeric constraints                                        | `NumberInput min max step`                                      |                                              |
| `TextAreaField`              | `Field.Textarea`                                                           | `Textarea autoResize`                                           |                                              |
| `DateField`                  | `Field.Date/Time/DateTime` + `TriggerIcon`                                 | `DateInput type` (segmented, with calendar, 54)                 |                                              |
| `BooleanField`               | `Field.Block > Field.Switch`, `labelPlacement='beside'`                    | `Switch label`                                                  |                                              |
| `TupleField` (standalone)    | several `Field.Input`                                                      | `Container layout='row' columns` of `Input`                     |                                              |
| `GeoPointField` (standalone) | two `Field.Root` in cells                                                  | `Container layout='row' columns='1fr 1fr'`, a `Field.Root` each |                                              |
| `SelectField`                | `Select.TriggerButton` + `Option` + hue icon                               | `Select.Root/Trigger/Content/Item` with `icon`                  | icon hue; number values (2.14)               |
| `AsyncSelectField`           | SelectField + lookup                                                       | same                                                            | loading state                                |
| `AutofillField`              | TextField                                                                  | `Input`                                                         |                                              |
| `ComboboxField`              | list `Combobox` (button trigger, input in popup, free-text item)           | `Combobox`                                                      | trigger mode, create row                     |
| `HueField`                   | `HuePicker`                                                                | `HuePicker` on Next Popover                                     | pickers restyle                              |
| `MarkdownField`              | CodeMirror `Editor.View classNames='dx-input'`                             | Editor in a Next control frame                                  | control frame (2.9)                          |
| `RefField`                   | `ObjectPicker` (list Combobox + Popover + inline create Form) + `DxAnchor` | `Combobox` trigger mode + `Popover` holding a nested Form       | trigger mode, description, create row, async |
| `InlineRefField`             | `FormFieldSet collapsible` + nested `FormRoot`                             | `FieldSet` + `Collapsible` + nested Form                        |                                              |
| `ArrayField`                 | `OrderedList` + `DragHandle` + `CompactIconButton`                         | `react-ui-list/next` OrderedList + `Button iconOnly`            | OrderedList next                             |
| `SelectOptionField`          | `OrderedList` + `Tag` + `ToggleIconButton` + `HuePicker` + `IconButton`    | OrderedList next + `Tag` + `Toggle` + `HuePicker`               | OrderedList next; pickers                    |

**Higher-level components.** `ObjectProperties` (39 uses), `ObjectForm` (8), `ViewEditor` (18), `FieldEditor`,
`RefEditor`, `ObjectPicker` and `ObjectTree` compose the parts above. ViewEditor also needs `Banner` and
`QueryForm`; ObjectTree needs a Next tree row; RefEditor is CodeMirror and needs only the control frame.

### 3.2 Extension points

`react-ui-form/next` keeps every contract below unchanged in type, so a plugin migrates by changing imports and
the controls inside its renderers. Logic (hooks, types, annotations, `resolveFieldRenderer`, the layout parser)
stays in the package root and both entries import it; `next` adds only view components.

| Extension point                                   | Uses     | Contract today                                                    | In `react-ui-form/next`                                                                              |
| ------------------------------------------------- | -------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fieldMap`                                        | 45       | `Record<jsonPath, FormFieldRenderer>`; the renderer owns its row  | same type; a renderer builds its row with next `Form.Field` or `FormFieldRow`                        |
| `FormFieldRenderer` statics                       | 6        | `standalone`, `labelPlacement`                                    | same; `beside` maps to a Checkbox/Switch `label`                                                     |
| `FormFieldRendererProps`                          | 33       | value accessors, label, `presentation`, `db`                      | same, plus optional `size` (2.2)                                                                     |
| `fieldProvider`                                   | 9        | returns an element or `undefined`                                 | same                                                                                                 |
| `createSelectField`                               | 7        | factory over fixed options with a sentinel                        | same signature, built on `Next.Select`                                                               |
| `FormFieldRow`                                    | 9        | the row for a renderer                                            | same props, rendered as `Field.Root` + `Field.Header`                                                |
| `useFormField`, `useFormValues`, `useFormHandler` | 9        | hooks                                                             | imported from the root entry                                                                         |
| `variant='settings'`                              | 37 files | bordered two-column row with description                          | decision needed (below)                                                                              |
| `layout` (`FormPresentation`)                     | many     | `full`/`compact`/`inline`/`static` via `presentationFor`          | same resolver: header shown unless `inline`; `ErrorText` only in `full`; `static` renders Typography |
| `Form.Layout` template                            | 6        | grid DSL in a schema annotation                                   | same DSL; needs Container child span                                                                 |
| Test ids                                          | e2e      | `save-button`, `cancel-button`, `form.error`, `testId` on Content | unchanged                                                                                            |

**Settings layout decision.** Three options:

1. **Two-track rows.** `Form.Content` sets `columns='[label-start] minmax(0,1fr) [control-start] minmax(0,1fr)'`
   and each row is an inheriting Container (subgrid) with the header and description in the first track and
   the control in the second; the pane collapse stacks them. Bordered rows become `level='+1'` Containers.
   Recommended: it reuses decision 5 and keeps labels aligned across a section.
2. **Label-above cards.** Each settings row is a `Card` with the label above the control. Simple, but loses the
   two-column scan that settings pages rely on.
3. **Drop the variant.** Settings forms use the default layout with descriptions shown. Least work, visible
   change to 37 screens.

### 3.3 Target structure

```
packages/ui/react-ui-form/src/next/
  index.ts                 Form namespace, FormFieldRow, createSelectField, field renderers
  Form.tsx                 Root (shared handler), Viewport, Content, Actions, Submit, ErrorText
  FormFieldSet.tsx         FieldSet.Root + Legend + Collapsible
  FormField.tsx            Form.Field, FormFieldRow, FormFieldLabel as Field.Header
  FormFieldDispatch.tsx    resolution from the root entry; renders next controls
  FormLayout.tsx           DSL on Container columns
  fields/                  one file per renderer (3.1)
  *.stories.tsx            one per part and per renderer, with play tests
```

A rendered row, for reference:

```tsx
<Next.Field.Root invalid={!!error} required={required} readOnly={readonly}>
  <Next.Field.Header>
    <Next.Field.Label>{label}</Next.Field.Label>
    {error && <ErrorBlock error={error} />}
  </Next.Field.Header>
  <Next.Input value={value} onChange={handleChange} onBlur={onBlur} />
  <Next.Field.ErrorText>{error}</Next.Field.ErrorText>
</Next.Field.Root>
```

Rules for the package:

- **No `className` or `classNames`** under `src/next/`, and no `tv` recipe. When a layout needs one, the
  missing piece goes into a Next primitive. A test greps the folder and fails on either.
- **No wrapper `div`s.** Layout is Container, Field, FieldSet, Group; text is Typography.
- **No React context for size or level.** The form context carries data and `size` for popups only.

### 3.4 Next components to add first

In order of what they unblock:

1. **Pane host** (2.1): Next.Panel or `Panel.Root` as a sized query container. Blocks every pilot.
2. **Popup size strategy** (2.2): portal container or a `size` prop threaded by the form.
3. **Container child span** for `Form.Layout`, and **Group stretch / equal widths** for `Form.Submit` and
   `Form.Actions`.
4. **Field required marker** on `[data-required]` and a `Typography` `truncate` and description tone.
5. **Select** groups, separator, item hue; a loading state for async options.
6. **Combobox trigger mode** (button trigger, input in the popup), item `description`, a create row, async
   results, `VirtualTrigger`.
7. **Control frame** generalised from DateInput, for adornments, password visibility and editors.
8. **OrderedList next** (4.1), for ArrayField and SelectOptionField.
9. **Banner** and **Separator**, for ViewEditor.
10. **Pickers** (`HuePicker`, `IconPicker`) on Next Popover.

## 4. react-ui-list rewrite

### 4.1 Inventory

| Component                            | Plugin uses                                 | Parts and props                                                                                                                                                                                                 | Today built on                                                   | Next mapping                                                                                                                | Missing                                                        |
| ------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Listbox`                            | 112 roots                                   | `Root` (`value`, `onValueChange`, `onDeselect`, `multiselectable`), `Viewport`, `Content`, `Item` (`id`, `selected`, `disabled`), `ItemLabel`, `ItemContent`, `Indicator`; `role=list` when unselectable        | `react-focus` navigation, `ScrollArea`, `dx-hover`/`dx-selected` | Ark `listbox` for selectable lists; plain `Container` stack for `role=list`; `Viewport` = composed ScrollArea               | Next.Listbox, row part, selected/current styling               |
| `ItemContent`                        | 13                                          | icon track, title, description                                                                                                                                                                                  | grid with `--dx-rail-item`                                       | `Container layout='row' columns='auto minmax(0,1fr) auto'` with a `Block` icon and `Typography`                             | description tone                                               |
| `OrderedList`                        | 16 roots                                    | `Root` (`items`, `getId`, `onMove`, `dragPreview`, `readonly`, `navigationMode`, `expandedId`), `Viewport`, `Content`, `Item`, `DetailItem`, `DragHandle`, `Title`, `IconButton`, `DeleteButton`, `ExpandCaret` | pragmatic-dnd (`useReorder`), `useListDisclosure`, `useListGrid` | rows as `Container layout='row'` (the `useListGrid` template becomes `columns`); `ExpandCaret`/`DetailItem` = `Collapsible` | DragHandle, DropIndicator, drag preview sizing (2.6)           |
| `Combobox`                           | 13 roots                                    | `Root` (`open`, `value`, `displayValue`), `Portal`, `Content` (`resetSelectionOnChange`), `Trigger`, `VirtualTrigger`, `Input`, `List`, `Item`, `Empty`                                                         | react-ui `Popover` + `Picker`                                    | `Next.Combobox` in trigger mode                                                                                             | as 3.4 item 6                                                  |
| `Picker`                             | 3 roots                                     | `Root`, `Input`, `Item`                                                                                                                                                                                         | own keyboard model                                               | retired into Next.Combobox                                                                                                  |                                                                |
| `MasterDetail`                       | 3                                           | `items`, `getLabel`/`getIcon`/`getAdornment`/`getMenu` atoms, `orientation`, `detail`                                                                                                                           | OrderedList + `IconBlock` + `Tooltip` + `ActionMenu`             | Listbox next + `Menu`                                                                                                       | react-ui-menu on Next Menu                                     |
| `Tree`                               | 32 (plugin-navtree, sdk/shell)              | `model: TreeModel` (atoms), `renderColumns`/`renderIcon`/`renderHeading`, `gridTemplateColumns`, `density`, `toggle`, `draggable`, `canDrop`, `getDropKind`, `selectionMode`, `virtualize`, `indentGuides`      | pragmatic-dnd hitbox, `react-ui-virtual`, `TextTooltip`          | spike: Ark `tree-view` against the current model on Next rows                                                               | Next tree row, indent token, TextTooltip, virtual sizing (2.5) |
| `DropIndicator`, `TreeDropIndicator` | 2                                           | line/box indicators                                                                                                                                                                                             | `--dx-*` variables                                               | CSS on `--nx-*`                                                                                                             |                                                                |
| Hooks                                | `useListSelection` 4, `useListDisclosure` 2 | selection, navigation, disclosure, grid template, reorder                                                                                                                                                       | framework-neutral logic + `react-focus`                          | keep selection, disclosure and reorder; navigation moves to zag; `useListGrid` becomes `columns`                            |                                                                |

### 4.2 Extension points plugins use

- **Arbitrary row children.** `Listbox.Item` and `OrderedList.Item` take any content. Next keeps that, but a
  row's children must be Next parts so they align with the row's tracks (2.11).
- **Render props.** `OrderedList.Root` children `({ items }) => …`; Tree `renderColumns`, `renderIcon`,
  `renderHeading`. Kept unchanged.
- **Drop policy.** Tree `canDrop` and `getDropKind` (`reject`, `link`, move). Kept unchanged; only the indicator
  is restyled.
- **Tree model.** `TreeModel` atoms (`item`, `itemOpen`, `itemCurrent`, `itemProps`, `childIds`) and
  `createStaticTreeModel`. Kept unchanged; the model is framework-neutral already.
- **Selection hooks.** `useListSelection` stays exported from the root entry; it does not depend on the
  primitives.

### 4.3 Target structure

`packages/ui/react-ui-list/src/next/` with `Listbox`, `OrderedList`, `MasterDetail` and `Tree`, exported as
`@dxos/react-ui-list/next`. Hooks, the tree model and `util/path` stay in the root and are imported from there.
The same three rules as 3.3 apply: no classNames, no wrapper `div`s, no context for size or level.

## 5. Plan

Two tracks. The list track goes first because the form's ArrayField, SelectOptionField and RefField depend on
it. Each milestone is one PR on the current branch's line of work.

Every milestone's definition of done includes:

- **Stories and play tests.** A story per new part with geometry (per-size alignment) and ARIA assertions, and
  the relevant old story ported with the same args.
- **Parity check.** A table in the PR comparing the old and new stories' props and behaviours, with before and
  after screenshots in `temp/`.
- **Tests green.** `moon run react-ui:test` (and the package's own suite) and the storybook runner.
- **DESIGN.md.** A follow-up entry for every decision made.

### Milestones

| #   | Milestone                     | Scope                                                                                                                                                                                                                                                                                  | Depends on  | Pilot and done when                                                                                                                       |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Foundations (react-ui/next)   | pane host (2.1); popup size spike and decision (2.2); Container child span; Group stretch; Field required marker; Typography `truncate`; depth-5 form benchmark (2.7); `+1` fallback (2.8)                                                                                             |             | a Next form renders inside a real plank story at `sm` with collapsing rails and `sm` popups                                               |
| 2   | Next.Listbox                  | Ark listbox, single and multiple; row pattern (icon Block, Typography, trailing Buttons); selected/current styles                                                                                                                                                                      | 1           | Listbox stories with keyboard, typeahead and `aria-selected` play tests                                                                   |
| 3   | `react-ui-list/next` scaffold | `./next` subpath and vite entry; `Listbox` and `ItemContent`; lint rule of 2.11                                                                                                                                                                                                        | 2           | plugin-registry `PluginList` migrated; no current controls left in it                                                                     |
| 4   | OrderedList next              | rows on `Container layout='row'`; DragHandle; DropIndicator; disclosure via Collapsible; drag preview sizing                                                                                                                                                                           | 3           | plugin-sheet `RangeList` migrated; reorder callback asserted; manual drop story                                                           |
| 5   | Combobox trigger mode         | button trigger, input in the popup, `description`, create row, async results, `VirtualTrigger` (react-ui/next); list `Combobox` and `Picker` retired in `/next`                                                                                                                        | 1           | Combobox stories for each mode; ObjectPicker story rebuilt on it                                                                          |
| 6   | `react-ui-form/next` core     | Root, Viewport, Content, FieldSet, Fields, Field, `FormFieldRow`, Actions, Submit, ErrorText; scalar renderers (Text, Password, Number, TextArea, Boolean, Date, Tuple, GeoPoint, Select, AsyncSelect, Autofill); `fieldMap`, `fieldProvider`, `createSelectField`; shared logic tests | 1           | plugin-thread `ChannelCreatePanel` migrated; Form stories ported; the no-className test passes                                            |
| 7   | Settings layout               | the chosen option of 3.2; description visible; bordered rows                                                                                                                                                                                                                           | 6, decision | plugin-pwa and plugin-excalidraw settings migrated, then plugin-settings `DefaultSettings`                                                |
| 8   | Arrays and layout templates   | ArrayField, SelectOptionField (Tag, Toggle, pickers on Next Popover), `Form.Layout` DSL                                                                                                                                                                                                | 4, 6        | FormLayout and ArrayField stories ported; the column list of plugin-pipeline `PipelineProperties` migrated (its ViewEditor follows in 10) |
| 9   | Ref and lookup fields         | RefField, InlineRefField, ComboboxField, ObjectPicker with inline create                                                                                                                                                                                                               | 5, 6        | plugin-space migrated (custom renderers, refs and settings: the heavy pilot)                                                              |
| 10  | Higher-level form components  | ObjectProperties, ObjectForm, ViewEditor (Banner), FieldEditor; MarkdownField and RefEditor in a control frame                                                                                                                                                                         | 7, 8, 9     | ObjectProperties and ViewEditor suites pass against `/next`; plugin-map `MapViewEditor` migrated                                          |
| 11  | Tree next                     | spike Ark `tree-view` against the current model on Next rows; virtualization (2.5); DnD indicators; TextTooltip; then MasterDetail on Menu                                                                                                                                             | 3, 4        | plugin-navtree migrated behind a story with 5,000 nodes, keyboard and drop-kind play tests                                                |

After milestone 11, the remaining consumers move package by package, the old implementations are deleted, and
`next` becomes each package's root entry in the same change (no re-export shims).

### Migrating custom renderers

The renderer contract does not change, so a renderer migrates in three steps:

1. Import `Form`, `FormFieldRow` and `createSelectField` from `@dxos/react-ui-form/next`; keep hooks and types
   from the root entry.
2. Replace the controls inside the row with `Next.*` parts, and delete any `className` it needed for layout.
3. Pass `size` to any popup the renderer opens (until 2.2 is settled).

A plugin moves a container and all of the renderers in its `fieldMap` together, since a renderer built on
current controls misaligns inside a next form and nothing in the type system catches it. The pilots cover
each renderer shape: plugin-space (`fieldMap` rows and refs), plugin-higgsfield and plugin-studio (the most
renderers: 6 and 5 files), and plugin-assistant (`createSelectField`).

## 6. Decision points

What is settled, what is deferred, and what still needs an answer before react-ui-list and react-ui-form can
reach parity. Numbered once across the section so a reply can cite a number.

### Settled

| Topic                   | Decision                                                                                                   | Where                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Pane host (gap 1)       | `Next.Panel` (`Root`, `Toolbar`, `Content`, `Statusbar`) sets `data-size`/level and is the query container | DESIGN.md Phase 4 decision 1 |
| Popup size (gap 2)      | a popup copies `data-size` from its trigger's nearest sized ancestor on open; `size` still wins            | Phase 4 decision 2           |
| List primitives (gap 4) | `Next.Listbox` on Ark listbox; `DragHandle`, `DropIndicator`, `DragPreview` with keyboard moves            | Phase 4 decision 5           |
| Drag and drop           | stays on pragmatic-drag-and-drop; plugins keep `onMove`, `canDrop`, `getDropKind`                          | Phase 4 decision 5           |
| i18n (2.10)             | Next parts translate their default labels through `@dxos/react-ui` translations                            | follow-ups 51, 54            |

### Deferred, with a recommendation

1. **Settings layout (gap 5, milestone 7).** Options in §3.2: (1) two-track subgrid rows, (2) label-above
   cards, (3) drop the variant. Recommendation: 1. The react-ui piece is letting `Field.Root` join a parent's
   `columns` as a subgrid row; decide when milestone 6 lands, so a real settings form can be tried in both shapes.
2. **Tree (milestone 11).** Options: (1) Ark `tree-view` driven by `TreeModel` atoms, (2) keep the current Tree
   logic and restyle its rows on Container, (3) a Listbox with indentation. Recommendation: spike 1 against a
   5,000-node story; fall back to 2 if lazy children or virtualization fight zag's collection model.

### Open

3. **Virtualization (2.5).** Listbox and OrderedList rows are Container subgrid rows; `react-ui-virtual`
   positions rows absolutely, which drops them out of the grid. Options: (1) virtualize only flat lists and give
   rows fixed `columns` instead of subgrid, (2) `content-visibility: auto` on rows and no virtualizer, (3) keep
   the current list for large collections. Recommendation: 2 for lists under a few thousand rows, 1 for Tree.
4. **Selection state ownership.** Ark's listbox owns selection and focus; `useListSelection` (4 users) owns it
   today. Options: (1) Listbox controlled through `value`/`onValueChange` and `useListSelection` becomes a
   thin adapter, (2) retire `useListSelection`. Recommendation: 1 until the four callers migrate.
5. **Unselectable lists.** `role=list` rows (OrderedList, plain lists) have no Ark machine. Options:
   (1) `OrderedList` on a plain Container stack with roving focus from Toolbar's pattern, (2) Ark listbox with
   `selectionMode='none'`. Recommendation: 2, so keyboard navigation and typeahead come from one machine.
6. **Row template.** `useListGrid` builds a grid template per list; Next rows take Container `columns`.
   Options: (1) the Root takes `columns` and rows inherit as subgrid, (2) each row sets its own. Recommendation:
   1, so drag handles, titles and trailing buttons align across rows.
7. **Container child span (§3.4 item 3).** `Form.Layout` needs a child to span tracks. Options: (1) a `span`
   prop on Container, (2) a `Container.Cell` part. Recommendation: 1; still unimplemented.
8. **Required marker (§3.4 item 4).** `Field.Root required` sets the attribute but draws no marker. Options:
   (1) CSS on `[data-required]` in the label, (2) a `Field.Label required` prop. Recommendation: 1.
9. **Combobox trigger mode (gap 3, milestone 5).** Extend `Next.Combobox` with a button trigger and the input
   inside the popup, or add a separate `Next.Picker`. Recommendation: extend Combobox (one machine, one set of
   item parts); retire the list package's `Combobox` and `Picker` in `/next`.
10. **Control frame (§3.4 item 7).** DateInput's frame (adornments inside a bordered control) generalised for
    PasswordInput, MarkdownField and RefEditor. Options: (1) `Next.ControlFrame` part, (2) Input `start`/`end`
    slots only. Recommendation: 1, since editors are not inputs.
11. **Mixing guard (2.11).** A lint rule forbidding current `@dxos/react-ui` controls inside `/next` files.
    Options: (1) oxlint `no-restricted-imports` per `src/next/**`, (2) the no-className test extended to imports.
    Recommendation: 1.
12. **Boot budget.** The Composer boot graph is at 4.52 of 4.55 MB. Next code and `next/theme.css` must load only
    from lazy plugin modules. Options: (1) each pilot imports the CSS in its lazy surface module, (2) raise the
    budget once Next replaces the current components. Recommendation: 1 until the old implementations are
    deleted.
13. **Image dominant colour** (TASKS Parity). Move the sampler to a shared utility and adopt it in `Next.Image`,
    or leave it out per decision 11. Recommendation: leave it out until a list or card consumer asks.

### Open from the react-ui-list pilot

14. **Nested scrolling.** `Next.Listbox.Content` is always its own ScrollArea, so inside `Next.Panel.Content` there
    are two scroll frames and the inner one never scrolls. Options: (1) a Listbox mode that renders its content
    without a ScrollArea, (2) keep it and have hosts not scroll. Recommendation: 1.
15. **List rows on the panel's rails.** `gutter='inherit'` cannot reach through the Listbox's ScrollArea, so rows use
    an `inset` gutter and miss the panel's rails. Recommendation: follows from 14; with no inner ScrollArea, rows
    inherit.
16. **DetailItem layout.** A row Container centres every cell, so the detail row is a Collapsible root holding its
    own row. Options: (1) keep that, (2) a top-aligned Container row option. Recommendation: 1.
17. **Drop-target styling.** Rows showing a drop indicator are positioned by a generic `:has(> .nx-drop-indicator)`
    rule. Options: (1) keep it, (2) an explicit `data-drop-target` attribute. Recommendation: 1.
18. **Title in a disclosure row.** `Collapsible.Trigger` draws its label in the description colour. Options: (1) a
    title variant on the trigger, (2) accept it. Recommendation: 1.
19. **OrderedList keyboard grammar.** Options: (1) roving focus between rows, as the current `navigationMode`,
    (2) a tab stop per control, as now. Recommendation: 1, which needs a roving-focus part outside Toolbar.
20. **Shared row states.** Hover and selected styles apply only to `.nx-listbox-item`. Recommendation: one row-state
    rule that OrderedList rows share.
21. **List chrome labels.** "Drag to rearrange" and "Delete" come from app-level `osTranslations`. Recommendation:
    move them to react-ui translations (2.10).
22. **Story helpers for other packages.** `@dxos/react-ui/next/testing` exports `withSizes`, `SIZE_ARG_TYPES` and
    `SizeArgs`; `GEOMETRY`, `byTestId` and the rest of `testing.ts` stay internal because they import
    `storybook/test`. Recommendation: move `testing.ts` under `testing/` too and export it once a second package
    needs geometry assertions.
23. **Plugin list look.** The pilot swapped 14rem cards for list rows and lost the per-plugin icon hue.
    Options: (1) Listbox items take an icon hue, (2) rows as Next Cards. Recommendation: 1.
24. **Default drag preview.** Without `dragPreview`, the browser snapshots the row. Recommendation: a default
    `Next.DragPreview` chip labelled via a `getLabel` prop.

### Milestone status

| #   | Milestone                     | Status                                                                                                             |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Foundations                   | pane host, popup size, Group stretch done; child span (point 7), required marker (point 8), depth-5 benchmark open |
| 2   | Next.Listbox                  | done                                                                                                               |
| 3   | `react-ui-list/next` scaffold | done: `./next` entry, Listbox, plugin-registry pilot (open: points 14, 15, 23)                                     |
| 4   | OrderedList next              | done: OrderedList on Container/Collapsible rows; plugin-sheet `RangeList` pilot open (points 16–20, 24)            |
| 5   | Combobox trigger mode         | blocked on point 9                                                                                                 |
| 6   | `react-ui-form/next` core     | not started; needs points 7, 8                                                                                     |
| 7   | Settings layout               | blocked on point 1                                                                                                 |
| 8   | Arrays and layout templates   | needs milestones 4, 6, 7                                                                                           |
| 9   | Ref and lookup fields         | needs milestones 5, 6                                                                                              |
| 10  | Higher-level form components  | needs milestones 7–9, point 10                                                                                     |
| 11  | Tree next                     | blocked on points 2, 3                                                                                             |
