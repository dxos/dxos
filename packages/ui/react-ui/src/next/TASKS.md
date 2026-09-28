# react-ui next — Tasks

_Resume: Phase 1 — move size metrics to CSS. Uncommitted: none. Last: Container/ScrollArea spike (all play tests green)._

## Phase 0: Design

Settle the constraints in [DESIGN.md](./DESIGN.md) before building.

### Tasks

- [x] **Record scope, sizes, framework, levels, spacing and milestone decisions** — DESIGN.md decisions 1–4, 6, 7.
- [x] **Decide the grid model** — configurable Container with inherited rails/columns (DESIGN.md decision 5).
- [x] **Spike Container + ScrollArea** — `spike/Spike.stories.tsx`; 5 alignment play tests pass; findings in DESIGN.md.
- [x] **Decide scroll API shape** — composed `ScrollArea.Root > Viewport asChild > Container` (decision 5).

## Phase 1: Model (story components)

Rebuild Container, Toolbar, Block, Icon, Input, Button, Typography on the agreed model.

### Tasks

- [x] **Namespace attributes and variables** — selectors scoped to `.nx-*`, variables `--nx-*` (provisional names; rename later).
- [ ] **Typography owns first-line centring** — pad text beside a rail to `--block-size` (spike message row).
- [ ] **Move size metrics to CSS** — `[data-size=*]` rules in the theme; `sizes.ts` keeps only `Size`/`SIZES`.
- [ ] **Add levels** — `[data-level=*]` rules for surface/border/shadow; nested step-up.
- [ ] **Input/Button fill `--block-size`** — resolve the padding TODOs; align with `Block` per size.
- [ ] **Toolbar roving focus via zag** — own `@zag-js/core` machine; switch `role` to `toolbar`.
- [ ] **ARIA fixes** — `aria-hidden` icons, labels.
- [ ] **Container rails** — `gutter` with named lines; `layout` stack/row; `Block rail`; `gutter='inherit'` subgrid nesting.
- [ ] **Container columns** — inner template inherited via subgrid; `auto` label track aligns across nesting.
- [ ] **Next.ScrollArea** — composed frame/viewport; `:has` subgrid frame; scrollbar in end gutter; native reserve.
- [ ] **Responsive collapse** — `container-type` on template roots; rail→inset, columns stack.
- [ ] **Direct-nesting dev warning** — warn when a Container's parent is not a Container.
- [ ] **Nested-form story** — rails, gutter Blocks, scroll, sizes.
- [ ] **Play tests** — per-size block-height alignment, rail alignment across nesting, and roles.
