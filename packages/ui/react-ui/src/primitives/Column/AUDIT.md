# Column architecture reference

## Background

`Column` establishes a 3-column CSS grid with left/right gutter columns and a center content
channel. Two CSS custom properties drive the system:

- `--gutter` — the gutter track width (e.g. `var(--dx-gutter-md)`); consumed by `ScrollArea.Viewport` for padding.
- `--dx-col` — the grid-column placement token; set by `Column.Root` and consumed by `withColumn` utilities.

## Column primitives

### Column.Root

```css
/* column.ts — columnRoot */
dx-column grid
/* inline style */
--gutter: <gutterSize>
--dx-col: 2 / span 1
grid-template-columns: <gutter> minmax(0,1fr) <gutter>
```

Sets the 3-column grid and both CSS variables. All `withColumn` utilities are no-ops outside this context.

### Column.Center

```css
/* column.ts — columnCenter */
[grid-column:var(--dx-col,auto)] min-h-0
```

Places a single element in col 2 (the center track). Does not use subgrid — placement is explicit
on this element only, so arbitrary compound components (including `display: contents` wrappers) can
be nested safely.

### Column.Bleed

```css
/* column.ts — columnBleed */
col-span-full grid grid-cols-subgrid min-h-0
```

Spans all 3 columns and propagates the subgrid. Use for `ScrollArea`, full-width dividers, and
any content that should ignore the gutters.

### Column.Row

```css
/* column.ts — columnRow */
col-span-3 grid grid-cols-subgrid
```

Three-slot icon row. Children map to: `[col-1: icon/slot] [col-2: content] [col-3: icon/action]`.
Must be a direct child of `Column.Root`.

## withColumn theme utilities

Exported from `@dxos/ui-theme`. Components import and call these in their theme functions to
participate in the Column grid without importing Column React components.

```ts
withColumn.center()
// → '[grid-column:var(--dx-col,auto)]'

withColumn.propagate()
// → '[.dx-column_&]:col-span-full [.dx-column_&]:grid [.dx-column_&]:grid-cols-subgrid'

withColumn.consumed()
// → '[--dx-col:auto]'
```

| Utility | Purpose | Where used |
| :--- | :--- | :--- |
| `center()` | Place element in col 2 via `--dx-col`. No-op outside Column or inside ScrollArea. | Dialog.Header, Dialog.ActionBar, Form.Content, Form.Actions, SearchList.Input |
| `propagate()` | Extend Column subgrid to children. No-op outside Column. | Dialog.Body, SearchList.Content |
| `consumed()` | Reset `--dx-col` after `--gutter` is consumed. | ScrollArea.Viewport |

## CSS custom property cascade

```text
Column.Root
  sets --gutter = var(--dx-gutter-<size>)
  sets --dx-col = 2 / span 1
    │
    ├─ Column.Center        → grid-column: var(--dx-col)   ← consumes --dx-col
    ├─ Column.Bleed         → col-span-full, subgrid
    ├─ Column.Row           → col-span-3, subgrid
    │
    └─ withColumn.center()  → grid-column: var(--dx-col)   ← consumes --dx-col
       withColumn.propagate() → col-span-full, grid, subgrid (inside .dx-column only)
         │
         └─ ScrollArea.Root → col-span-full (inside .dx-column only)
              ScrollArea.Viewport
                applies pl/pr using --gutter
                withColumn.consumed() → sets --dx-col: auto
                  │
                  └─ (nested components no longer auto-position)
```

## Component integration

### Dialog

| Sub-component | withColumn applied | Effect |
| :--- | :--- | :--- |
| `Dialog.Content` | `Column.Root` (gutter `'sm'`) | Establishes the 3-col grid. |
| `Dialog.Header` | `withColumn.center()` | Placed in col 2. |
| `Dialog.Body` | `withColumn.propagate()` | Children inherit the subgrid. |
| `Dialog.ActionBar` | `withColumn.center()` | Placed in col 2. |

### Form

| Sub-component | withColumn applied | Effect |
| :--- | :--- | :--- |
| `Form.Content` | `withColumn.center()` | Placed in col 2 when inside Column. |
| `Form.Actions` | `withColumn.center()` | Placed in col 2 when inside Column. |

### SearchList

| Sub-component | withColumn applied | Effect |
| :--- | :--- | :--- |
| `SearchList.Content` | `withColumn.propagate()` | Extends subgrid to children when inside Column. |
| `SearchList.Input` wrapper | `withColumn.center()` | Input row placed in col 2. |

### Card

`Card.Row` uses its own inline subgrid CSS (`col-span-3 grid grid-cols-subgrid`) and does not
participate in an outer Column grid. `Card.Root` establishes a separate 3-column grid for its
own icon-slot layout.

## Subgrid chain integrity

Every intermediate container between `Column.Root` and a `ScrollArea.Root` must propagate the
subgrid, otherwise `ScrollArea.Root`'s `[.dx-column_&]:col-span-full` selector will not match
and the scrollbar will not extend to the gutter.

Required chain:

```
Column.Root (.dx-column)
  → withColumn.propagate() container   (col-span-full, grid, grid-cols-subgrid)
    → ScrollArea.Root                  (.dx-container, [.dx-column_&]:col-span-full)
      → ScrollArea.Viewport            (applies --gutter padding, resets --dx-col)
```

If any intermediate element wraps the ScrollArea without propagating, use `Column.Bleed` or
apply `withColumn.propagate()` to that wrapper.
