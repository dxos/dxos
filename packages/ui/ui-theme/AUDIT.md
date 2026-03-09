# Tailwind Token audit

## Tasks

The following tasks apply to the entire codebase.
For all results lists, add one line per item and keep the list sorted alphabetically.
Update this document with the results of the following tasks:

## Phase 1

- [x] Find invalid tailwind classes (e.g., any camelCase classes)
- [x] Compile list of used and unused custom utility classes from our theme
- [x] Compile list of used and unused component classes from our theme
- [x] Compile list of unused fragment (exported consts and functions in `ui-theme/src/theme/fragments`)
- [x] Add -dx prefix to :root spacing.css styles.

## Phase 2

- [x] Audit the following react-ui components: Container, Dialog, Popover, Splitter, ScrollArea.
  - [x] Audit composibility and adherance to radix asChild slot pattern.
  - [x] Audit dx-expand and dx-container classes which deal with container/scrolling behavior.
  - [x] Recommend any changes that would make container/scrolling behavior more robust and easier to reason about.

## Phase 3

- [ ] Density audit.
- [ ] Semantic color audit.

## Results

### Invalid classes

### Utility classes

#### Used

- `dx-icon-inline`

#### Unused

None

### Component classes

#### Used (dx- prefix)

- `dx-attention-surface`
- `dx-button`
- `dx-checkbox`
- `dx-checkbox--switch`
- `dx-dialog__content`
- `dx-dialog__overlay`
- `dx-dialog__title`
- `dx-focus-ring`
- `dx-focus-ring-group`
- `dx-focus-ring-group-indicator`
- `dx-focus-ring-group-x`
- `dx-focus-ring-group-x-always`
- `dx-focus-ring-group-x-indicator`
- `dx-focus-ring-group-y`
- `dx-focus-ring-group-y-always`
- `dx-focus-ring-group-y-indicator`
- `dx-focus-ring-inset`
- `dx-focus-ring-inset-over-all`
- `dx-focus-ring-inset-over-all-always`
- `dx-focus-ring-main`
- `dx-link`
- `dx-main-bounce-layout`
- `dx-main-content-padding`
- `dx-main-content-padding-transitions`
- `dx-main-intrinsic-size`
- `dx-main-mobile-layout`
- `dx-main-overlay`
- `dx-main-sidebar`
- `dx-modal-surface`
- `dx-tag` (all variants)
- `dx-text`

#### Used (no dx- prefix)

- `dx-app-drag`
- `dx-app-no-drag`
- `dx-card-max-width`
- `dx-card-min-width`
- `dx-card-popover`
- `dx-card-square`
- `dx-contain-layout`
- `dx-article`
- `dx-density-coarse`
- `dx-size-container`
- `dx-sticky-bottom-from-statusbar-bottom`
- `dx-sticky-top-from-topbar-bottom`

#### Unused

- `dx-card-default-width`
- `dx-base-surface`
- `dx-focus-ring-always`
- `dx-focus-ring-group-always`
- `dx-focus-ring-inset-always`
- `dx-focus-ring-main-always`
- `dx-scrollbar-thin`
- `dx-sidebar-surface`

### Unused Fragments

None

---

### Phase 2: Component Audit

#### Overview

Audited five components: **Container**, **Dialog**, **Popover**, **Splitter**, **ScrollArea**.
Evaluated composability (Radix `asChild`/Slot pattern), usage of `dx-expand`/`dx-container`, and scroll containment robustness.

#### Class Definitions

```css
.dx-expand  { @apply flex-1 min-h-0 min-w-0; }
.dx-container { @apply flex-1 min-h-0 min-w-0 h-full w-full; }
```

- `dx-expand` — lightweight flex child that can shrink. Used by `Grid` (when `grow=true`) and `ScrollContainer`.
- `dx-container` — full-size flex child. Used by `ScrollArea.Root` (via theme) and directly in devtools panels, `Popover.Viewport` compositions.

#### Container

**Source:** `react-ui/src/primitives/Container/Container.tsx`
**Theme:** `ui-theme/src/theme/primitives/container.ts`

Sub-components: `Main`, `Column`, `Row`, `Segment`.

