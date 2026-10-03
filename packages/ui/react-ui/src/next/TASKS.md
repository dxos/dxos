# react-ui next — Tasks

_Resume: the cut-over is on PR #13549 (old components deleted, every consumer on Next); the `Next` namespace is removed (components export flat); the component CSS is merged under `dx-` (ui-theme keeps tokens, zones and states); next are the open items below. Pre-cut-over planning docs and the verification ledger are archived under `../../docs/archive/`._

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

- [x] **Namespace attributes and variables** — selectors scoped to `.dx-*`, variables `--dx-*` (provisional names; rename later).
- [x] **Typography owns first-line centring** — `Next.Typography` pads to `--dx-block-size`; spike message row uses it.
- [x] **Move size metrics to CSS** — `[data-size=*]` rules in the theme; `sizes.ts` keeps only `Size`/`SIZES`. — `theme/size.css`; one icon scale (md = 1rem).
- [x] **Add levels** — `level` prop emits `data-surface`; `--dx-level` rungs; style-query `+1`. — `theme/level.css`; spike Levels story passes on `Next.Container`.
- [x] **Input/Button fill `--block-size`** — superseded by decision 12.
- [x] **Control sizing** — `--dx-control-inset`/`--dx-control-size`/`--dx-control-icon` per size; Input, Button, IconButton, Select trigger, Checkbox use them (decision 12). — asserted per size in `components.stories.tsx` Default.
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
- [x] **Phase 1 review follow-ups** — `Next.Group` for form actions; explicit `Select.Content` size; toolbar gap `--dx-gap-size`; experimental story removed.
- [x] **Dialog** — Ark Dialog at `level='raised'` with explicit `size`; Body = Container + ScrollArea, Footer = Group (DESIGN.md follow-up 10). — `components/Dialog/`; Default, LongContent, Sizes play tests.

## Phase 2: More primitives

Fieldset, Card, Collapsible, Menu, Switch, Tooltip on the Phase 1 model.

### Tasks

- [x] **Switch** — Ark Switch; icon-tall track, block-tall row (DESIGN.md follow-up 11). — `components/Switch/`; Toggle play test.
- [x] **Fieldset** — Ark Fieldset; Legend as sm label row; `invalid` reaches child Fields (DESIGN.md follow-up 12). — `components/Fieldset/`; Layout, Disabled, Invalid play tests.
- [x] **Image** — fixed-ratio frame; `fit`; well while loading; broken-image fallback (DESIGN.md follow-up 13). — `components/Image/`; Load play test.
- [x] **Card** — Container `level=+1 gutter=md`; Header/Title/Description/Body/Footer; `Card.Poster` Image (DESIGN.md follow-up 14). — `components/Card/`; Layout, Poster, BrokenPoster play tests.
- [x] **Collapsible** — Ark Collapsible; caret trigger row; `--height` animation, reduced-motion aware (DESIGN.md follow-up 15). — `components/Collapsible/`; Toggle play test.
- [x] **Menu** — Ark Menu; portalled popup with explicit `size`; Item icon/shortcut, Separator, ItemGroup + label (DESIGN.md follow-up 16). — `components/Menu/`; Open, Dismiss play tests.
- [x] **Tooltip** — Ark Tooltip; portalled `sm` popup, 20rem cap, 300ms open delay (DESIGN.md follow-up 17). — `components/Tooltip/`; Open play test.
- [x] **Per-component stories** — a `<Name>.stories.tsx` for Block, Button, Checkbox, Container, Field, Group, Icon, IconButton, Input, Label, ScrollArea, Select, Toolbar, Typography; per-component assertions moved out of `components.stories.tsx` (now a gallery + Benchmark); shared helpers in `testing.ts`. — 84 storybook tests pass.
- [x] **Block-sized cells** — IconButton, Checkbox and Switch occupy a block square with the control inset (DESIGN.md follow-up 19). — IconButton Sizes, Checkbox Sizes, Form/Fieldset/Card Layout play tests.

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
- [x] **`react-ui-form/next`** — Viewport/Content/Fields/Fieldset/Actions on Next; reuse `resolveFieldRenderer`; port Form stories. — shipped with the cut-over: react-ui-form is the Next form (no `/next` subpath).
- [x] **Settings layout** — design the two-column `variant='settings'` (Container `columns`) — needs a decision. — the settings row layout shipped (Form.FieldSet rows, two tracks).
- [x] **Ref and lookup fields** — on `Next.Combobox` + `Next.Popover`. — RefField/ComboboxField on `Next.Combobox` + `Next.Popover`.
- [x] **Pilot plugin** — move one plugin (e.g. plugin-space settings) to `react-ui-form/next`. — superseded: every plugin moved at the cut-over.

