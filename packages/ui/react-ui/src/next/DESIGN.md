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
   Namespacing (provisional, to be renamed): rules match only `.nx-*` elements and variables are `--nx-*`, since
   `data-size`, `data-layout`, `--gutter`, `--icon-size` and `--line-height` are already used by current primitives.
3. **Framework neutrality.** Design for Solid, build React only, following Ark's layering: behavior in framework-neutral
   zag machines (Ark's where one exists, our own `@zag-js/core` machine otherwise), styling in CSS rules and plain class
   recipes, React as a thin binding. No React-only mechanisms (e.g. context) for size or level.
4. **Levels.** `data-level` sets surface, border and shadow variables for its subtree and is inherited like size;
   nested containers may step up (`+1`). Z-index is out of scope — stacking belongs to the portal/overlay layer.
5. **Grid.** One configurable `Container` replaces `Column`; rails, inner tracks, size and level are inherited, so
   nested components (forms, rows, sections) line up with their parent's gutters without placement helpers.
   - **Props.** `size`, `level`, `gutter` (`rail | inset | sm | md | lg | none | inherit`), `columns` (inner
     template, interior line names only), `layout` (`stack | row`); all rendered as `data-*` attributes resolved by
     CSS. `stack` places each child across the content track; `row` flows children through the inner tracks.
   - **Named lines.** A gutter Container lays out
     `[full-start] var(--gutter) [content-start] <columns> [content-end] var(--gutter) [full-end]`; children default
     to `content`, opt out with `full`; `Block rail='start|end'` places into the gutter at any depth.
   - **Gutter width.** Default `rail` sets `--gutter: var(--block-size)` so gutter Blocks fit at every size; `inset`
     uses `--gap-size`; named `sm/md/lg` tokens remain as layout overrides (dialogs, cards).
   - **Nesting.** Containers nest as direct children only (wrappers use `asChild`; dev-mode warning otherwise). A
     Container inheriting gutter and columns uses real `subgrid`, so even content-sized (`auto`) tracks align across
     levels; a Container setting its own gutter/columns starts a fresh template. Only fixed tracks align across
     separate subtrees (e.g. sibling scroll panes).
   - **Scrolling.** Composed, not a Container prop: `ScrollArea.Root > ScrollArea.Viewport asChild > Container`.
     The frame hosts the thumbs and becomes a subgrid when its viewport inherits (detected with `:has`); the
     viewport's gutter tracks are the padding, so the scrollbar sits in the end gutter. ScrollArea stays usable for
     non-grid content. The caller picks the trade-off:
     - `mode='overlay'` (default): the thumb paints over the end gutter; `mode='reserve'` takes the thumb's width out
       of the end track, keeping the content edge aligned but shifting end-rail Blocks inward.
     - `width='thin'` (default): `(--nx-block-size - --nx-icon-size) / 2` — 4px at every size — so an overlay thumb
       sits in the rail Block's margin and never overlaps its icon; `width='regular'` (8px) overlaps it by 4px.
     - `native` uses the platform scrollbar and implies `reserve`.
   - **Responsive.** The pane is the query container: whatever hosts a column of content (Panel/plank, Dialog) sets
     `container-type: inline-size`, so every template root in it — header, body, footer — collapses at the same pane
     width; ScrollArea frames are containers too. A root cannot query its own width, and inheriting containers must
     never be query containers (containment disables subgrid). Below the threshold `rail` collapses to `inset`, rail
     Blocks hide, and `columns` stack to one track.
   - **Mapping.** `Column.Root` → gutter Container; `Column.Row`/`Section` → `gutter='inherit'` Container;
     `Column.Block` → `Block rail`; `Column.Center` → default placement.
6. **Spacing ownership.** Components own their inline padding; containers own the gaps between children; no component
   sets its own outer margin. `className` passes through as an escape hatch, but needing it is a design smell.
7. **First milestone.** Rebuild the story components on decisions 2–4 and 6 (Input/Button fill `--block-size`);
   Toolbar gets a zag roving-focus machine so it can claim `role=toolbar`; ARIA fixes (`aria-hidden` icons, labels);
   storybook play tests assert per-size alignment and roles. Container gains gutter/columns/layout and a composed
   ScrollArea per decision 5, exercised by a nested-form story (rails, gutter Blocks, scrollbar in the end gutter).
   No plugin adoption yet.
8. **Theming.** A theme only sets values: `--nx-*` variables plus ui-theme's color tokens (dark mode via
   `light-dark()`), applied globally or under a scope such as `[data-theme=…]`. Structure — grid, placement, the
   element tree — is not themeable. Class recipes are plain TS functions shared by the React and Solid bindings; they
   are fixed at build time, not swapped at runtime through context (unlike the current `tx()` theme functions).
   One theme therefore serves both bindings, provided they emit identical DOM (same elements, classes and `data-*`
   attributes); the shared recipes guarantee the classes, and a parity test should assert the rest.