| Sub-component | asChild | Notes |
|---|---|---|
| Main    | No | Hardcoded `<div>`. Uses CSS grid with `gridTemplateRows` for toolbar/statusbar. |
| Column  | Yes | Uses `Slot`/`Primitive.div`. Applies 3-column grid via `--gutter` CSS var. Adds `dx-column` marker class for descendant detection. |
| Row     | Yes | Uses `Slot`/`Primitive.div`. Applies `col-span-3 grid-cols-subgrid`. |
| Segment | Yes | Uses `Slot`/`Primitive.div`. Has special branching: when `asChild`, merges `col-start-2` directly; otherwise wraps in `<div className='contents'>`. |

**Findings:**
- `Main` does not support `asChild`. This is acceptable since it is a top-level layout root (grid container with dynamic `gridTemplateRows`), so merging onto a child would be unusual.
- `Column` correctly adds the `dx-column` marker class, which `ScrollArea.Root` detects via `[.dx-column_&]:col-span-full` to span the full grid when nested inside a Column.
- `Segment` has a thoughtful `asChild` implementation — the `contents` wrapper for non-asChild mode preserves grid positioning without introducing layout side effects.
- No `dx-expand` or `dx-container` classes are applied by Container itself. It relies on CSS grid rather than flexbox, so these classes are not relevant here.

**Issues:** None.

#### Dialog

**Source:** `react-ui/src/components/Dialog/Dialog.tsx`
**Theme:** `ui-theme/src/theme/components/dialog.ts`

Sub-components: `Root`, `Trigger`, `Portal`, `Overlay`, `Content`, `Header`, `Body`, `Title`, `Description`, `ActionBar`, `Close`, `CloseIconButton`.

| Sub-component | asChild | Notes |
|---|---|---|
| Root        | N/A | Wraps Radix `DialogRoot` with `ElevationProvider`. |
| Trigger     | Passthrough | Direct re-export of Radix `DialogTrigger` (supports asChild natively). |
| Portal      | Passthrough | Direct re-export of Radix `DialogPortal`. |
| Overlay     | No | Renders `DialogOverlayPrimitive` directly. Provides `OverlayLayoutProvider` context. |
| Content     | No | Renders `DialogContentPrimitive` with an inner `<Container.Column>`. |
| Header      | Via Container.Segment | Uses `<Container.Segment asChild>` to merge grid positioning. |
| Body        | Via Container.Segment | Uses `<Container.Segment asChild>` to merge grid positioning. Theme applies `flex flex-col gap-2 h-full`. |
| Title       | No | Wraps Radix `DialogTitle`. |
| Description | No | Wraps Radix `DialogDescription`. |
| ActionBar   | Via Container.Segment | Uses `<Container.Segment asChild>` to merge grid positioning. |
| Close       | Passthrough | Direct re-export of Radix `DialogClose` (supports asChild natively). |

**Findings:**
- `Dialog.Content` internally wraps children in `<Container.Column>`, establishing the 3-column gutter grid. Header, Body, and ActionBar use `<Container.Segment asChild>` to position in col-2. This is a clean composition pattern.
- `Dialog.Body` applies `h-full` via theme but `Dialog.Content` does not apply `dx-expand` or `dx-container`. For dialogs with scrollable body content, consumers must add `overflow-hidden` and nest a `ScrollArea` themselves.
- The `Dialog.Content` theme applies `@container` (CSS container queries) which is good for responsive internal layout.
- `Dialog.Overlay` does not support `asChild`. This is fine — overlays are visual backdrops, not composable slots.

**Issues:**
1. `Dialog.Body` has `h-full` but the parent `Container.Column` has no explicit height constraint other than what `Dialog.Content` provides. For tall content, scrolling depends on the consumer adding a `ScrollArea`. This works but could be easier to reason about if the Body had a built-in scroll option.
2. `Dialog.Content` does not expose `gutter` prop — it always uses the default `'md'` gutter from `Container.Column`. This is probably intentional for consistency.

#### Popover

**Source:** `react-ui/src/components/Popover/Popover.tsx`
**Theme:** `ui-theme/src/theme/components/popover.ts`

This is a forked copy of `@radix-ui/react-popover` (commit 374c7d7, Oct 2024) with customizations.

Sub-components: `Root`, `Anchor`, `Trigger`, `VirtualTrigger`, `Portal`, `Content`, `Close`, `Arrow`, `Viewport`.