## Parity

Close the "Missing in Next" gaps of [AUDIT.md](./AUDIT.md) §1 for the existing components (Combobox's major gaps closed
with Phase 4 milestone 5).

### Tasks

- [x] **Separator** — `Next.Separator`; `Toolbar.Separator` (Toolbar becomes `Toolbar.Root`), `Menu.Separator`, `Select.Separator` (DESIGN.md follow-up 38).
- [x] **Text and layout** — Typography `truncate`/`tone`, Label `srOnly`, Group `fill`, Container `gap`, ScrollArea `orientation`/`autoHide`/`snap`/`scrollbars`; section label and Block `compact`/`square` deliberate (DESIGN.md follow-up 39).
- [x] **Button and Toggle** — Button `hue`/`caretDown`/`compact`/`tooltipSide`; Toggle `activeIcon`; `Next.ToggleGroup`, `Toolbar.ToggleGroup` (DESIGN.md follow-up 40).
- [x] **Fields** — Field `validationValence`, `Field.Label srOnly`; Input `start`/`end`, `noAutoFill`, `variant='subdued'` (DESIGN.md follow-up 41).
- [x] **Select** — `ItemGroup`/`ItemGroupLabel`, `Separator`, `iconHue`, Item children, `multiple`, Trigger `loading`; number values stay strings (DESIGN.md follow-up 42).
- [x] **Toolbar** — `Text`, `Link`, `DragHandle`, `loop`, `disabled` (DESIGN.md follow-up 43).
- [x] **Menu** — `ContextTrigger`, `CheckboxItem`, `RadioGroup`/`RadioItem`, `ItemIndicator`, `Sub`/`SubTrigger`, `arrow`, scrolling content; virtual trigger via `positioning.getAnchorRect` (DESIGN.md follow-up 44).
- [x] **Popover, Tooltip, Dialog** — portal `container` on every popup; Popover `Body`, `modal`, lazy-mount naming fix; Tooltip `content`/`side` shorthand, `TextTooltip`; `AlertDialog`, `DIALOG_AUTOFOCUS_ATTRIBUTE`; virtual triggers via `positioning.getAnchorRect` (DESIGN.md follow-up 45).
- [x] **Card** — `Section`, `Row`, `Text`, `Action`, `Link`, `Menu`, `DragHandle`; root `border`, `selected`, clickable `onClick`; `fullWidth` deliberate, `Html` deferred (DESIGN.md follow-up 46).
- [x] **Image** — `onClick` as a button (Enter/Space) (DESIGN.md follow-up 47).
- [x] **Image dominant colour** — `Next.Image backdrop='dominant'` (opt-in); the sampler is `sampleDominantColor` in `@dxos/lit-ui` (AUDIT.md §6 point 13).
- [x] **Tooltip after a press** — a click then Space left a Toggle's Tooltip suppressed; the press now ends at the next focus, key or hover (DESIGN.md follow-up 48); Toggle `Test` covers it.
- [x] **SystemButton** — `Next.SystemButton.*` ports every `SystemIconButton` preset on Button/Toggle with translated default labels (DESIGN.md follow-up 51).
- [x] **Field and date/time** — every current `Field.*` part: segmented `DateInput` (zag `date-input`) with an Ark `DatePicker` calendar replacing the native input, `PinInput`, `NumberInput`, `PasswordInput`, Textarea `variant`; `Field.Block`/`TriggerIcon` mapped; Field story shows every field type (DESIGN.md follow-up 54).
- [x] **Toolbar action binding** — `useMenuActions` (`ActionIconButton`, `Toolbar.Menu`) on Next Menu; Phase 4 with react-ui-menu. — react-ui-menu's `useMenuActions` drives Next `Menu`/`Toolbar`.

## Phase A4: ports with no counterpart

