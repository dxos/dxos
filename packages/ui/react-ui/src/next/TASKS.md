# react-ui next — Tasks

_Resume: Phase 2 in progress (FieldSet, Card, Collapsible, Menu, Switch, Tooltip). Uncommitted: none._

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
- [x] **Check style-query support in Firefox** — Baseline since Firefox 151 (May 2026).

## Phase 1: Model (story components)

Rebuild on the agreed model: Container, ScrollArea, Toolbar, Block, Icon, Typography, Input, Button, IconButton, Field (Root, Label, HelperText, ErrorText), Label, Checkbox, Select. CSS lives in `next/theme/` (no ui-theme edits).

### Tasks

- [x] **Namespace attributes and variables** — selectors scoped to `.nx-*`, variables `--nx-*` (provisional names; rename later).
- [x] **Typography owns first-line centring** — `Next.Typography` pads to `--nx-block-size`; spike message row uses it.
- [x] **Move size metrics to CSS** — `[data-size=*]` rules in the theme; `sizes.ts` keeps only `Size`/`SIZES`. — `theme/size.css`; one icon scale (md = 1rem).
- [x] **Add levels** — `level` prop emits `data-surface`; `--nx-level` rungs; style-query `+1`. — `theme/level.css`; spike Levels story passes on `Next.Container`.
- [x] **Input/Button fill `--block-size`** — superseded by decision 12.
- [x] **Control sizing** — `--nx-control-inset`/`--nx-control-size`/`--nx-control-icon` per size; Input, Button, IconButton, Select trigger, Checkbox use them (decision 12). — asserted per size in `components.stories.tsx` Default.
- [x] **Field** — Ark `Field`; flex stack in the content track; Label, HelperText, ErrorText (decision 13). — `Field.tsx`; `Next.Input` is Ark `Field.Input`.
- [x] **Checkbox, Select, IconButton** — Ark Checkbox/Select; Select content at `level='popup'` in a portal; IconButton requires a label. — Select.Content takes its own `size` (finding 9).
- [x] **Move CSS to `next/theme/`** — size, container, scroll-area, level, control; `@layer dx-components`; stories import `theme/index.css`; drop `SpikeStyles`. — spike illustrations moved to `spike/choices.css`.
- [x] **Toolbar roving focus via zag** — own `@zag-js/core` machine; switch `role` to `toolbar`. — `components/Toolbar/toolbar-machine.ts`; ToolbarFocus play test.
- [x] **ARIA fixes** — `aria-hidden` icons, labels. — Icon `label` → `role=img`; Roles play test.
- [x] **Container rails** — `gutter` with named lines; `layout` stack/row; `Block rail`; `gutter='inherit'` subgrid nesting. — `Container.tsx`; spike stories now run on `Next.*`.
- [x] **Container columns** — inner template inherited via subgrid; `auto` label track aligns across nesting. — spike Default/Sizes assertions.
- [x] **Next.ScrollArea** — composed frame/viewport; `:has` subgrid frame; `mode` overlay|reserve; `width` thin|regular; `native`. — `ScrollArea.tsx`; thin is a fixed 4px.
- [x] **Responsive collapse** — pane and ScrollArea frame are query containers; rail→inset, rails hide, columns stack. — spike Narrow story.
- [x] **Direct-nesting dev warning** — warn when a Container's parent is not a Container. — dev-only effect in `Container.tsx`.
- [x] **Nested-form story** — rails, gutter Blocks, scroll, sizes. — spike stories on `Next.*` plus `components.stories.tsx`.
- [x] **Play tests** — per-size block-height alignment, rail alignment across nesting, and roles. — 12 storybook tests pass.
- [x] **`data-scope`/`data-part` on every part** — decision 10. — asserted in Roles; `asChild` caveat is finding 10.
- [x] **Shared class recipes** — plain TS functions used by the bindings (decision 8). — `recipes.ts`.
- [x] **Benchmark story** — 1,000 rows in a nested Container inside a ScrollArea (decision 11). — ~110ms mount+layout in headless Chromium.
- [x] **Phase 1 review follow-ups** — `Next.Group` for form actions; explicit `Select.Content` size; toolbar gap `--nx-gap-size`; experimental story removed.
- [x] **Dialog** — Ark Dialog at `level='raised'` with explicit `size`; Body = Container + ScrollArea, Footer = Group (DESIGN.md follow-up 10). — `components/Dialog/`; Default, LongContent, Sizes play tests.

## Phase 2: More primitives

FieldSet, Card, Collapsible, Menu, Switch, Tooltip on the Phase 1 model.

### Tasks

- [x] **Switch** — Ark Switch; icon-tall track, block-tall row (DESIGN.md follow-up 11). — `components/Switch/`; Toggle play test.
- [x] **FieldSet** — Ark Fieldset; Legend as sm label row; `invalid` reaches child Fields (DESIGN.md follow-up 12). — `components/FieldSet/`; Layout, Disabled, Invalid play tests.
- [x] **Image** — fixed-ratio frame; `fit`; well while loading; broken-image fallback (DESIGN.md follow-up 13). — `components/Image/`; Load play test.
- [x] **Card** — Container `level=+1 gutter=md`; Header/Title/Description/Body/Footer; `Card.Poster` Image (DESIGN.md follow-up 14). — `components/Card/`; Layout, Poster, BrokenPoster play tests.