| Sub-component | asChild | Notes |
|---|---|---|
| Root            | N/A | State management, wraps `PopperPrimitive.Root`. |
| Anchor          | Passthrough | Wraps `PopperPrimitive.Anchor` (supports asChild natively). |
| Trigger         | No | Renders `Primitive.button`. Does not support asChild directly. |
| VirtualTrigger  | N/A | Renders `PopperPrimitive.Anchor` with `virtualRef`. |
| Portal          | N/A | Wraps `PortalPrimitive asChild`. |
| Content         | No | Complex: wraps in `FocusScope asChild > DismissableLayer asChild > PopperPrimitive.Content`. |
| Close           | No | Renders `Primitive.button`. |
| Arrow           | No | Wraps `PopperPrimitive.Arrow`. |
| Viewport        | Yes | Uses `Slot`/`Primitive.div`. Applies block/inline constraints from `--radix-popover-content-available-height/width`. |

**Findings:**
- `Popover.Viewport` is the key composability point. It supports `asChild` and is designed to be composed with `ScrollArea.Root`:
  ```tsx
  <Popover.Viewport asChild classNames='dx-container'>
    <ScrollArea.Root>...</ScrollArea.Root>
  </Popover.Viewport>
  ```
  This pattern works well — `dx-container` on the viewport ensures the ScrollArea fills the available space and can shrink.
- `Popover.Content` applies constraints via Radix CSS custom properties (`--radix-popover-content-available-height/width`). The `Viewport` translates these into `max-h`/`max-w` with `overflow-hidden`, which is correct for scroll containment.
- The `Popover.Trigger` does not support `asChild`, unlike the original Radix popover. This limits composability (e.g., using a custom button component as trigger). However, this may be intentional in the fork.
- The `collisionBoundary` computation using `data-popover-collision-boundary` ancestor detection is a nice extension over standard Radix.

**Issues:**
1. `Popover.Trigger` lacks `asChild` support. The standard Radix Popover trigger supports it. This could be limiting for consumers wanting to use custom trigger elements.
2. `Popover.Viewport` theme applies `overflow-hidden` for both `constrainBlock` and `constrainInline` independently. If both are true (the default), two `overflow-hidden` classes are emitted. This is harmless but redundant.

#### Splitter

**Source:** `react-ui/src/components/Splitter/Splitter.tsx`
**Theme:** `ui-theme/src/theme/components/splitter.ts`

Sub-components: `Root`, `Panel`.

| Sub-component | asChild | Notes |
|---|---|---|
| Root  | Yes | Uses `Slot`/`Primitive.div`. Theme: `relative h-full overflow-hidden`. |
| Panel | Yes | Uses `Slot`/`Primitive.div`. Theme: `absolute inset-x-0 flex flex-col overflow-hidden`. Applies dynamic `top`/`height` via inline styles. |

**Findings:**
- Both sub-components support `asChild`, which is good.
- Splitter uses absolute positioning (`absolute inset-x-0`) with dynamic `top`/`height` percentages and CSS transitions. This is a different layout model from the flex-based approach used by the other components.
- `Panel` applies `flex flex-col overflow-hidden`, so children can use `dx-expand` or `dx-container` to fill the panel and establish scroll containment. The `overflow-hidden` on the panel is important — it prevents content from overflowing during transitions.
- `Root` has `overflow-hidden` as well, providing a containment boundary.
- No `dx-expand` or `dx-container` is applied internally; consumers must apply them to panel children as needed.

**Issues:**
1. The `TODO(burdon): Enable resize` and `TODO(burdon): Generalize horizontal/vertical` comments indicate this component is still evolving. Currently it only supports vertical splitting with percentage-based positioning.
2. The mode names (`upper`/`lower`) are vertical-only terminology. When horizontal support is added, these should be generalized (e.g., `start`/`end`).

#### ScrollArea

**Source:** `react-ui/src/components/ScrollArea/ScrollArea.tsx`
**Theme:** `ui-theme/src/theme/components/scroll-area.ts`

Sub-components: `Root`, `Viewport`.

| Sub-component | asChild | Notes |
|---|---|---|
| Root     | No | Renders plain `<div>`. Provides `ScrollAreaProvider` context. Theme applies `overflow-hidden` and `dx-container`. |
| Viewport | No | Renders plain `<div>`. Theme applies `h-full w-full` with orientation-specific `overflow-*-scroll`. |

