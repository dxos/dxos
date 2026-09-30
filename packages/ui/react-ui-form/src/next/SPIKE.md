# Spike: react-ui-form on `@dxos/react-ui/next`

## Verdict: yes, with changes

Next holds up for Form: the current `Form.Root` contract, hooks, annotation handling and `resolveFieldRenderer` drive a
view layer rebuilt entirely on Next parts, with no `className`, no wrapper `div` and no size or level context, and every
scope item below passes its play test. Three of the nine items needed a change to a Next primitive, four changes in
all, each small and additive (a row layout for `Field.Root`, grid-joining `Fieldset` and `Collapsible.Content`, a
column gap for own-column rows); the one real surprise is that a native `<fieldset>` cannot be a subgrid, so a grid Fieldset renders a `group`
element. Deep subgrids are not a performance risk: a depth-5, ~500-field form mounts and lays out faster than the
current Form, and a keystroke costs the same React re-render in both.

Everything lives in `src/next/` (not exported from the package root); stories are titled `ui/react-ui-form/next/*`.

## Per scope item

### 1. Same contract (`Form.stories.tsx`)

- **Worked.** `Form.Root` is the current one, unchanged (`schema`, `values`, `onValuesChanged`, `onSave`/`onCancel`,
  `fieldMap`, `fieldProvider`, `testId`, `variant`, `layout`). `useFormField`, `useFormHandler`, the binding context and
  `resolveFieldRenderer` are shared. Test ids `save-button`, `cancel-button` and `form.error` behave as before.
- **Row-level blur.** `Field.Root onBlur` (a bubbling `focusout`) marks the field touched, so a control needs no
  `onBlur` of its own. That matters because NumberInput, PasswordInput and DateInput take no `onBlur` (proposed point
  50).
- **Broke: an import cycle.** The current Form's modules import each other in a cycle (FormControls → FormFields →
  FormFieldDispatch → fields → ObjectPicker → Form.tsx). It only resolves when `components/Form/Form.tsx` is evaluated
  first; importing `FormControls.tsx` first throws "Cannot access 'FormRoot' before initialization". `next/Form.tsx`
  therefore takes `Root` from `Form.tsx`, which is order-sensitive (proposed point 49).
- **Friction: resolution returns components.** `resolveFieldRenderer` answers a scalar with the current renderer
  component, so the next dispatcher keeps a `Map` from each current renderer to its Next counterpart (proposed point
  48).
- **Exported from the root to be shared.** The next layer reuses these root-module helpers, which are now exported (and
  so reach the root barrel): `useFormFieldBindingAt`, `isEmptyValue`, `formatStaticValue`, `useFormFieldsProperties`,
  `isoToLocalDateTime`, `localDateTimeToIso`.