9. **ARIA.** Interactive roles and `aria-*` state come only from zag machines (`api.get*Props()`), so a role is
   claimed only by code that implements its keyboard contract. Layout parts (Container, Block, ScrollArea) carry no
   role by default; callers add landmark or `group` roles explicitly. Icons are `aria-hidden` unless given a label.
10. **Testability.** Three hooks, one job each: every part forwards `data-testid` to its root (the only e2e
    target); every part emits Ark's `data-scope`/`data-part` (structural queries and the React/Solid parity test);
    storybook play tests assert geometry and ARIA roles.
11. **Performance.** Size, level, gutter and layout are attribute swaps resolved by CSS — never React context or
    re-renders; no JS layout measurement except the overlay scroll thumbs; container queries only at template roots.
    A benchmark story (e.g. 1,000 rows in a nested Container inside a ScrollArea) tracks render and layout cost, since
    deep subgrids and `:has` are the design's unmeasured risks.

12. **Control sizing.** Controls (Input, Button, IconButton, Select trigger, Checkbox box) are shorter than the block
    and centred in it: `--nx-control-size: calc(var(--nx-block-size) - 2 * var(--nx-control-inset))`, with a per-size
    inset (provisional: xs 2px, sm 3px, md 4px, lg 5px, xl 6px) and a matching `--nx-control-icon` for icons inside
    controls. The block stays the row height, so rails and Typography's first-line centring are unchanged.
    Illustrated in `spike/Choices.stories.tsx` (ControlSizing).
13. **Field layout.** Field is a part, not a container (containers are Container, Form, Toolbar). `Field.Root` is a
    flex stack placed in the content track: Label above the control, HelperText/ErrorText below. Labels do not share a
    column across fields; `columns` remains for other row layouts. Illustrated in `spike/Choices.stories.tsx`
    (FieldLayout).

## Spike findings

`spike/Spike.stories.tsx` (`playground/spike`) exercises decision 5 with play tests that measure alignment across a
header, top-level rows, a nested form and a nested scroll pane — all pass (Default, Native, Narrow, Sizes). The internal-scroll variant was removed once decision 5 settled on the composed API.

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
   A row with more content children than inner tracks spills into the end rail and wraps, so `columns` must provide a
   track per content child (or the extra children belong in a nested flex group).
7. **Scroll API (decided: composed).** Both shapes work. Internal (`scroll` prop) must split one prop set across two elements —
   `classNames` to the frame, `ref`/data attributes to the viewport — and `asChild` becomes ambiguous. Composed
   (`ScrollArea.Root > ScrollArea.Viewport asChild > Container`) keeps one element per part, the frame detects an
   inheriting viewport in CSS (`:has`) with no coupling, and ScrollArea stays usable for non-grid content.
8. **Levels need no React context.** Absolute levels reuse ui-theme's `data-surface` zones, which already paint and
   re-derive every host aspect (hover, separators, placeholder, scrollbar). Each zone publishes `--nx-level` (its
   rung), and `level='+1'` resolves against the parent's rung with a style query
   (`@container style(--nx-level: 2) { … }`), since every element is a style container. Level is independent of
   rails: an inheriting (subgrid) container can lift its surface and keep the parent's tracks. Style queries need a
   Firefox support check before production.