Current components with no Next counterpart (AUDIT.md §7 Phase A item 4), in importer order; renames and dropped
parts are listed there for the codemods.

### Tasks

- [x] **Avatar** — Ark avatar; one `Avatar.Root` element (`src`/`fallback`/`icon`, hue, status ring), `Image`/`Fallback` parts; block-sized per size, `fill` for portraits. — Test asserts size, initials, ring, image load.
- [x] **Tabs** — Ark tabs; `Root`/`List`/`Trigger` (a Button)/`Content`/`Indicator`; `keepMounted`, `selectedVariant`. — Test (sizes, manual activation, unmount) and Vertical.
- [x] **Main** — app shell on `.dx-main-*` rules and `data-surface` zones; same parts as current. — Test (sidebar toggles) and Drawer (padding, resize).
- [x] **Progress** — Ark progress; single component: `value`/`max`, indeterminate, error, countdown. — Test.
- [x] **Splitter** — Ark splitter; `ResizeTrigger` replaces `Handle`. — Test (rem round-trip) and Collapsed.
- [x] **Toast** — Ark toast; `Toaster` host, `Header`/`Title`/`Description`/`Footer`/`ActionTrigger`/`CloseTrigger`. — Test and Timeout.
- [x] **ErrorFallback, Focus, ScrollContainer, Accordion, Carousel, MediaPlayer, QrCode** — Ark accordion, carousel and qr-code; `Next.useFocus`. — a `Test` story each.
- [x] **Single-file components** — AttentionGlyph, Breadcrumb, Deferred, Editable (`Next.useEditable`), FloatingPanel, HoverCard, Link, MenuButton, Skeleton, Slider, Steps, TextCrawl, Timestamp, Tour; Ark where Ark has one. — a `Test` story each; Deferred keeps its node test.
- [x] **Move shared helpers** — `media-kind.ts` and `parse-stack.ts` are imported from the current tree; move them into `next/` before the cut-over deletes it. — `media-kind.ts` and `parse-stack.ts` live under `next/components/`.
- [x] **Translate hard-coded strings** — ErrorFallback ("Runtime Error", "Stack", "Data") and Steps ("Step N"). — ErrorFallback and Steps (`steps.step.label`) are translated.
- [x] **Master-detail** — not a component: Root context selection + `Next.Splitter` (`collapseBelow`, `mode`, static divider); `Splitter/MasterDetail.stories.tsx` approved (AUDIT.md §6 follow-ups).
- [x] **Button `size`** — `data-size` on the button alone (Toggle, `ToggleGroup.Item` too); Button `Sizes` story.
- [ ] **Cut-over removals** — open: react-ui-list `MasterDetail` still exists (plugin-atproto `PdsBrowser` uses it); the current Tabs' parts are gone. Original: delete react-ui-list `MasterDetail` and the current Tabs' `activePart`/`Viewport`/`BackButton`; ChatOptions, Welcome and VideoArticle compose Tabs + Splitter.
- [x] **Ref array presentation** — `ArrayPresentation({ ordered, display: 'tag' | 'title' })` annotation; Tag refs default to `'tag'`; `ordered` adds drag reorder (milestone 8/9). — `ArrayPresentation` annotation in echo; react-ui-form `FormFieldDispatch` reads it.
- [x] **`density` codemod** — scope-aware: drop where the enclosing scope yields it, hoist shared sizes, else Button `size`; report cross-file scopes. — applied at the cut-over; one `density=` use remains.

## Phase 4: react-ui-list and react-ui-form rewrite

Parallel `react-ui-list/next` and `react-ui-form/next` entries on `Next.*`, in the milestone order of
[AUDIT.md](./AUDIT.md) §5 (open questions in §6); each lands with stories, play tests, a parity table and one pilot plugin.

### Tasks

- [ ] **1. Foundations** — pane host, popup size decision, Container child span, Group stretch, required marker, depth-5 benchmark, `+1` fallback.
  - Done: `Next.Panel`, popup size inheritance, Group `fill`, Container `span` (point 7). Open: benchmark; the required marker is `Field.RequiredIndicator` (point 38).
