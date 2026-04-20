# Column Refactor: CSS Custom Property Cascade

## Summary

Refactor the Column primitive system so that all core UI components (Dialog, Form, Card, SearchList)
are automatically column-aware via CSS custom properties and theme utilities. Remove redundant props
and ensure consistent gutter alignment without manual wiring.

## Background

`Column` is the core layout primitive for vertically-aligned component layouts (Dialog, Form, Card).
It establishes a 3-column CSS grid — left gutter, center content, right gutter — via the `--gutter`
CSS variable.

### Current problems

1. **Dialog.Body uses Column.Center**, which constrains children to the center column. When a Form or
   SearchList is placed inside Dialog.Body, their ScrollArea (Viewport) can't bleed to full width for
   proper scrollbar placement.

2. **Column.Row `center` duplicates Column.Center**. When `center` is true, Column.Row drops its
   subgrid and produces identical CSS to Column.Center (`col-start-2 col-span-1`).

3. **Non-viewport components are not column-aware**. Form.Content, SearchList.Input, and Form.Actions
   have no Column detection. Consumers must manually wrap them in Column.Center when used inside a
   Column grid.

4. **ScrollArea auto-bleeds but nothing auto-centers**. ScrollArea.Root detects Column context
   (via `.dx-column` marker) and applies `col-span-full`. But there is no equivalent mechanism for
   components that should center themselves.

### How gutter alignment works today

- `Column.Root` sets `--gutter` as an inline CSS variable and adds the `dx-column` marker class.
- `ScrollArea.Root` detects `dx-column` and applies `[.dx-column_&]:col-span-full` (auto-bleed).
- `ScrollArea.Viewport` consumes `--gutter` via `pl-[var(--gutter,...)]` / `pr-[calc(var(--gutter,...)-var(--scroll-width))]`.
- `Form.Viewport` and `SearchList.Viewport` wrap ScrollArea, so they inherit this behavior.
- Non-viewport components (Form.Content, SearchList.Input) have no Column awareness.

## Design

### CSS custom property cascade

Column.Root sets a new CSS custom property `--dx-col` alongside the existing `--gutter`.
Components consume `--dx-col` for grid placement. ScrollArea.Viewport resets it after consuming `--gutter`.

```
Column.Root
│  sets --gutter: <size>
│  sets --dx-col: 2 / span 1
│
├── Non-viewport component (Form.Content, SearchList.Input)
│   applies: grid-column: var(--dx-col, auto)
│   result: centers in column 2
│
├── ScrollArea.Root
│   applies: col-span-full (via dx-column detection, existing)
│   └── ScrollArea.Viewport
│       consumes: --gutter for padding (existing)
│       resets: --dx-col: auto
│       │
│       └── Nested component (Form.Content inside Form.Viewport)
│           applies: grid-column: var(--dx-col, auto)
│           result: auto — no grid placement, gutter already handled by ScrollArea
```

### Subgrid propagation

For `--dx-col` grid placement to work, a component must be a CSS grid item (direct child of a grid
container). Intermediate containers (Dialog.Body, etc.) must propagate the Column grid via CSS subgrid
so their children remain grid items:

```css
col-span-full grid grid-cols-subgrid
```

This was previously rejected when it was combined with padding-based gutters (overflow-hidden clipped
negative margins). With the current approach (grid columns for gutters, no padding breakout), subgrid
propagation has no overflow issues.

### Theme utilities (`withColumn`)

The theme provides reusable utilities that components apply in their theme functions.
Individual components never import Column or think about Column mechanics.

```ts
// In ui-theme column.ts
withColumn = {
  /** Centers element in the Column grid via --dx-col. No-op outside Column or inside ScrollArea. */
  center: () => '[grid-column:var(--dx-col,auto)]',

  /** Propagates the Column grid to children via subgrid. No-op outside Column. */
  propagate: () => '[.dx-column_&]:col-span-full [.dx-column_&]:grid [.dx-column_&]:grid-cols-subgrid',

  /** Resets --dx-col after consuming --gutter. Applied by ScrollArea.Viewport. */
  consumed: () => '[--dx-col:auto]',
}
```

Usage in component theme functions:

```ts
// form.ts
const formContent = (_, ...etc) => mx(withColumn.center(), 'flex flex-col w-full pb-form-gap', ...etc);

// search-list.ts
const searchListInput = (_, ...etc) => mx(withColumn.center(), ...etc);

// scroll-area.ts (viewport)
const scrollAreaViewport = (...) => mx(withColumn.consumed(), ...existing...);

// dialog.ts (body)
const dialogBody = (_, ...etc) => mx(withColumn.propagate(), ...etc);
```

### Column primitives (simplified)

| Primitive          | CSS                                              | Purpose                                  |
| :----------------- | :----------------------------------------------- | :--------------------------------------- |
| **Column.Root**    | `grid`, sets `--gutter` + `--dx-col`             | 3-column grid container                  |
| **Column.Row**     | `col-span-full grid grid-cols-subgrid`           | 3-slot subgrid row (icon/content/action) |
| **Column.Center**  | `withColumn.center()` convenience wrapper        | Center column placement                  |
| **Column.Bleed**   | `withColumn.propagate()` convenience wrapper     | Full-width subgrid pass-through          |

Changes from current:
- **Column.Row** loses `center` and `fullWidth` props — always a 3-slot subgrid row.
- **Column.Center** becomes a thin wrapper over `withColumn.center()` (same behavior, cleaner internals).
- **Column.Bleed** changes from plain `col-span-full` to `col-span-full grid grid-cols-subgrid` (subgrid propagation).
- **Column.Root** sets `--dx-col: 2 / span 1` alongside `--gutter`.

### Consumer integration

#### Dialog

