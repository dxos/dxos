# Design Goals

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

# Decisions

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
5. **Grid.** Open — to be discussed. Must support general grids and the common cases, notably the current `Column`
   usage: vertically scrolling containers with left/right gutters.
6. **Spacing ownership.** Components own their inline padding; containers own the gaps between children; no component
   sets its own outer margin. `className` passes through as an escape hatch, but needing it is a design smell.
7. **First milestone.** Rebuild the story components on decisions 2–4 and 6 (Input/Button fill `--block-size`);
   Toolbar gets a zag roving-focus machine so it can claim `role=toolbar`; ARIA fixes (`aria-hidden` icons, labels);
   storybook play tests assert per-size alignment and roles. No plugin adoption until the grid decision lands.