- [x] **2. Next.Listbox** — Ark listbox (single/multiple), row pattern, selected/current styles.
- [x] **3. `react-ui-list/next` scaffold** — `./next` subpath, Listbox, ItemContent, import lint rule; pilot plugin-registry `PluginList`.
- [x] **4. OrderedList next** — Container rows, DragHandle, DropIndicator, Collapsible disclosure; pilot plugin-sheet `RangeList`.
  - Done: DragHandle (keyboard moves), DropIndicator, DragPreview, OrderedList, plugin-sheet `RangeList` pilot; AUDIT.md §6 points 16–20, 24 (Phase A2 below).
- [x] **5. Combobox trigger mode** — button trigger, input in popup, description, create row, async, VirtualTrigger; retire list Combobox/Picker.
  - Done on `Next.Combobox` (AUDIT §4.1 maps the list Combobox/Picker APIs). Open: the ObjectPicker story on it, with milestone 9.
- [x] **6. `react-ui-form/next` core** — parts, scalar renderers, `fieldMap`/`fieldProvider`/`createSelectField`; pilot plugin-thread `ChannelCreatePanel`. — shipped with the cut-over.
- [x] **7. Settings layout** — needs a decision (AUDIT.md §3.2); pilot plugin-pwa, plugin-excalidraw, plugin-settings. — shipped with the cut-over.
- [x] **8. Arrays and layout templates** — ArrayField, SelectOptionField, `Form.Layout`; pilot plugin-pipeline `PipelineProperties`. — shipped with the cut-over.
- [x] **9. Ref and lookup fields** — RefField, InlineRefField, ComboboxField, ObjectPicker; pilot plugin-space. — shipped with the cut-over.
- [x] **10. Higher-level form components** — ObjectProperties, ObjectForm, ViewEditor, FieldEditor, editor control frame; pilot plugin-map `MapViewEditor`. — shipped with the cut-over.
- [x] **11. Tree next** — Ark tree-view spike, virtualization, DnD, MasterDetail; pilot plugin-navtree. — the Ark Tree replaced the current one at the cut-over (react-ui-list `Tree`).
- [x] **`Panel.Body` plain slot** (AUDIT.md §6 follow-ups) — no built-in ScrollArea/Container; callers compose `Panel.Body asChild > ScrollArea.Root > ScrollArea.Viewport asChild > Container gutter='rail'`; Next callers in react-ui, react-ui-form/next (incl. `Form.Viewport scroll`) and plugin-registry updated.
  - [ ] Candidate preset (not built): the scrolling-body compose repeats in every form story and pane; decide at the cut-over whether a named composite (e.g. a `Panel.ScrollBody`-style helper) earns its place.
- [x] **Next theme hooks** (AUDIT.md §6 follow-ups) — `Next.useThemeMode`, `Next.usePlatform`, `Next.useIosKeyboard` on the existing ThemeProvider (`src/next/hooks.ts`, unit-tested); no `tx` in Next.
  - [ ] Candidate codemod step (undecided): map `useThemeContext()` reads of `themeMode`/`platform`/`hasIosKeyboard` onto the hooks; report remaining `tx` uses.
- [ ] **Follow-up PR after the cut-over: colour token naming** — rename the text emphasis tokens and utilities (`text-base-fg`/`text-description`/`text-subdued`, Typography/Icon `tone` values) together with every other `subdued`/`description` colour use (e.g. `border-subdued-separator`), reviewed as one naming pass; proposal on record: `--color-fg`/`-fg-muted`/`-fg-subtle`. The codemod's `emphasis` table stays empty until then.
  - [x] `animate` flag on `Tree.Root` (default on): port the current Tree's disclosure animation (rows fade in on open; height conceal before a close commits; user-driven only, not persisted open state; theme duration, 0 when reduced motion), working with `virtualize='window'`.
- [x] **Part naming** — DESIGN.md "Part naming" rules 1–13 applied (AUDIT.md §6 points 25–39): `Panel.Header`/`Body`/`Footer` (content-sized rows); Items render their default row from `item` or compose `ItemIcon`/`ItemText`/`ItemDescription`/`ItemIndicator`, with `ItemGroup`/`ItemGroupLabel` in Listbox and Combobox; Combobox `Control`/`Input`/`Trigger`/`ClearTrigger`; Menu `RadioItemGroup`/`TriggerItem`/`ItemShortcut`; `Field.RequiredIndicator` rendered by `Field.Label`; `Fieldset`; `SystemButton.Remove`; OrderedList `Content scroll`/`ItemText`; foreign re-exports dropped.