| Sub-component    | Current                | After                            |
| :--------------- | :--------------------- | :------------------------------- |
| Dialog.Content   | Column.Root            | Column.Root (unchanged)          |
| Dialog.Header    | Column.Row (center)    | withColumn.center() in theme     |
| Dialog.Body      | Column.Center          | withColumn.propagate() in theme  |
| Dialog.ActionBar | Column.Row (center)    | withColumn.center() in theme     |

#### Form

| Sub-component  | Current               | After                           |
| :------------- | :-------------------- | :------------------------------ |
| Form.Viewport  | ScrollArea (unchanged)| ScrollArea (unchanged)          |
| Form.Content   | No Column awareness   | withColumn.center() in theme    |
| Form.Actions   | No Column awareness   | withColumn.center() in theme    |

#### SearchList

| Sub-component      | Current               | After                        |
| :----------------- | :-------------------- | :--------------------------- |
| SearchList.Viewport| ScrollArea (unchanged)| ScrollArea (unchanged)       |
| SearchList.Input   | No Column awareness   | withColumn.center() in theme |

#### Card

| Sub-component | Current     | After                             |
| :------------ | :---------- | :-------------------------------- |
| Card.Root     | Column.Root | Column.Root (unchanged)           |
| Card.Row      | Column.Row  | Own subgrid CSS (no Column.Row)   |

#### ScrollArea

| Sub-component      | Current                           | After                                      |
| :----------------- | :-------------------------------- | :----------------------------------------- |
| ScrollArea.Root    | `[.dx-column_&]:col-span-full`   | Unchanged                                  |
| ScrollArea.Viewport| Consumes `--gutter` for padding  | Also applies `withColumn.consumed()` to reset `--dx-col` |

### Example: Form inside Dialog (no scroll)

```
Dialog.Content = Column.Root (--gutter: sm, --dx-col: 2/span 1, grid: 16px|1fr|16px)
  Dialog.Header (grid-column: var(--dx-col) → col 2 ✓)
  Dialog.Body (col-span-full, subgrid → passes 3-col grid to children)
    Form.Content (grid-column: var(--dx-col) → col 2 ✓)
    Form.Actions (grid-column: var(--dx-col) → col 2 ✓)
  Dialog.ActionBar (grid-column: var(--dx-col) → col 2 ✓)
```

### Example: Form inside Dialog (with scroll)

```
Dialog.Content = Column.Root (--gutter: sm, --dx-col: 2/span 1)
  Dialog.Header (grid-column: var(--dx-col) → col 2 ✓)
  Dialog.Body (col-span-full, subgrid)
    Form.Viewport = ScrollArea.Root (col-span-full ✓)
      ScrollArea.Viewport (padding via --gutter, resets --dx-col: auto)
        Form.Content (grid-column: auto → no grid placement ✓)
    Form.Actions (grid-column: var(--dx-col) → col 2 ✓)
  Dialog.ActionBar (grid-column: var(--dx-col) → col 2 ✓)
```

### Example: SearchList inside Dialog

```
Dialog.Content = Column.Root (--gutter: sm, --dx-col: 2/span 1)
  Dialog.Header (grid-column: var(--dx-col) → col 2 ✓)
  Dialog.Body (col-span-full, subgrid)
    SearchList.Input (grid-column: var(--dx-col) → col 2 ✓)
    SearchList.Viewport = ScrollArea.Root (col-span-full ✓)
      ScrollArea.Viewport (padding via --gutter, resets --dx-col: auto)
        SearchList.Item... (inside scroll, no grid placement ✓)
  Dialog.ActionBar (grid-column: var(--dx-col) → col 2 ✓)
```

### Subgrid chain integrity

For subgrid propagation to work, every intermediate DOM element between Column.Root and the
target component must either:

1. Apply `withColumn.propagate()` (col-span-full + subgrid), or
2. Use `display: contents` to become grid-transparent.

Components that are pure React context providers with a wrapping `<div>` (e.g., Form.Root)
must apply `withColumn.propagate()` in their theme so the subgrid chain is not broken.
Similarly, optional wrapper components like SearchList.Content (`dx-expander`) must propagate
when inside a Column context.

The `[.dx-column_&]` prefix ensures these styles only apply inside a Column — outside Column,
these components remain normal block/flex containers.

## Migration

### Dialog consumers

All Dialog consumers using `Dialog.Body` continue to work — Body's internal change from
Column.Center to subgrid propagation is transparent. Consumers that manually use Column.Center
or Column.Bleed inside Dialog.Content should be reviewed but will likely still work since
Column.Center and Column.Bleed remain as convenience components.

### Column.Row center → Column.Center

All usages of `Column.Row center` must be migrated to `Column.Center` (or to elements that
apply `withColumn.center()` via their theme).

Known usages:
- Dialog.Header → theme uses `withColumn.center()`
- Dialog.ActionBar → theme uses `withColumn.center()`
- Column stories → update to use Column.Center
- Card.Row → remains as Column.Row (uses the 3-slot subgrid, never used `center`)

### Storybook verification

Visually verify after migration:
- Dialog with Form (scrolling and non-scrolling variants)
- Dialog with SearchList
- Card layout with icon rows
- Column stories (Default, WithCenter, WithBleed, WithScrollArea)

## Known issues to fix

1. **Dialog story comment is wrong**: `Dialog.stories.tsx` line 27 says "Dialog.Body delegates to
   Column.Center" — needs updating to reflect the new propagation behavior.

2. **Column story TODO**: `Column.stories.tsx` line 13 has `TODO(burdon): Content is clipped!` —
   the `List` component renders ScrollArea.Root without Column.Bleed wrapper. After this refactor,
   ScrollArea auto-bleeds so this should resolve itself.
