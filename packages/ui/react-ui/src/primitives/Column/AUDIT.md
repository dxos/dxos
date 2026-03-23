# Column composition

## Background

We have a complex design issue that requires research and deep thinking.

`Column` is a primitive that establishes a 3 column grid (side gutters and main content channel) by creating a CSS `grid` and setting the `--gutter` CSS variable.
Both `Dialog` and `Card` use `Column` to establish their grid and both have separate sub-components.
Also `ScrollArea` uses the `Column` grid to establish the side margins (padding via `--gutter`) for the main content.
Various components (e.g., `Form`) define a `Viewport` that implements a `ScrollArea` to establish their grid.

## Initial Tasks

1. Create a column-aligned Markdown table listing the sub-components for `Card` and `Dialog`.
2. Add to this table all Radix-style components that have a `Viewport` sub-component that uses `ScrollArea`.
3. For each of these component comment on whether they use appropraite standard for `Content` and `Viewport`, and call out any major design issues.

## Design Challenge

The use of `Column` is intended to standardize how components establish a grid.
It is intended that this supports nesting; e.g., a `Dialog` that has a `Form` in its `Viewport`.
However there is a problem when child components contain other components that contain `Viewport`.
For example:

```
- CreateObjectDialog (plugin-space)
  - Dialog.Root
    - Dialog.Body
      - Dialog.Viewport => ScrollArea
        - CreateObjectPanel
          - Form.Root
            - Form.Viewport => ScrollArea
              - Form.Content
                - Form.FieldSet
                - Form.Actions
```

The nested Viewports create a double set of scrollbars,
whereas the entire contents of the `Dialog.Body` should be considered to be a single scroll-area.
In this case we could omit the `Dialog.Viewport`, but inside `CreateObjectPanel` there are other components that do not define `Viewports`.

Determine if this is really a problem. And consider different approachs.

## Audit

### Sub-components for Dialog and Card

| Component  | Sub-component   | Uses Column                     | Uses ScrollArea                    | Has Viewport | Notes                            |
| :--------- | :-------------- | :------------------------------ | :--------------------------------- | :----------- | :------------------------------- |
| **Dialog** | Root            | —                               | —                                  | —            | ElevationProvider wrapper        |
|            | Trigger         | —                               | —                                  | —            | Radix primitive                  |
|            | Portal          | —                               | —                                  | —            | Radix primitive                  |
|            | Overlay         | —                               | —                                  | —            | OverlayLayoutProvider            |
|            | Content         | **Column.Root** (gutter='sm')   | —                                  | —            | Establishes the 3-col grid       |
|            | Header          | **Column.Row** (center)         | —                                  | —            | Title + Close row                |
|            | Body            | col-span-full                   | —                                  | —            | Plain div, no gutters applied    |
|            | **Viewport**    | **Column.Viewport**             | **ScrollArea** (vertical, padding) | **Yes**      | Alias for Column.Viewport        |
|            | Title           | —                               | —                                  | —            | Radix primitive                  |
|            | Description     | —                               | —                                  | —            | Radix primitive                  |
|            | ActionBar       | **Column.Row** (center)         | —                                  | —            | Action buttons row               |
|            | Close           | —                               | —                                  | —            | Radix primitive                  |
|            | CloseIconButton | —                               | —                                  | —            | Icon button                      |
| **Card**   | Root            | **Column.Root** (gutter varies) | —                                  | —            | gutter='lg' coarse, 'md' default |
|            | Toolbar         | col-span-3, subgrid             | —                                  | —            | Toolbar.Root wrapper             |
|            | DragHandle      | —                               | —                                  | —            | In CardIconBlock                 |
|            | CloseIconButton | —                               | —                                  | —            | In CardIconBlock                 |
|            | Menu            | —                               | —                                  | —            | In CardIconBlock                 |
|            | Icon            | —                               | —                                  | —            | In CardIconBlock                 |
|            | IconBlock       | —                               | —                                  | —            | Grid cell for icons              |
|            | Title           | —                               | —                                  | —            | Heading div                      |
|            | Content         | —                               | —                                  | —            | `display: contents`              |
|            | Row             | **Column.Row**                  | —                                  | —            | With optional icon slot          |
|            | Section         | col-span-full                   | —                                  | —            | **Deprecated**                   |
|            | Heading         | —                               | —                                  | —            | **Deprecated**                   |
|            | Text            | —                               | —                                  | —            | Text display                     |
|            | Poster          | col-span-full                   | —                                  | —            | Image/icon                       |
|            | Action          | Column.Row via subgrid          | —                                  | —            | Button row                       |
|            | Link            | Column.Row via subgrid          | —                                  | —            | External link row                |

