# Column Composition

## Background

`Column` is a primitive that establishes a 3-column CSS grid (left gutter, center content, right gutter)
by setting the `--gutter` CSS variable and inline `gridTemplateColumns`.

Multiple components use `Column` to establish their grid:

- `Dialog.Content` and `Card.Root` wrap children in `Column.Root`.
- `ScrollArea` sits inside `Column.Bleed` to span full width (scrollbar in gutter track).
- Form inputs and text sit inside `Column.Center` for guttered alignment.

## Column Primitives

| Sub-component     | CSS                                 | Purpose                                                                             |
| :---------------- | :---------------------------------- | :---------------------------------------------------------------------------------- |
| **Column.Root**   | `grid`, sets `--gutter` + template  | Creates the 3-column grid. Gutter sizes: `xs`, `sm`, `md`, `lg`.                    |
| **Column.Row**    | `col-span-3 grid grid-cols-subgrid` | 3-slot subgrid row: [icon/slot] [content] [icon/action].                            |
| **Column.Center** | `col-start-2 col-span-1 min-h-0`    | Places element in center column. No subgrid — safe for `display: contents`.         |
| **Column.Bleed**  | `col-span-full min-h-0`             | Spans all 3 columns gutter-to-gutter. For ScrollArea, dividers, full-width content. |

### Usage pattern

```
Column.Root (gutter='md')
├── Column.Row center        — header / footer bars
├── Column.Center            — form fields, text, centered content
├── Column.Bleed asChild     — ScrollArea.Root (scrollbar sits in gutter track)
│   └── ScrollArea.Viewport  — scrollable content with padding
└── Column.Row center        — action bar
```

### Design history

An earlier approach used `Column.Content` (CSS subgrid) and `Column.Viewport` (ScrollArea wrapper).
The subgrid approach was abandoned because:

1. Height-constrained layouts required `overflow-hidden`.
2. `overflow-hidden` clips negative margins needed for ScrollArea breakout.
3. CSS doesn't allow mixed overflow (`overflow-y: hidden` + `overflow-x: visible`).

The current Bleed/Center model is simpler: gutters come from grid columns, so there's nothing to break out of.

## Component Integration

### Dialog

Dialog.Content wraps children in `Column.Root` with `gutter='sm'`.

| Dialog sub-component | Column primitive    | Mechanism                               |
| :------------------- | :------------------ | :-------------------------------------- |
| Dialog.Content       | Column.Root         | Establishes 3-col grid, sets `--gutter` |
| Dialog.Header        | Column.Row (center) | Title + close button in center          |
| Dialog.Body          | Column.Bleed        | Full-width; children manage own layout  |
| Dialog.ActionBar     | Column.Row (center) | Action buttons in center                |

**AlertDialog** shares Dialog.Header, Dialog.Body, Dialog.ActionBar, and Dialog.CloseIconButton.
AlertDialog.Content uses its own Radix primitive but also wraps in `Column.Root` with `gutter='sm'`.

### Card

Card.Root wraps children in `Column.Root` (gutter varies by density: `lg` for coarse, `md` otherwise).

| Card sub-component | Column primitive | Notes                        |
| :----------------- | :--------------- | :--------------------------- |
| Card.Root          | Column.Root      | Establishes grid             |
| Card.Row           | Column.Row       | 3-slot row with icon support |
| (other)            | —                | Styled within Root's grid    |

Card has no Body equivalent — no scrollable content wrapper.

### Form

Form does NOT directly use Column primitives.

- **Form.Viewport** — wraps `ScrollArea.Root` (vertical, centered, padding, thin). When inside Dialog.Body (Column.Bleed), ScrollArea spans full width naturally.
- **Form.Content** — flex column (`flex flex-col w-full`). No Column dependency.

### SearchList

SearchList does NOT directly use Column primitives.

- **SearchList.Content** — layout-neutral `dx-expander` wrapper. Optional.
- **SearchList.Viewport** — wraps `ScrollArea.Root` (role='listbox', thin, padding).

When hosting SearchList inside a Dialog, consumers should skip SearchList.Content and place
Input and Viewport directly with `Column.Center` / `Column.Bleed`:

```
Dialog.Content (Column.Root)
  Dialog.Header (Column.Row)
  Dialog.Body (Column.Bleed) — or use Column.Center/Bleed directly:
    Column.Center → SearchList.Input
    Column.Bleed  → SearchList.Viewport
```

## Dialog Consumer Audit

### Standard structure (uses Dialog.Body)

| File                                         | Type        | Body content                        |
| :------------------------------------------- | :---------- | :---------------------------------- |
| `devtools/.../DialogRestoreSpace.tsx`        | Dialog      | Paragraph text + FileUploader       |
| `plugin-space/.../CreateObjectDialog.tsx`    | Dialog      | CreateObjectPanel (Form/SearchList) |
| `plugin-space/.../CreateSpaceDialog.tsx`     | Dialog      | Form.Root                           |
| `plugin-space/.../JoinDialog.tsx`            | Dialog      | JoinPanel                           |
| `plugin-client/.../JoinDialog.tsx`           | Dialog      | JoinPanel                           |
| `plugin-client/.../ResetDialog.tsx`          | Dialog      | ConfirmReset step                   |
| `plugin-client/.../RecoveryCodeDialog.tsx`   | AlertDialog | Checkboxes, code grid, inputs       |
| `plugin-help/.../ShortcutsDialogContent.tsx` | Dialog      | ShortcutsList                       |
| `plugin-script/.../DeploymentDialog.tsx`     | Dialog      | Text, list items, buttons           |
| `plugin-outliner/.../QuickEntryDialog.tsx`   | Dialog      | Quick entry form                    |
| `plugin-registry/.../LoadPluginDialog.tsx`   | Dialog      | Plugin load form                    |
| `composer-app/.../AboutDialog.tsx`           | Dialog      | Version info (Column.Center)        |
| `composer-app/.../ResetDialog.tsx`           | AlertDialog | Error display, IconButtons          |
| `shell/.../ConfirmReset.tsx`                 | Dialog      | Message, TextInput, checkboxes      |
| `shell/.../JoinDialog.tsx`                   | AlertDialog | JoinPanel                           |
| `shell/.../StatusDialog.tsx`                 | AlertDialog | StatusPanel                         |

### Advanced layout (Column.Center/Bleed directly, no Dialog.Body)

| File                                           | Pattern                      | Why                                                          |
| :--------------------------------------------- | :--------------------------- | :----------------------------------------------------------- |
| `plugin-search/.../SearchDialog.tsx`           | Column.Center + Column.Bleed | SearchList.Input and Viewport need separate column placement |
| `plugin-navtree/.../CommandsDialogContent.tsx` | Column.Center + Column.Bleed | Same — search input centered, results full-width             |

### Custom layout (panel-managed)

| File                                  | Notes                                          |
| :------------------------------------ | :--------------------------------------------- |
| `plugin-deck/.../Dialog.tsx`          | Wrapper/layout component                       |
| `plugin-simple-layout/.../Dialog.tsx` | Wrapper/layout component                       |
| `shell/.../SpaceDialog.tsx`           | Panel manages own layout inside Dialog.Content |
| `shell/.../IdentityDialog.tsx`        | Panel manages own layout inside Dialog.Content |

## Known Issues

1. **Dialog story comment is wrong**: `Dialog.stories.tsx` line 27 says "Dialog.Body delegates to Column.Center" — it actually delegates to `Column.Bleed`.

2. **Column story TODO**: `Column.stories.tsx` line 13 has `TODO(burdon): Content is clipped!` — the `List` component renders `ScrollArea.Root centered` directly inside Column.Root without Column.Bleed, which may cause clipping.

## Potential Future Work

- **Card.Body**: Card has no Body equivalent. If cards need scrollable or guttered content areas, consider adding `Card.Body` using `Column.Bleed` or `Column.Center`.
- **Form in Dialog**: Form.Viewport (ScrollArea) works inside Dialog.Body (Column.Bleed) because Column.Bleed spans full width. No special integration needed. But if Form.Content needs guttered alignment without scroll, it would need to be placed in a Column.Center explicitly.
