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

1. **Column.Content owns gutter compensation.** `Column.Root` sets `--gutter` and establishes the grid. `Column.Content` sets `--gutter-offset` and applies gutter padding. The offset signal lives on Column.Content (not Column.Root) because only Column.Content applies the padding that ScrollArea needs to compensate for. This ensures ScrollAreas directly inside Column.Root (without a Column.Content wrapper) are unaffected.
2. **Leaves own scrolling.** Components that need to scroll (Form, SearchList) provide their own Viewport. Components that don't need to scroll do nothing.
3. **No double padding.** When a child Viewport exists inside a guttered container, it must break out of the container's padding and apply its own (asymmetric, to account for scrollbar width).
4. **No React context needed.** CSS custom properties cascade naturally and can be reset at any node.

## Proposed Solution: `--gutter-offset` CSS variable + `Column.Content`

### Mechanism

`Column.Content` sets `--gutter-offset` alongside its gutter padding. `ScrollArea.Root` compensates and resets. `Column.Root` only sets `--gutter` (unchanged).

Direct children of `Column.Root` participate in the grid in one of three ways:

- **Column.Row** — uses subgrid; gutters via grid columns.
- **Column.Content** — spans full width; re-applies gutters as padding.
- **Column.Viewport** — spans full width; delegates gutters to ScrollArea.

```css
/* Column.Content — full-width content area with gutter padding and offset signal */
.column-content {
  col-span-full;
  padding-inline: var(--gutter);
  --gutter-offset: var(--gutter);
  display: flex;
  flex-direction: column;
}

/* ScrollArea.Root — breaks out of parent gutter padding, resets for descendants */
.scroll-area-root {
  margin-inline: calc(var(--gutter-offset, 0px) * -1);
  --gutter-offset: 0px;
}
```

### How it works

- **Column.Content sets `--gutter-offset`** to the value of `--gutter` and applies `px-[var(--gutter)]` padding. This signals to ScrollArea descendants: "I've added gutter padding; compensate for it." `Dialog.Body` and similar components delegate to `Column.Content`.
- **ScrollArea.Root reads `--gutter-offset`** and applies negative inline margin to break out of the body's padding. It then resets `--gutter-offset: 0px` so nested ScrollAreas don't double-negate.
- **ScrollArea.Viewport** continues to apply its own asymmetric padding (`pl-[var(--gutter)]`, `pr-[calc(var(--gutter)-scrollbar)]`) as it does today.
- **Non-scrolling content** inherits `Column.Content`'s `px-[var(--gutter)]` padding and is correctly aligned with no extra work from the leaf.
- **Standalone usage** (no Column.Content ancestor): `--gutter-offset` is undefined, defaults to `0px`, so no margin is applied. ScrollArea works exactly as today. This includes ScrollAreas directly inside Column.Root (without a Column.Content wrapper) — they are unaffected.

### Example: CreateObjectDialog after the change

```
Dialog.Content (Column.Root, --gutter: var(--dx-gutter-sm))
  Dialog.Header (Column.Row)
  Dialog.Body → Column.Content (col-span-full, px: var(--gutter), --gutter-offset: var(--gutter))
    CreateObjectPanel:
      Path A: SearchList.Viewport (ScrollArea.Root mx: -gutter-offset, resets to 0)
                → ScrollArea.Viewport (applies own pl/pr with scrollbar offset)
                → content correctly aligned ✓
      Path B: (same as A) ✓
      Path C: Form.Viewport (ScrollArea.Root mx: -gutter-offset, resets to 0)
                → ScrollArea.Viewport (applies own pl/pr with scrollbar offset)
                → Form.Content correctly aligned ✓
      Path D: <plain text> — gets Column.Content's px-[var(--gutter)] for free ✓
```

### Changes required

| File                                           | Change                                                                                                |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `ui-theme/src/theme/primitives/column.ts`      | New `columnContent`: `col-span-full px-[var(--gutter)] [--gutter-offset:var(--gutter)] flex flex-col` |
| `react-ui/src/primitives/Column/Column.tsx`    | New `Column.Content` component using `column.content` theme                                           |
| `ui-theme/src/theme/components/scroll-area.ts` | `scrollAreaRoot`: add `mx-[calc(var(--gutter-offset,0px)*-1)]` and `[--gutter-offset:0px]`            |
| `react-ui/src/components/Dialog/Dialog.tsx`    | `Dialog.Body` wraps or delegates to `Column.Content`                                                  |