### Components with Viewport sub-components using ScrollArea

| Component      | Viewport impl          | ScrollArea config                         | Notes                                    |
| :------------- | :--------------------- | :---------------------------------------- | :--------------------------------------- |
| **Column**     | Column.Viewport        | vertical, padding                         | Base primitive; adds `py-2`              |
| **Dialog**     | Dialog.Viewport        | (alias for Column.Viewport)               | No Dialog-specific behavior              |
| **Form**       | Form.Viewport          | vertical, margin, padding, thin           | Sets `role='listbox'`                    |
| **SearchList** | SearchList.Viewport    | thin only                                 | Sets `role='listbox'`; no margin/padding |
| **Settings**   | Settings.Root (itself) | vertical, margin                          | Root IS the ScrollArea; adds `p-trim-md` |
| **Popover**    | Popover.Viewport       | **None** (constraint div, not ScrollArea) | Just constrains inline/block size        |
| **Combobox**   | Combobox.List          | (delegates to SearchList.Viewport)        | Nested inside Popover.Viewport           |

### Design issues per component

| Component      | Content/Viewport standard                           | Issues                                                                                                                                                                              |
| :------------- | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dialog**     | Content → Column.Root; Viewport → Column.Viewport   | `Dialog.Viewport` is a raw alias with no Dialog-specific awareness. `Dialog.Body` has `col-span-full` but no gutter padding — non-scrolling content inside it has no side margins.  |
| **Card**       | Content → `display:contents`; No Viewport           | Card has no scroll support. Card.Content using `display:contents` collapses the element from layout, which can cause containment/styling issues. No Body equivalent exists.         |
| **Form**       | Root → context provider; Viewport → ScrollArea      | Form.Viewport applies its own gutter padding via `--gutter`. When nested inside Dialog.Content (which sets `--gutter`), the padding aligns — but creates a second scroll container. |
| **SearchList** | Content → flex column; Viewport → ScrollArea (thin) | SearchList.Viewport uses `thin` but NOT `margin` or `padding` — it doesn't apply `--gutter` padding at all. Content alignment inside a Column grid depends entirely on the parent.  |
| **Settings**   | Root IS the ScrollArea                              | Standalone design; would double-scroll if placed inside another Viewport.                                                                                                           |
| **Combobox**   | Delegates to SearchList.Viewport inside Popover     | No conflict — Popover.Viewport is not ScrollArea-based.                                                                                                                             |

## Analysis

### The problem

The core tension is between two responsibilities that `Viewport` (ScrollArea) currently conflates:

1. **Scrolling** — overflow handling and scrollbar styling.
2. **Gutter padding** — applying `px-[var(--gutter)]` (with scrollbar-width offset) to align content within the Column grid.

When a container like `Dialog` provides its own Viewport and a child like `Form` also provides one,
you get double scrollbars. Removing the container's Viewport fixes scrolling but breaks gutter alignment
for child paths that don't bring their own Viewport (e.g., plain text content).

### The real nesting in CreateObjectDialog today

```
Dialog.Content (Column.Root, sets --gutter)
  Dialog.Header (Column.Row)
  Dialog.Body (col-span-full, NO gutter padding)
    CreateObjectPanel (switches between paths):
      Path A: SelectType → SearchList → SearchList.Viewport (ScrollArea, thin)
      Path B: SelectSpace → SearchList → SearchList.Viewport (ScrollArea, thin)
      Path C: Form.Root → Form.Viewport (ScrollArea, margin, padding, thin) → Form.Content
      Path D: (future) plain content — no Viewport, no gutters, broken alignment
```

Dialog.Viewport was removed to avoid double scrollbars in paths A–C.
But path D would have no gutter padding because Dialog.Body doesn't provide it.

### Design principles

1. **Column.Content provides gutters via subgrid.** `Column.Root` sets `--gutter` and establishes the 3-column grid. `Column.Content` inherits this grid via CSS subgrid, placing non-scrolling children in the center column and allowing ScrollArea children to span full width.
2. **Leaves own scrolling.** Components that need to scroll (Form, SearchList) provide their own Viewport. Components that don't need to scroll do nothing.
3. **ScrollArea is always full width.** ScrollArea.Root must span all 3 grid columns and apply its own gutter padding via `--gutter` on its Viewport. No parent should constrain its width.
4. **Subgrid propagation.** Components with both Content and Viewport sub-components (e.g., SearchList) propagate the subgrid in their Content element when inside a Column context.