**Findings:**
- `ScrollArea.Root` automatically applies `dx-container` via theme for all orientations. This is the primary internal consumer of `dx-container`. It ensures the root fills its flex parent and can shrink (enabling scroll containment).
- The `[.dx-column_&]:col-span-full` rule in the theme detects when `ScrollArea.Root` is inside a `Container.Column` (via the `dx-column` marker class) and expands to span all 3 grid columns. This is important for Dialog/Container integration — the ScrollArea must span the full width including gutters, not just the center column.
- `ScrollArea.Viewport` applies `h-full w-full` with the actual scroll overflow. This completes the flex containment pattern: `dx-container` on root (shrink + fill) → `h-full overflow-scroll` on viewport (scrollable area).
- The `margin` option uses `--gutter` CSS variable from `Container.Column` to align scrollbar spacing with the column gutters. This is a clever integration detail.

**Issues:**
1. Neither `Root` nor `Viewport` supports `asChild`. The `Root` type includes `SlottableProps` but the implementation renders a plain `<div>` without the `Slot`/`Primitive.div` branching. This means `ScrollArea.Root` cannot be merged onto a child element. This is the most significant composability gap — when `Popover.Viewport` uses `asChild` to compose with `ScrollArea.Root`, the ScrollArea still renders its own wrapper div.
2. The `SlottableProps` type on `ScrollAreaRootProps` is misleading since `asChild` is not actually implemented.

#### dx-expand / dx-container Usage Summary

| Location | Class | How Applied |
|---|---|---|
| `ScrollArea.Root` theme (`scroll-area.ts`) | `dx-container` | Via `mx()` for all orientations. |
| `Grid` component (`Grid.tsx`) | `dx-expand` | Conditional when `grow={true}` (default). |
| `ScrollContainer` component (`ScrollContainer.tsx`) | `dx-expand` | On the fade overlay container. |
| `Popover.Viewport` composition (e.g., `EditorMenuProvider.tsx`) | `dx-container` | Manually added via `classNames='dx-container'` when composing with ScrollArea. |
| `MapSurface` (plugin-map-solid) | `dx-expand` | Direct class on map wrapper div. |
| Devtools panels (LogPanel, ObjectsPanel) | `dx-container` | Direct class on container divs. |

#### Recommendations

- [x] 1. **Implement `asChild` on `ScrollArea.Root`**: The type already declares `SlottableProps` but the implementation doesn't honor it. Adding `asChild` support (using `Slot`/`Primitive.div` branching like the other components) would enable cleaner composition, especially with `Popover.Viewport`. This would eliminate an unnecessary wrapper div in the `Popover.Viewport asChild > ScrollArea.Root` pattern.
- [x] 2. **Add `asChild` to `Popover.Trigger`**: The forked Popover lacks `asChild` on its Trigger, unlike standard Radix. This limits composability for consumers wanting custom trigger elements.
- [ ] 3. **Consider a `scroll` prop on `Dialog.Body`**: Today, consumers must manually nest a `ScrollArea` inside `Dialog.Body` for scrollable content. A convenience prop (e.g., `<Dialog.Body scroll>`) could handle the `ScrollArea` wrapping automatically, reducing boilerplate and ensuring correct scroll containment.
- [x] 4. **Document the Container + ScrollArea integration pattern**: The `dx-column` marker class and `[.dx-column_&]:col-span-full` rule are a non-obvious but important integration point. A brief comment in `Container.Column` referencing the ScrollArea integration would help maintainability.
- [ ] 5. **Generalize Splitter terminology**: When adding horizontal support, rename `upper`/`lower` to `start`/`end` to be axis-agnostic. The current TODOs already note this.
- [x] 6. **Popover.Viewport `overflow-hidden` redundancy**: When both `constrainBlock` and `constrainInline` are true (the default), two `overflow-hidden` classes are emitted. Consider applying `overflow-hidden` once unconditionally when either constraint is active.
- [x] 7. **Container.Main `asChild` consideration**: Currently `Main` renders a hardcoded `<div>` with no `asChild` support. This is acceptable for its role as a layout root, but if use cases arise where it needs to merge onto a `<main>` or `<section>` element, `asChild` support could be added.