### What does NOT change

- `Column.Root`, `Column.Row`, `Column.Viewport` — unchanged.
- `Form.Viewport`, `SearchList.Viewport`, `Settings.Root` — unchanged. ScrollArea.Root handles the breakout automatically via theme.
- `--gutter` variable — unchanged. Still set by `Column.Root`, consumed by `ScrollArea.Viewport`.
- Any existing consumer that uses `Dialog.Viewport` directly for simple content — still works (ScrollArea inside Dialog.Body breaks out correctly).

### Edge cases

| Scenario                                      | Behavior                                                                                |
| :-------------------------------------------- | :-------------------------------------------------------------------------------------- |
| Nested ScrollAreas (ScrollArea in ScrollArea) | Inner ScrollArea sees `--gutter-offset: 0px` (reset by outer), no double-negation.      |
| Form standalone (not in Dialog)               | No `--gutter-offset` set, defaults to `0px`. Form.Viewport works exactly as today.      |
| ScrollArea directly in Column.Root (no Body)  | No `--gutter-offset` set (it's on Column.Content, not Root), defaults to `0px`. Safe.   |
| Dialog with only simple text in Body          | Text gets `Column.Content`'s `px-[var(--gutter)]`. Correctly aligned, no scroll needed. |
| Card with scrollable content                  | Card gains a Body via `Column.Content` — same pattern, no Card-specific code needed.    |

### Naming rationale

`Column.Content` (not `Column.Body`) follows Radix conventions where `Content` is the standard name for the main content container. `Column.Body` was considered but `Body` is an HTML term, not a component convention.

Dialog sub-components each delegate to a Column primitive:

| Dialog sub-component | Column primitive | Gutter mechanism                                |
| :------------------- | :--------------- | :---------------------------------------------- |
| Dialog.Content       | Column.Root      | Establishes the 3-col grid and sets `--gutter`  |
| Dialog.Header        | Column.Row       | Gutters via grid columns (subgrid)              |
| Dialog.Body          | Column.Content   | Gutters via `px-[var(--gutter)]` padding        |
| Dialog.ActionBar     | Column.Row       | Gutters via grid columns (subgrid)              |
| Dialog.Viewport      | Column.Viewport  | Gutters via ScrollArea padding (**deprecated**) |

`Dialog.Content` and `Dialog.Body` are both necessary:

- `Dialog.Content` wraps Radix `DialogPrimitive.Content` and creates `Column.Root` (the grid container). Adding padding here would double gutters for `Column.Row` children.
- `Dialog.Body` is the content area between Header and ActionBar, delegating to `Column.Content` for gutter padding.

Note: `AlertDialog.Body` currently uses `Column.Viewport` (ScrollArea), not `Column.Content`.
This is inconsistent with `Dialog.Body` and may need alignment in a future pass.

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

## Refactoring Plan

### Phase 1: Unify Dialog and AlertDialog internals (done partially)

Dialog and AlertDialog share the same theme keys (`dialog.*`), the same Column primitives,
and the same structural pattern. The only fundamental difference is the Radix primitive:
`@radix-ui/react-alert-dialog` forces explicit user action (no click-outside dismiss, no Escape).

| Aspect           | Dialog                   | AlertDialog               | Difference                     |
| :--------------- | :----------------------- | :------------------------ | :----------------------------- |
| Radix base       | `react-dialog`           | `react-alert-dialog`      | Accessibility semantics        |
| Dismissal        | Click-outside, Escape, Close | Must choose Cancel/Action | Fundamental                |
| Content gutter   | `gutter='sm'`            | `gutter='md'` (default)   | Drift, not intentional         |
| Header           | Column.Row (center)      | Missing                   | Drift                          |
| Body             | Column.Content           | Column.Viewport (scroll)  | Inconsistent, should align     |
| ActionBar        | Column.Row (center)      | Column.Row (center)       | Identical                      |
| Title/Description| Radix primitive          | Radix primitive            | Same theme                     |

**Approach: shared internals, two exports.**

Extract shared sub-components into a common module. Dialog and AlertDialog become thin
wrappers that wire up the correct Radix primitive and dismissal API.

#### Step 1: Align AlertDialog.Body with Dialog.Body

Change AlertDialog.Body from `Column.Viewport` to `Column.Content`.
AlertDialog consumers that need scrolling should bring their own Viewport
(same principle as Dialog).

#### Step 2: Add Header to AlertDialog

AlertDialog.Header = Column.Row (center), same as Dialog.Header.
Existing AlertDialogs that put Title directly in Content should be updated.

#### Step 3: Normalize gutter size

Both Dialog.Content and AlertDialog.Content should use `gutter='sm'`.
The current AlertDialog default of `'md'` appears to be drift, not intentional.

#### Step 4: Extract shared sub-components

Create a shared internal module (e.g., `DialogParts`) with:
- `DialogContentInner` — Column.Root wrapper (parameterized by Radix Content primitive)
- `DialogHeader` — Column.Row (center)
- `DialogBody` — Column.Content
- `DialogTitle` / `DialogDescription` — parameterized by Radix primitive
- `DialogActionBar` — Column.Row (center)
- `DialogOverlay` — OverlayLayoutProvider wrapper

Dialog and AlertDialog re-export these, adding only their unique parts:
- Dialog: Close, CloseIconButton
- AlertDialog: Cancel, Action

#### Step 5: Migrate consumers

Update dialogs that skip Dialog.Body to use the standard structure.
Priority order (by impact):

1. **CreateSpaceDialog** — wrap Form in Dialog.Body (has Header, just missing Body)
2. **SearchDialog** — add Header and Body (SearchList.Viewport handles scroll)
3. **ShortcutsDialogContent** — add Header and Body
4. **DeploymentDialog** — restructure to use Header, Body, ActionBar
5. **Shell panel dialogs** (SpaceDialog, IdentityDialog, JoinDialog) — these delegate to
   Panel components; consider whether panels should use Column.Content internally
   or whether the dialog wrapper should provide Dialog.Body around them

### Phase 1b: Standardize Dialog in current branch

Cleanup and documentation to ship alongside the `Column.Content` + `--gutter-offset` changes.

#### Step 1: Remove `Dialog.Viewport`

No consumers remain. Remove the deprecated alias from `Dialog.tsx` entirely.

#### Step 2: Update Dialog stories

The current Default story uses `Dialog.Body asChild` wrapping a raw `ScrollArea.Root`.
Replace with two clear patterns:

- **Simple**: non-scrolling content in `Dialog.Body` (demonstrates gutter padding).
- **Scrolling**: a child component with its own Viewport inside `Dialog.Body`
  (demonstrates the `--gutter-offset` breakout — ScrollArea breaks out of Body padding,
  applies its own asymmetric padding).

#### Step 3: Update Column stories

Add stories for `Column.Content` showing:
- Non-scrolling content with gutter padding.
- Nested ScrollArea that breaks out via `--gutter-offset`.
- Column.Row alongside Column.Content for visual comparison.

#### Step 4: Update Column.Root JSDoc

Current doc says "Direct children must use Column.Row or Column.Viewport."
Update to list all three child types:

- **Column.Row** — 3-col subgrid row (icons + content + actions).
- **Column.Content** — full-width content area with gutter padding.
- **Column.Viewport** — full-width scrollable area (delegates gutters to ScrollArea).

#### Step 5: Verify exports

Ensure `ColumnContentProps` is accessible from the `@dxos/react-ui` package barrel
for consumers that build their own Body-like wrappers.

### Phase 2: Unify Dialog and AlertDialog internals

Steps 1–5 from Phase 1 above (align AlertDialog.Body, add Header, normalize gutter,
extract shared module, migrate consumers).

### Phase 3: Storybook verification

Add or update stories for each dialog variant to verify:
- Gutter alignment for non-scrolling content in Dialog.Body
- ScrollArea breakout (Form.Viewport, SearchList.Viewport inside Dialog.Body)
- Nested ScrollArea reset (no double-negation)
- AlertDialog with the aligned Body implementation
- Dialog without Body (backward compat — ScrollArea directly in Content still works)
