# react-ui next — Tasks

_Resume: Phase 3 fixes, Next export and new components done; next is `react-ui-form/next`. Uncommitted: none._

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
- [x] **Collapsible** — Ark Collapsible; caret trigger row; `--height` animation, reduced-motion aware (DESIGN.md follow-up 15). — `components/Collapsible/`; Toggle play test.
- [x] **Menu** — Ark Menu; portalled popup with explicit `size`; Item icon/shortcut, Separator, ItemGroup + label (DESIGN.md follow-up 16). — `components/Menu/`; Open, Dismiss play tests.
- [x] **Tooltip** — Ark Tooltip; portalled `sm` popup, 20rem cap, 300ms open delay (DESIGN.md follow-up 17). — `components/Tooltip/`; Open play test.
- [x] **Per-component stories** — a `<Name>.stories.tsx` for Block, Button, Checkbox, Container, Field, Group, Icon, IconButton, Input, Label, ScrollArea, Select, Toolbar, Typography; per-component assertions moved out of `components.stories.tsx` (now a gallery + Benchmark); shared helpers in `testing.ts`. — 84 storybook tests pass.
- [x] **Block-sized cells** — IconButton, Checkbox and Switch occupy a block square with the control inset (DESIGN.md follow-up 19). — IconButton Sizes, Checkbox Sizes, Form/FieldSet/Card Layout play tests.

## Phase 3: Fixes and react-ui-form port

Fix the open Phase 2 issues, then port `@dxos/react-ui-form` onto `Next.*` as a parallel `react-ui-form/next`
(DESIGN.md "Phase 3: react-ui-form port").

### Tasks

- [x] **Tooltip focus-swap fix** — tabbing between triggers must keep the next tooltip open (zag 1.43.3 closes it). — deferred blur close in `Tooltip.Trigger` (DESIGN.md follow-up 20); Keyboard, Blur play tests.
- [x] **Switch `role='switch'`** — expose switch semantics on the hidden input (`aria-checked`). — hidden checkbox takes `role=switch` (DESIGN.md follow-up 21); Toggle asserts role, checked state and Space.
- [x] **IconButton Tooltip** — IconButton shows its `label` in a `Next.Tooltip` instead of a native `title`. — `showTooltip` opt-out (DESIGN.md follow-up 22); LabelTooltip (Toolbar), Dialog CloseTooltip, Field/Card HeaderTooltip play tests.
- [x] **Export Next** — `@dxos/react-ui/next` subpath + `next/theme/index.css`; zag packages back to dependencies. — `./next` + `./next/theme.css` exports, `next` vite entry (DESIGN.md follow-up 23).
- [x] **New components** — `Textarea`, `DateInput` (date/time/datetime), `Popover` + `Combobox`, `Tag`, `ToggleIconButton`; Select option icons. — DESIGN.md follow-ups 24–30; 111 storybook tests pass.
- [x] **Merge IconButton into Button** — `icon`/`iconEnd`/`label`/`iconOnly` on `Next.Button`; `Next.Toggle` replaces ToggleIconButton (DESIGN.md follow-up 36). — 119 storybook tests pass.
- [x] **Standardize component stories** — `withSizes()` decorator; `Default` + one `Test` per component (DESIGN.md follow-up 37). — 67 storybook tests pass (was 120).
- [ ] **`react-ui-form/next`** — Viewport/Content/Fields/FieldSet/Actions on Next; reuse `resolveFieldRenderer`; port Form stories.
- [ ] **Settings layout** — design the two-column `variant='settings'` (Container `columns`) — needs a decision.
- [ ] **Ref and lookup fields** — on `Next.Combobox` + `Next.Popover`.
- [ ] **Pilot plugin** — move one plugin (e.g. plugin-space settings) to `react-ui-form/next`.

## Parity

Close the "Missing in Next" gaps of [AUDIT.md](./AUDIT.md) §1 for the existing components (Combobox's major gaps stay
with Phase 4 milestone 5).

### Tasks

- [x] **Separator** — `Next.Separator`; `Toolbar.Separator` (Toolbar becomes `Toolbar.Root`), `Menu.Separator`, `Select.Separator` (DESIGN.md follow-up 38).
- [x] **Text and layout** — Typography `truncate`/`tone`, Label `srOnly`, Group `fill`, Container `gap`, ScrollArea `orientation`/`autoHide`/`snap`/`scrollbars`; section label and Block `compact`/`square` deliberate (DESIGN.md follow-up 39).
- [x] **Button and Toggle** — Button `hue`/`caretDown`/`compact`/`tooltipSide`; Toggle `activeIcon`; `Next.ToggleGroup`, `Toolbar.ToggleGroup` (DESIGN.md follow-up 40).
- [x] **Fields** — Field `validationValence`, `Field.Label srOnly`; Input `start`/`end`, `noAutoFill`, `variant='subdued'` (DESIGN.md follow-up 41).

## Phase 4: react-ui-list and react-ui-form rewrite

Parallel `react-ui-list/next` and `react-ui-form/next` entries on `Next.*`, in the milestone order of
[AUDIT.md](./AUDIT.md) §5; each lands with stories, play tests, a parity table and one pilot plugin.

### Tasks

- [ ] **1. Foundations** — pane host, popup size decision, Container child span, Group stretch, required marker, depth-5 benchmark, `+1` fallback.
- [ ] **2. Next.Listbox** — Ark listbox (single/multiple), row pattern, selected/current styles.
- [ ] **3. `react-ui-list/next` scaffold** — `./next` subpath, Listbox, ItemContent, import lint rule; pilot plugin-registry `PluginList`.
- [ ] **4. OrderedList next** — Container rows, DragHandle, DropIndicator, Collapsible disclosure; pilot plugin-sheet `RangeList`.
- [ ] **5. Combobox trigger mode** — button trigger, input in popup, description, create row, async, VirtualTrigger; retire list Combobox/Picker.
- [ ] **6. `react-ui-form/next` core** — parts, scalar renderers, `fieldMap`/`fieldProvider`/`createSelectField`; pilot plugin-thread `ChannelCreatePanel`.
- [ ] **7. Settings layout** — needs a decision (AUDIT.md §3.2); pilot plugin-pwa, plugin-excalidraw, plugin-settings.
- [ ] **8. Arrays and layout templates** — ArrayField, SelectOptionField, `Form.Layout`; pilot plugin-pipeline `PipelineProperties`.
- [ ] **9. Ref and lookup fields** — RefField, InlineRefField, ComboboxField, ObjectPicker; pilot plugin-space.
- [ ] **10. Higher-level form components** — ObjectProperties, ObjectForm, ViewEditor, FieldEditor, editor control frame; pilot plugin-map `MapViewEditor`.
- [ ] **11. Tree next** — Ark tree-view spike, virtualization, DnD, MasterDetail; pilot plugin-navtree.