## Implemented Solution: Column.Content as subgrid

### Mechanism

`Column.Content` uses `grid-cols-subgrid` to inherit `Column.Root`'s 3-column grid. Non-scrolling children default to the center column; ScrollArea children span all 3 columns.

Direct children of `Column.Root` participate in the grid in one of three ways:

- **Column.Row** — 3-col subgrid row (icons in gutters, content in center).
- **Column.Content** — multi-row subgrid; children default to center column, ScrollArea spans full width.
- **Column.Viewport** — full-width scrollable area (delegates gutters to ScrollArea).

```css
/* Column.Content — subgrid that inherits Column.Root's 3-column grid */
.column-content {
  col-span-full;
  display: grid;
  grid-template-columns: subgrid;
  min-height: 0;                          /* allow shrinking in flex/grid parents */
  > *:not(.dx-container) { col-start: 2 } /* non-ScrollArea children → center column */
  /* ScrollArea children span full width via [.dx-column_&]:col-span-full (existing) */
}
```

### Why subgrid instead of padding

An earlier approach used `px-[var(--gutter)]` padding on Column.Content with a `--gutter-offset`
CSS variable for ScrollArea to break out via negative margins. This failed because:

1. **Height constraint required `overflow-hidden`** — needed for ScrollArea to get a bounded height.
2. **`overflow-hidden` clips negative margins** — ScrollArea couldn't break out horizontally.
3. **CSS doesn't allow mixed overflow** — `overflow-y: hidden` with `overflow-x: visible` isn't possible (browser converts visible to auto).

Subgrid avoids all three issues: gutters come from grid columns (not padding), so there's nothing to break out of and no overflow conflict.

### Subgrid propagation pattern

Components that have both a Content element and a ScrollArea-based Viewport must propagate
the subgrid in their Content element when inside a Column context. This ensures the grid chain
is maintained from Column.Root through intermediate components down to ScrollArea.Root.

```css
/* Applied to SearchList.Content (and similar) when inside a Column context */
[.dx-column_&]:col-span-full
[.dx-column_&]:grid
[.dx-column_&]:grid-cols-subgrid
[.dx-column_&]:[&>:not(.dx-container)]:col-start-2
```

Components using this pattern:

- **SearchList.Content** — propagates subgrid; SearchList.Viewport (ScrollArea) spans full width

Outside a Column context, these remain normal flex containers.

### Example: CreateObjectDialog

```
Dialog.Content (Column.Root, --gutter: var(--dx-gutter-sm), grid: 16px|1fr|16px)
  Dialog.Header (Column.Row, center)
  Dialog.Body → Column.Content (subgrid, children default to col-start-2)
    CreateObjectPanel:
      Path A: SearchList.Content (subgrid in column context)
                → SearchList.Input (col-start-2, in center — guttered ✓)
                → SearchList.Viewport (ScrollArea, col-span-full — full width ✓)
                    → ScrollArea.Viewport (pl/pr with --gutter and scrollbar offset ✓)
      Path B: (same as A) ✓
      Path C: Form.Viewport (ScrollArea, col-span-full — full width ✓)
                → ScrollArea.Viewport (pl/pr with --gutter and scrollbar offset ✓)
      Path D: <plain text> — col-start-2 (center column, guttered ✓)
```

### Dialog sub-component mapping

| Dialog sub-component | Column primitive | Gutter mechanism                               |
| :------------------- | :--------------- | :--------------------------------------------- |
| Dialog.Content       | Column.Root      | Establishes the 3-col grid and sets `--gutter` |
| Dialog.Header        | Column.Row       | Gutters via grid columns (subgrid)             |
| Dialog.Body          | Column.Content   | Subgrid; children in center column             |
| Dialog.ActionBar     | Column.Row       | Gutters via grid columns (subgrid)             |

### AlertDialog unified with Dialog ✅

AlertDialog now shares sub-components with Dialog:

