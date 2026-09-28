# react-ui next — Tasks

_Resume: grid/Column discussion (DESIGN.md decision 5). Uncommitted: none. Last: design decisions recorded._

## Phase 0: Design

Settle the constraints in [DESIGN.md](./DESIGN.md) before building.

### Tasks

- [x] **Record scope, sizes, framework, levels, spacing and milestone decisions** — DESIGN.md decisions 1–4, 6, 7.
- [ ] **Decide the grid model** — general grids plus the current `Column` case (vertical scroll, left/right gutters).

## Phase 1: Model (story components)

Rebuild Container, Toolbar, Block, Icon, Input, Button, Typography on the agreed model.

### Tasks

- [ ] **Move size metrics to CSS** — `[data-size=*]` rules in the theme; `sizes.ts` keeps only `Size`/`SIZES`.
- [ ] **Add levels** — `[data-level=*]` rules for surface/border/shadow; nested step-up.
- [ ] **Input/Button fill `--block-size`** — resolve the padding TODOs; align with `Block` per size.
- [ ] **Toolbar roving focus via zag** — own `@zag-js/core` machine; switch `role` to `toolbar`.
- [ ] **ARIA fixes** — `aria-hidden` icons, labels.
- [ ] **Play tests** — per-size block-height alignment and roles.