- **Not ported (out of the spike's scope).** The `Form.Layout` DSL (M8, needs AUDIT point 7), options lookup
  (AsyncSelect/Combobox field), autofill, hue, markdown, inline refs, SelectOptionField, projection option titles in
  Select, and markdown in FieldSet descriptions (rendered as plain text; `MarkdownView` is a current component).

### 2. Scalar renderers (`Form.stories.tsx` Test)

Text (`Input`), number (`NumberInput`: spinbutton, ArrowUp steps an integer), boolean (`Switch`, self-labelled; in a
settings row the row's label names it), date/datetime/time (`DateInput`; `Format.Time` needs `granularity='second'`
for the stored `HH:mm:ss`), select over literals (`Select`, labelled through Ark's field context, value mapped back to
the literal, AUDIT 2.14), `createSelectField` (same signature, on `Next.Select`), textarea (`Textarea autoResize`),
password (`PasswordInput`) and geo point (two `Field.Root`s in an own-column row Container).

- NumberInput keeps the text locally so a partial edit ("1.") survives until it parses.
- A `Format.Key` field set `font-mono` through `classNames`; Next has no mono variant on Input (proposed point 52).
- A geo point's two inputs need a column gap, which Container `gap` did not give (Next change 4).

### 3. Nested objects, depth 5 (`Nested.stories.tsx`)

Each nested object is a grid `Fieldset` (`gutter='inherit'`, `level='+1'`) whose legend holds a `Collapsible.Trigger`
and whose body is a `Collapsible.Content gutter='inherit'`, so every level is a subgrid of the form. The Test asserts that
every input at all six levels spans exactly the top-level content track, that each group's `grid-template-columns`
equals the form's, that legends start on the labels' line, and that folding hides the level's fields.

- **Broke: `<fieldset>` cannot be a subgrid.** Its children lay out in an anonymous content box whose parent (the
  fieldset) is not the grid, so `subgrid` silently becomes `none` and `grid-column: content` names a line that does not
  exist: items land in implicit tracks 200px to the right. A grid set therefore renders a `div role='group'` (Ark
  `asChild`) named by its legend (also a `div`), and `disabled` reaches its fields through Ark's fieldset context
  instead of the native attribute (Next change 2; proposed point 45).
- **Row gap does not travel down subgrids.** A subgrid shares columns only, so a grid Fieldset and Collapsible Content
  now take `row-gap: inherit` (Next change 3).
- **The level ladder saturates.** `+1` steps base → raised → overlay → popup and stops: from depth 4 down, groups no
  longer step, and a control's well loses contrast on the top rungs (proposed point 47).
- **No indentation.** Shared rails mean nested fields line up with top-level ones; hierarchy shows only as surface and
  legend. The current Form indents and borders nested groups (proposed point 53).

**Measurements** (`Nested.stories.tsx` Benchmark): the same schema, 6 levels × 83 text fields (498 fields, depth 5), in a
32rem × 44rem pane; headless Chromium via the storybook vitest runner, median of 3 mounts and 9 keystrokes. Mount is
click to the parent's layout effect (React render and commit); layout is a forced layout right after; keystroke is a
native `input` event on the deepest input through React's commit to a forced layout.

| Implementation | Mount   | Layout  | Keystroke |
| -------------- | ------- | ------- | --------- |
| Next (spike)   | 43.1 ms | 8.6 ms  | 89.7 ms   |
| Current Form   | 51.0 ms | 12.2 ms | 105.3 ms  |

Three separate runs agreed within ±4 ms. Deep subgrids and the `+1` style queries cost less than the current Form's nested
Column grids. The keystroke is dominated in both by React re-rendering the whole form on each value change
(`Form.Root` owns `values`), not by style or layout. That is a form-state issue for M6, not a Next one. The
Foundations depth-5 subgrid benchmark (AUDIT 2.7, milestone 1) can use these numbers; a 110 ms budget per keystroke at
500 fields would pass today.

### 4. Arrays (`ArrayField.stories.tsx`)

A header row (label, add Button) over a `react-ui-list/next` `OrderedList` (`Content scroll={false} gutter='inherit'`),
with rows of `[DragHandle] control [remove]`. A `FormOrderedAnnotation` array gets drag handles. The Test covers add
and type, remove, Alt+ArrowDown reorder, and object items rendering as nested sets.

- **A row cell is one track.** An inheriting (subgrid) child of a row cell spans a single track that carries none of
  the `content-*` line names, so a nested group in a cell places its children in implicit tracks. The item's cell is
  therefore a `Container gutter='none'`, a template root (proposed point 46). The same applies to a Form placed in a
  row cell (the side-by-side story uses `Form.Viewport gutter='none'`).
- `Field.Header` pushes trailing Buttons to the end only after a `.nx-label`. With a Typography label (an array or a
  standalone row), the add Button sits right after the text (proposed point 51).
- Row identity is a parallel id list, as today (AUDIT point 43). The drag label still comes from `osTranslations`
  (AUDIT point 21).

### 5. Refs (`RefField.stories.tsx`)

**Trigger mode is not in the base**, so the field uses `Next.Combobox` in input mode: `Control` with `Input`,
`ClearTrigger` and `Trigger`. The Test covers labelling by the field, filtering as the user types, Enter picking the
first match and writing a `Ref`, the popup inheriting `sm`, and clear unsetting the value. The data path is the current
one (`useResults`, `getOptions`, `findRefOption`).

What trigger mode (AUDIT point 9, milestone 5) must provide for RefField and ObjectPicker:

1. A `Trigger` outside `Control` that shows the selected option's label, or a placeholder in the description tone, as a
   control-sized button with `aria-haspopup='listbox'`, labelled by the enclosing `Field`.
2. The search `Input` inside `Content`, at the top of the popup and outside its scroll viewport. Focus moves to it on
   open and back to the trigger on close. Typing filters; Arrow/Enter/Escape work from the input.
3. An item `description` line (`RefOption.description`); popup rows are one block today (Part naming rule 7 reserves
   `ItemDescription` for Listbox).
4. A **create row**: a footer action outside the collection ("Create …", `createOptionLabel`/`createOptionIcon`) that
   swaps the popup to an inline `Form` and calls `onCreate` with the new values, keeping keyboard reach from the list.
5. Async results: a `loading` state on Trigger (Select has one) and on Content, distinct from `Empty`.
6. A virtual anchor (`positioning.getAnchorRect`) for opening from a `DxAnchor` or an editor mark.
7. `multiple` for arrays of refs (tags), with the selected labels in the trigger.
8. Translatable labels: zag's defaults are English ("Toggle suggestions", "Clear value"), which the Test must match
   today (AUDIT 2.10).

Not ported: the read-only `DxAnchor` link (a plain Typography label here) and inline create.

### 6. Custom renderer migration (`CustomRenderer.stories.tsx`)

The renderer ported is plugin-space `SpaceSettingsContainer`'s `name` renderer (a settings form, a `fieldMap` row with
a description). The story renders the current renderer in the current Form beside the migrated one in the spike, on
shared values. The diff is exactly the claim:

- `Form` comes from `react-ui-form/next`.
- `Field.Input` becomes `Next.Input`.
- `classNames='w-64 max-w-full min-w-0'` goes, since the settings row sizes the control.
- `getValue()` becomes `getValue() ?? ''` (a controlled Ark input).

The same container's `icon` renderer could not move yet: `IconPicker` is a current react-ui-pickers component (AUDIT
§3.4 item 10).

### 7. Host (`Panel.stories.tsx`)

`Form.Root` wraps a `Next.Panel.Root size='sm'`: a toolbar Header, a Body holding `Form.Content` (no `Form.Viewport`,
since the Body is already the scrolling rail Container) and a Footer holding `Form.Actions`. The Test checks the 24px
rail (an sm block), that the body overflows while the footer stays in the pane, and that the Select popup opens at
`sm`. TestNarrow (20rem) checks the rails collapse to the inset. `Form.Root` renders no element, so it can enclose the
whole panel. The toolbar is also a scroll viewport, so `.nx-scroll-viewport` alone does not find the body.

### 8. Settings layout (`Settings.stories.tsx`): option 1 works

AUDIT §3.2 option 1 is implemented as specified. `Form.Content` sets `SETTINGS_COLUMNS`
(`minmax(0, 1fr) [control] minmax(0, 1fr)`). Each row is `Field.Root layout='row' level='+1'`: header and description
before the `control` line, the control after it, centred against both, drawn as a bordered card one rung up. Sections
are grid Fieldsets, so the two tracks run through every section. The Test asserts, across seven rows in two sections,
equal control and label x, label and description left of the control, description under the label, a 1px border and
`data-surface='+1'`. TestNarrow (20rem) asserts every row stacks with the control under the description.