| Sub-component     | Source                     | Notes                                                          |
| :---------------- | :------------------------- | :------------------------------------------------------------- |
| Header            | **Dialog.Header**          | Shared — was missing from AlertDialog                          |
| Body              | **Dialog.Body**            | Shared — was Column.Viewport, now Column.Content               |
| ActionBar         | **Dialog.ActionBar**       | Shared — was duplicated, now shared                            |
| CloseIconButton   | **Dialog.CloseIconButton** | Shared — AlertDialog gains this                                |
| Content           | AlertDialog-specific       | Uses AlertDialogPrimitive.Content; gutter normalized to `'sm'` |
| Overlay           | AlertDialog-specific       | Uses AlertDialogPrimitive.Overlay                              |
| Title/Description | AlertDialog-specific       | Uses AlertDialogPrimitive.Title/Description                    |
| Cancel/Action     | AlertDialog-specific       | Radix dismissal primitives                                     |

## Dialog Usage Audit

Full audit of all Dialog/AlertDialog consumers, checking whether they use the standard
`Dialog.Content > Dialog.Header > Dialog.Body > Dialog.ActionBar` structure.

### Correctly structured (uses Dialog.Body)

| File                                           | Type   | Sub-components used              | Body content                        |
| :--------------------------------------------- | :----- | :------------------------------- | :---------------------------------- |
| `devtools/.../DialogRestoreSpace.tsx`          | Dialog | Content, Header, Body, ActionBar | Paragraph text + FileUploader       |
| `plugin-navtree/.../CommandsDialogContent.tsx` | Dialog | Content, Header, Body, ActionBar | SearchList with Viewport            |
| `plugin-space/.../CreateObjectDialog.tsx`      | Dialog | Content, Header, Body            | CreateObjectPanel (Form/SearchList) |
| `shell/.../ConfirmReset.tsx`                   | Dialog | Body, ActionBar (step component) | Message, TextInput, checkboxes      |
| `react-ui/.../Dialog.stories.tsx`              | Dialog | Content, Header, Body, ActionBar | ScrollArea with Input               |

### Correctly structured (AlertDialog with Body)

| File                                       | Type        | Sub-components used             | Body content                  |
| :----------------------------------------- | :---------- | :------------------------------ | :---------------------------- |
| `plugin-client/.../RecoveryCodeDialog.tsx` | AlertDialog | Content, Body, Title, ActionBar | Checkboxes, code grid, inputs |
| `composer-app/.../ResetDialog.tsx`         | AlertDialog | Content, Body, Title, ActionBar | Error display, IconButtons    |
| `shell/.../JoinDialog.tsx`                 | AlertDialog | Content, Body, Cancel, Action   | JoinPanel                     |
| `shell/.../StatusDialog.tsx`               | AlertDialog | Content, Body                   | StatusPanel                   |
| `react-ui/.../AlertDialog.stories.tsx`     | AlertDialog | Content, Body, Title, ActionBar | Title, Description            |

### Missing Dialog.Body (should be added)

| File                                         | Type   | What's used instead      | Body content                   | Issue                                                 |
| :------------------------------------------- | :----- | :----------------------- | :----------------------------- | :---------------------------------------------------- |
| `plugin-script/.../DeploymentDialog.tsx`     | Dialog | Custom flex divs         | Text, list items, buttons      | No Header, no Body, no gutter padding                 |
| `plugin-search/.../SearchDialog.tsx`         | Dialog | Content directly         | SearchList with max-h overflow | No Header, no Body; SearchList has own scroll         |
| `plugin-help/.../ShortcutsDialogContent.tsx` | Dialog | Custom flex divs         | ShortcutsList                  | No Header, no Body                                    |
| `plugin-space/.../CreateSpaceDialog.tsx`     | Dialog | Form.Viewport in Content | Form fields                    | Has Header but no Body; Form.Viewport provides scroll |
| `plugin-space/.../JoinDialog.tsx`            | Dialog | Content directly         | JoinPanel                      | No Header, no Body; panel manages layout              |
| `plugin-client/.../JoinDialog.tsx`           | Dialog | Content directly         | JoinPanel                      | No Body; panel manages layout                         |
| `plugin-client/.../ResetDialog.tsx`          | Dialog | Content directly         | ConfirmReset step              | No Body; step component has its own Body              |
| `shell/.../SpaceDialog.tsx`                  | Dialog | Content directly         | SpacePanel                     | No Header, no Body; panel manages layout              |
| `shell/.../IdentityDialog.tsx`               | Dialog | Content directly         | IdentityPanel                  | No Header, no Body; panel manages layout              |
| `shell/.../run-shell.tsx`                    | Dialog | Content directly         | Button (fallback)              | No Header, no Body; minimal fallback UI               |

