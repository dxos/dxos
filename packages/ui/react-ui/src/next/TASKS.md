# react-ui next — Tasks

_Resume: Phase 1 — move size metrics to CSS. Uncommitted: none. Last: spike issues resolved (scrollbar options, pane container, levels)._

## Phase 0: Design

Settle the constraints in [DESIGN.md](./DESIGN.md) before building.

### Tasks

- [x] **Record scope, sizes, framework, levels, spacing and milestone decisions** — DESIGN.md decisions 1–4, 6, 7.
- [x] **Decide the grid model** — configurable Container with inherited rails/columns (DESIGN.md decision 5).
- [x] **Spike Container + ScrollArea** — `spike/Spike.stories.tsx`; 5 alignment play tests pass; findings in DESIGN.md.
- [x] **Decide scroll API shape** — composed `ScrollArea.Root > Viewport asChild > Container` (decision 5).
- [x] **Design theming, ARIA, testability, performance** — decisions 8–11.
- [x] **Rail-end vs scrollbar** — ScrollArea `mode` (overlay|reserve) and `width` (thin = rail margin|regular) (decision 5).
- [x] **Self-query limit** — the pane is the query container (decision 5).
- [x] **Spike levels** — `data-surface` zones + style-query `+1` step-up; Levels story passes (spike finding 8).
- [ ] **Check style-query support in Firefox** — `+1` levels depend on `@container style()`.

## Phase 1: Model (story components)

Rebuild Container, Toolbar, Block, Icon, Input, Button, Typography on the agreed model.

### Tasks

- [x] **Namespace attributes and variables** — selectors scoped to `.nx-*`, variables `--nx-*` (provisional names; rename later).
- [x] **Typography owns first-line centring** — `Next.Typography` pads to `--nx-block-size`; spike message row uses it.
- [ ] **Move size metrics to CSS** — `[data-size=*]` rules in the theme; `sizes.ts` keeps only `Size`/`SIZES`.
- [ ] **Add levels** — `level` prop emits `data-surface`; `--nx-level` rungs; style-query `+1`.
- [x] **Input/Button fill `--block-size`** — `h-(--nx-block-size)`; padding TODOs removed.
- [ ] **Toolbar roving focus via zag** — own `@zag-js/core` machine; switch `role` to `toolbar`.
- [ ] **ARIA fixes** — `aria-hidden` icons, labels.
- [ ] **Container rails** — `gutter` with named lines; `layout` stack/row; `Block rail`; `gutter='inherit'` subgrid nesting.
- [ ] **Container columns** — inner template inherited via subgrid; `auto` label track aligns across nesting.
- [ ] **Next.ScrollArea** — composed frame/viewport; `:has` subgrid frame; `mode` overlay|reserve; `width` thin|regular; `native`.
- [ ] **Responsive collapse** — pane and ScrollArea frame are query containers; rail→inset, rails hide, columns stack.
- [ ] **Direct-nesting dev warning** — warn when a Container's parent is not a Container.
- [ ] **Nested-form story** — rails, gutter Blocks, scroll, sizes.
- [ ] **Play tests** — per-size block-height alignment, rail alignment across nesting, and roles.
- [ ] **`data-scope`/`data-part` on every part** — decision 10.
- [ ] **Shared class recipes** — plain TS functions used by the bindings (decision 8).
- [ ] **Benchmark story** — 1,000 rows in a nested Container inside a ScrollArea (decision 11).