- [x] **A2. Next lists (AUDIT.md §6 group B)** — `virtual` (`fixed` windows via the shared `useVirtualRows`, `variable` is `content-visibility`); Ark owns selection in every list (`selectionMode='none'`), `listboxSelection` adapts `useListSelection` values; part-based rows and Root `columns` subgrids; the ARIA grid keyboard; `data-drop-target` from `useReorder`; `dx-row` states; default DragPreview chip; optional `getId` + `useStableIds`; `SystemButton.Remove` named by `ItemText`; collapsible `OrderedList.Item` + `Detail` with a caret-only trigger (DetailItem removed); `Label`/`Empty` parts; `ItemIcon` `hue`. Pilots: plugin-registry (icon hue), plugin-sheet `RangeList` (Label, Empty, part layout).
  - [ ] Reconcile `Next.Empty` with the A1 workstream's (this branch added a minimal one: `icon`, children, translated default).
  - [x] Tree adopts `useVirtualRows` (`virtual='fixed'`) in place of its own window — the helper gained `pinned` (the focused row stays mounted) and `measure` (skip animating rows); Tree rows take `dx-row` and draw the shared drop line; `Tree.Empty` is `Next.Empty`.

## Phase A1: Next foundations

The decided-but-unbuilt foundations of AUDIT.md §7 Phase A item 1 (decision review 2026-10-01, group A), plus the props
the classNames research and the react-ui-menu/next binding asked for.

### Tasks

- [x] **Container `span`** — a count or `'full'` on Container, `Field.Root` and `Fieldset.Root`, rendered from `data-span`; Container `Test`.
- [x] **Row cells name their own lines** — an inheriting Container in a `row` cell defines `content-*`/`full-*` across its track (spike 46); Container `Test` (side-by-side groups).
- [x] **`ControlFrame`** — exported; Input's `start`/`end` row is built on it; ring follows focus in its content.
- [x] **`Next.Empty`** — `icon`, text as children, translated "No items"; composite `Empty` parts are the lists workstream's.
- [x] **`Next.Banner`** — Root/Title/Body on a rail-gutter Container; no empty part.
- [x] **Fieldset group** — always `div role='group'` named by its Legend; `disabled` reaches Button, Switch, Checkbox, Input and Textarea through `useFieldsetDisabled`.
- [x] **`Input variant='mono'`**.
- [x] **`Image backdrop='dominant'`** — sampler shared from `@dxos/lit-ui`; host surface without CORS.
- [x] **Chrome strings** — `drag-handle.label`, `remove.label`, `empty.label` under the react-ui `translationKey`; `Next.DragHandle` label defaults; list DragHandle/DeleteButton and Dialog's delete off `osTranslations`.
- [x] **className props** — Container/Panel.Root `width='document'`; Typography `lines`, `mono`, `tone='subdued'`; Card.Title on Typography; Icon `tone`, `spin`, `size`; Button `align='start'`.
- [x] **Menu/Toolbar gaps** — Button `spin` and `iconSize`; `Toolbar.Separator variant='gap'`; Switch in the toolbar's roving focus; `Menu.TriggerItem disabled`; `virtualAnchor`/`useVirtualAnchor`.
- [x] **Menu item icon size** — `Menu.ItemIcon size` (Icon's); the binding maps `iconSize` onto it.
- [x] **Codemod gaps** — `Card.Action system='close'|'delete'` renders that `SystemButton` preset (its icon and translated label, `label` optional), rather than a second label table; `Block compact` keeps the block width and drops the fixed height (`data-compact`, DESIGN.md follow-up 39).
- [ ] **`dx-avatar` backdrop** — the shared sampler is ready; the avatar does not use it yet.

## Verification follow-ups

The cut-over verification ledger is archived ([VERIFICATION.md](../../docs/archive/VERIFICATION.md)). Many of its
`open` entries were fixed later in the PR without the ledger being updated.

### Tasks

- [ ] **Re-check the ledger's open entries against the current build** — V013–V022, V024–V051 (except fixed/verified), V064; close each with its commit or move it here as its own task.