**Verdict:** adopt option 1. It needed `Field.Root layout`/`level` (Phase 4 decision 3's "react-ui piece") and no
settings-specific CSS in the form. The bordered row is `Field.Root` itself rather than a wrapping `level='+1'`
Container, one element per row. Open questions for M7: the 1fr/1fr split (a content-sized label track,
`minmax(auto, 1fr)`, also aligns, since the tracks are shared through subgrid), and whether section legends want
their own border.

### 9. Side by side (`SideBySide.stories.tsx`)

The current Form (left) and the spike (right) on the Person, scalar, array and settings schemas, sharing values; the
Test edits the spike and reads the current form. Visible differences: nested groups are unindented surfaces rather
than bordered insets (point 53), the array add Button sits after the label (point 51), dates are segmented with a
calendar trigger inside the control, and controls sit a control inset shorter (decision 12).

## Next primitive changes

Minimal and additive; each is covered by that component's Test story, and all 41 react-ui `src/next` story files pass.

1. **`Field.Root layout='row'` and `level`** (`Field.tsx`, `theme/control.css`, `theme/level.css`). A row field is a
   subgrid of its parent's columns: header and helper before the interior `control` line, other children after it,
   stacked below the pane's collapse width. `level` draws the bordered card, and `.nx-field` joins the `+1` ladder.
   Covered by Field `Test` (row fields).
2. **Grid `Fieldset`: `Fieldset.Root gutter='inherit'` and `level`** (`Fieldset.tsx`, `theme/fieldset.css`). It renders
   a `div role='group'` through Ark's `asChild`, with the Container attributes; `Legend` renders a `div` inside it. The
   flex rules are now `:not(.nx-grid)`. Covered by Fieldset `Test` (a grid set holding a nested, collapsible,
   disabled grid set).
3. **`Collapsible.Content gutter='inherit'`** (`Collapsible.tsx`, `theme/collapsible.css`), and `row-gap: inherit` for
   grid Fieldsets and Collapsible Contents. Covered by the same Fieldset `Test`.
4. **Container:** `gap` also sets `column-gap` on a `row` with its own `columns` and no gutters, which shares no parent
   tracks; and no dev "not a direct child" warning when `columns` is set, since such a container starts a fresh
   template. Covered by Field `Test` (a two-input row).

## Decision points (AUDIT §6)

Settled or informed by the spike:

- **Point 1 (settings layout):** option 1 works as recommended (item 8).
- **Point 9 (Combobox trigger mode):** requirements listed under item 5.
- **Point 14/15 (nested scrolling):** `OrderedList.Content scroll={false} gutter='inherit'` inside a form works; its
  rows keep the form's content track.
- **2.2 popup size:** settled in practice. Select, Combobox and DateInput popups inherit `sm` from the panel with no
  `size` threaded through renderers, so `FormFieldRendererProps` needs no `size`.
- **2.7 depth benchmark:** measured (item 3).

Proposed new points:

45. **Grid Fieldset is a `group` element.** Accept: a `<fieldset>` cannot be a subgrid. Name it by its legend, and
    reach `disabled` through Ark's context.
46. **Subgrid in a one-track cell.** An inheriting child of a `row` cell has no `content-*` lines. Options: (1) a dev
    warning when an inheriting Container's or grid set's parent is a `row` Container, (2) have row cells re-declare the
    edge names. Recommendation: 1.
47. **Nested groups and the level ladder.** `+1` saturates at popup and wells lose contrast. Options: (1) nested form
    groups use an aspect (a `group`/well tint that steps off its host, like `bar`) instead of a rung per depth, (2) step
    only the first nesting. Recommendation: 1.
48. **`resolveFieldRenderer` returns a scalar kind** (`'text' | 'number' | …`) rather than the current component, so
    both views map kinds to their own renderers. Recommendation: do it in M6.
49. **Break the Form module cycle** (FormControls ↔ FormFields ↔ fields ↔ ObjectPicker → Form). Recommendation: in
    M6, before `next` is imported from anywhere but stories.
50. **Blur lives on the row.** `Field.Root onBlur` (`focusout`) marks touched for every control. Recommendation: keep
    it, and add no `onBlur` to NumberInput, PasswordInput or DateInput.
51. **`Field.Header` with a text label.** The trailing push applies only after `.nx-label`. Recommendation: extend it
    to a Typography label.
52. **Mono input** for `Format.Key` (the current `font-mono` class). Recommendation: `Input variant='mono'` or a `font`
    prop.
53. **Hierarchy without indentation.** Nested groups share the rails, so they do not indent. Options: (1) accept (a
    surface and a legend), (2) indent the content track per depth with a nested `columns` offset, (3) a bordered inset
    card (which gives up rail alignment). Recommendation: decide with a designer; 1 fits decision 5.

## Revised estimate, milestones 6–10 (AUDIT §5)

In focused PR-days, assuming the spike's code is the starting point.

| #   | Milestone                    | Spike coverage                                                                                                                          | Remaining                                                                                                                                                                                                                    | Estimate           |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 6   | `react-ui-form/next` core    | Root, Content, Viewport, FieldSet, Fields, Field/Row, Actions, Submit, ErrorText; 9 scalars; `createSelectField`; the no-className test | points 48–50; `./next` subpath; AsyncSelect (loading), Autofill, Tuple, static and readonly polish, projection option titles, markdown descriptions; port the per-renderer stories; pilot plugin-thread `ChannelCreatePanel` | 3–4 days           |
| 7   | Settings layout              | layout, primitives, stories and geometry tests                                                                                          | pilots plugin-pwa and plugin-excalidraw, then plugin-settings `DefaultSettings`; section chrome; label-track sizing                                                                                                          | 2 days             |
| 8   | Arrays and layout templates  | ArrayField on OrderedList                                                                                                               | SelectOptionField (Tag, Toggle, HuePicker on Next Popover); `Form.Layout` DSL (needs AUDIT point 7, Container child span); point 46; pilot `PipelineProperties`                                                              | 3–4 days           |
| 9   | Ref and lookup fields        | RefField in input mode, the data path                                                                                                   | after M5 trigger mode (~3 days on its own): RefField, ObjectPicker with inline create, InlineRefField, ComboboxField; pilot plugin-space                                                                                     | 4–5 days (plus M5) |
| 10  | Higher-level form components | none                                                                                                                                    | ObjectProperties, ObjectForm, ViewEditor (Banner, QueryForm), FieldEditor; a control frame for MarkdownField and RefEditor (AUDIT point 10); plugin-map pilot                                                                | 6–8 days           |

Total: about 18–23 days for M6–M10, plus M5. The risk sits in M9 (trigger mode's create row) and M10 (CodeMirror in a
control frame); M6 and M7 are mostly done.

## Verification

Run locally in this worktree (not the cloud sandbox), headless Chromium.

- `npx tsc -b packages/ui/react-ui-form/tsconfig.json` (builds react-ui and react-ui-list declarations): pass.
- `pnpm exec oxlint src` (react-ui-form) and `pnpm exec oxlint src/next` (react-ui): pass.
- Storybook vitest: react-ui-form `src/next` 8 files, 24 tests pass (includes the benchmark); react-ui `src/next` 41
  files, 87 tests pass; react-ui-list `src/next` 3 files, 12 tests pass.
- Node vitest: react-ui-form `src/next` (`rules.test.ts`: no className, classNames, tv recipe or `div`) and
  `src/components/Form`: 10 files, 55 tests pass.
- `oxfmt` on every touched file.
- Environment: the react-ui-form storybook runner needed a stale optimizer cache removed
  (`node_modules/.cache/storybook`) after a first run whose dependency scan failed before dependencies were built, and
  an empty `plugin-tldraw/dist/assets` (a storybook static dir) to exist.
