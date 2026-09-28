# UI Next

## Design Goals

- Best pracises for Ark, Tailwind
- React/Solid
- Themeable
- Responsive (esp. mobile)
- Performance
- Support 5 sizes (xs, sm, md, lg, xl)
- Support levels (elevation)
- Scrollareas without clipping
- Not require CSS overrides
- Fits into grid (Column)
- Respects ARIA roles (human/machine readable)
- Testable

## Decisions

1. **Scope.** A parallel namespace (`Next.*`) alongside the current primitives; plugins opt in per component and old
   primitives retire once unused. Only a subset of components is in scope, starting with those in the experimental
   story: Container, Toolbar, Block, Icon, Input, Button, Typography.
2. **Sizes.** CSS is the source of truth: theme rules keyed by `[data-size=xs|sm|md|lg|xl]` define `--block-size`,
   `--line-height`, `--font-size`, `--icon-size`, `--gap-size`. `Container` only sets `data-size`; TS exports just
   the `Size` type and `SIZES` list.
3. **Framework neutrality.** Design for Solid, build React only, following Ark's layering: behavior in framework-neutral
   zag machines (Ark's where one exists, our own `@zag-js/core` machine otherwise), styling in CSS rules and plain class
   recipes, React as a thin binding. No React-only mechanisms (e.g. context) for size or level.
4. **Levels.** `data-level` sets surface, border and shadow variables for its subtree and is inherited like size;
   nested containers may step up (`+1`). Z-index is out of scope — stacking belongs to the portal/overlay layer.
5. **Grid.** One configurable `Container` replaces `Column`; rails, inner tracks, size and level are inherited, so
   nested components (forms, rows, sections) line up with their parent's gutters without placement helpers.
   - **Props.** `size`, `level`, `gutter` (`rail | inset | sm | md | lg | none | inherit`), `columns` (inner
     template), `scroll` (`none | vertical | horizontal | both`); all rendered as `data-*` attributes resolved by CSS.
   - **Named lines.** A gutter Container lays out
     `[full-start] var(--gutter) [content-start] <columns> [content-end] var(--gutter) [full-end]`; children default
     to `content`, opt out with `full`; `Block rail='start|end'` places into the gutter at any depth.
   - **Gutter width.** Default `rail` sets `--gutter: var(--block-size)` so gutter Blocks fit at every size; `inset`
     uses `--gap-size`; named `sm/md/lg` tokens remain as layout overrides (dialogs, cards).
   - **Nesting.** Containers nest as direct children only (wrappers use `asChild`; dev-mode warning otherwise). A
     Container inheriting gutter and columns uses real `subgrid`, so even content-sized (`auto`) tracks align across
     levels; a Container setting its own gutter/columns starts a fresh template. Only fixed tracks align across
     separate subtrees (e.g. sibling scroll panes).
   - **Scrolling.** `scroll` makes the Container its own viewport; its gutter tracks are the padding, so the scrollbar
     sits in the end gutter (`scrollbar-gutter: stable` for native scrollbars). No separate ScrollArea gutter math.
   - **Responsive.** Template-root Containers set `container-type: inline-size`; below a threshold, `rail` collapses
     to `inset` and `columns` stack to one track; subgrid descendants follow. Keyed to pane width, not viewport.
   - **Mapping.** `Column.Root` → gutter Container; `Column.Row`/`Section` → `gutter='inherit'` Container;
     `Column.Block` → `Block rail`; `Column.Center` → default placement.
6. **Spacing ownership.** Components own their inline padding; containers own the gaps between children; no component
   sets its own outer margin. `className` passes through as an escape hatch, but needing it is a design smell.
7. **First milestone.** Rebuild the story components on decisions 2–4 and 6 (Input/Button fill `--block-size`);
   Toolbar gets a zag roving-focus machine so it can claim `role=toolbar`; ARIA fixes (`aria-hidden` icons, labels);
   storybook play tests assert per-size alignment and roles. Container gains gutter/columns/scroll per decision 5,
   exercised by a nested-form story (rails, gutter Blocks, scrollbar in the end gutter). No plugin adoption yet.

## Spike findings

`spike/Spike.stories.tsx` (`playground/spike`) exercises decision 5 with play tests that measure alignment across a
header, top-level rows, a nested form and a nested scroll pane — all pass (Internal, Composed, Native, Narrow, Sizes).

1. **Subgrid survives scrolling.** A scroll frame and its viewport can both be subgrids, so rows inside a nested scroll
   pane share the parent's rails and its content-sized (`auto`) label track.
2. **Containment breaks subgrid.** `container-type` makes a grid independent, so `subgrid` silently degrades to a
   standalone grid. Only template roots (and non-inheriting scroll frames) may be query containers.
3. **Edge line names are invalid in `columns`.** `[content-start] [label-start]` is two adjacent bracket groups, which
   invalidates the whole template; `columns` may carry interior names only (`auto [field-start] minmax(0,1fr)`).
4. **Native scrollbars.** Reserving the bar's width out of the end track keeps the content edge aligned with
   non-scrolling siblings, but rail-end Blocks in the scroll pane then overlap the bar; overlay thumbs overlap them too.
5. **`asChild` onto a non-composable element** gets the dev `dx-slot-warning` wrapper, which breaks direct nesting and
   the frame's `:has(> …)` subgrid detection — scroll composition must target a composable Container.
6. **`layout` (`stack | row`) is needed.** A stack places each child across the content track; a row flows children
   through the inner tracks, pinning the first non-rail child to `content-start` (`:nth-child(1 of :not([data-rail]))`).
7. **Scroll API.** Both shapes work. Internal (`scroll` prop) must split one prop set across two elements —
   `classNames` to the frame, `ref`/data attributes to the viewport — and `asChild` becomes ambiguous. Composed
   (`ScrollArea.Root > ScrollArea.Viewport asChild > Container`) keeps one element per part, the frame detects an
   inheriting viewport in CSS (`:has`) with no coupling, and ScrollArea stays usable for non-grid content.