### Custom layout (not standard Dialog)

| File                                  | Type   | Notes                                                     |
| :------------------------------------ | :----- | :-------------------------------------------------------- |
| `react-ui-chat/.../ChatDialog.tsx`    | Custom | Own Column-based grid layout with Header, Content, Footer |
| `plugin-assistant/.../ChatDialog.tsx` | Custom | Uses ChatDialog from react-ui-chat                        |

### Observations

1. **Shell panel dialogs** (SpaceDialog, IdentityDialog, JoinDialog) all delegate layout to internal Panel components. These panels manage their own structure inside Dialog.Content, bypassing Dialog.Body/Header. This may be intentional (panels are reusable outside dialogs) but means they lack standard gutter alignment.

2. **Search-style dialogs** (SearchDialog, CommandsDialogContent) have full-bleed SearchList content. CommandsDialogContent correctly uses Dialog.Body; SearchDialog does not and handles its own max-height overflow.

3. **Form dialogs** (CreateSpaceDialog) use Form.Viewport directly in Dialog.Content, skipping Dialog.Body. This is safe because `--gutter-offset` is set by Column.Content (not Column.Root), so Form.Viewport's ScrollArea.Root sees `--gutter-offset` defaulting to `0px` and applies no negative margin. These dialogs should still be updated to use Dialog.Body for consistency, but they won't break.

4. **AlertDialog.Body uses Column.Viewport** (ScrollArea), while **Dialog.Body uses Column.Content** (non-scrolling). This inconsistency should be resolved — AlertDialog.Body should likely also use Column.Content so that child components can bring their own scroll.

## Completed Work

### Column.Content primitive ✅

- New `Column.Content` component using CSS subgrid
- `Column.Root` JSDoc updated to document three child types (Row, Content, Viewport)
- `ColumnContentProps` exported from `@dxos/react-ui`
- Column stories added (WithContent, ContentWithScrollArea)

### Dialog standardization ✅

- `Dialog.Viewport` removed (no consumers)
- `Dialog.Body` delegates to `Column.Content`
- Dialog stories updated (DefaultStory, ScrollingStory)
- All dialog stories use consistent `Root > Overlay > Content` wrapping (no Portal)

### AlertDialog unified with Dialog ✅

- AlertDialog shares Header, Body, ActionBar, CloseIconButton with Dialog
- AlertDialog.Content normalized to `gutter='sm'`
- AlertDialog.Body changed from Column.Viewport (scroll) to Column.Content (subgrid)

### Consumer migrations ✅

All dialogs updated to standard `Dialog.Content > Dialog.Header > Dialog.Body` structure:

1. CreateSpaceDialog — wrapped Form.Root in Dialog.Body ✅
2. SearchDialog — added Header and Body ✅
3. ShortcutsDialogContent — replaced custom flex layout with Header and Body ✅
4. DeploymentDialog — restructured to use Header, Body, ActionBar ✅
5. SpaceDialog — wrapped SpacePanel in Dialog.Body ✅
6. IdentityDialog — wrapped IdentityPanel in Dialog.Body ✅
7. JoinDialog (plugin-space) — wrapped JoinPanel in Dialog.Body ✅
8. JoinDialog (plugin-client) — wrapped JoinPanel in Dialog.Body ✅
9. plugin-client ResetDialog — already correct (ConfirmReset uses Dialog.Body internally) ✅

### SearchList subgrid propagation ✅

- SearchList.Content propagates subgrid when inside a Column context
- SearchList.Viewport now passes `padding` for gutter alignment

## Remaining Work

### Storybook verification

Visually verify all migrated dialogs in storybook:

- Gutter alignment for non-scrolling content in Dialog.Body
- ScrollArea full width with correct gutter padding on Viewport
- Height constraint and scrolling behavior
- AlertDialog stories with the aligned Body implementation

### Form subgrid propagation

Form currently doesn't propagate the subgrid in Column context.
If Form is used inside Dialog.Body, Form.Viewport (ScrollArea) needs to
span full width. This may require the same subgrid propagation pattern
applied to SearchList.Content.

### Card alignment

Card has no Body equivalent. Consider adding Card.Body using Column.Content
for cards that need scrollable or guttered content areas.
