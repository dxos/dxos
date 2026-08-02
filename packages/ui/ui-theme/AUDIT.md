# UI Design System Audit

Audit of `react-ui`, `react-ui-list`, `react-ui-form`, and `ui-theme`, with particular attention to
`Panel`, `Column`, `Card`, the composable/slottable wrapper, elevation/surface tokens, Tailwind
patterns, and sizing/density. Replaces the previous token audit in this file and
`src/fragments/AUDIT.md`.

Method: direct review of the primitives and theme CSS, plus four exhaustive repo surveys
(Panel/Column/Card call sites; `dx-*` utility and surface-class usage; form/list internals;
control sizing and density). Counts below are from those surveys (ripgrep over `packages/**`,
10k+ TS/TSX files). All paths relative to the repo root.

---

## 1. Executive summary

The system has a small number of genuinely good ideas that are each undermined by partial
execution and parallel legacy mechanisms:

1. **The surface-relative state derivation is the best idea in the theme** — hover/current/selected
   computed from the host surface via relative oklch (`--surface-bg`) so highlights stay visible at
   any elevation. But it only activates through `dx-*-surface` zone classes that have **~13%
   adoption** (7 of 11 have zero consumers), and the violations start inside `react-ui` itself
   (`Panel.theme.ts:29`, `Toolbar.theme.ts:19` paint bare `bg-toolbar-surface`).
2. **There are three contradictory elevation ladders** — the table in `css/DESIGN_SYSTEM.md`, the
   header comment in `css/theme/semantic.css:13-24`, and the actual token assignments below it all
   disagree (e.g. card is documented as "raised, level 4", commented as level 3, and *assigned*
   elevation 1 — **below** the base canvas). The "strictly monotonic" claim is false in light mode
   (elevations 0≡1 and 3≡4 share values).
3. **Panel is universally adopted but shallowly conformant** (256 roots; only ~35% follow the
   canonical scroll shape; the most common defect — a missing `asChild` — is a one-token fix at 49
   sites). **Card is the success story** (~95% consistent, zero gutter-placement violations across
   78 roots). **Column is effectively unadopted** (19 roots, `Column.Bleed` has zero call sites)
   while at least ten components hand-roll the exact 3-track grid it provides.
4. **Sizing is not a scale, it's an archaeology**: 17 distinct control heights at fine pointer,
   two unbridged density systems (React context vs `.dx-density-*` CSS vars — and `.dx-density-md`
   doesn't even exist), a root font-size that flips 16px↔20px on pointer type, and a cascade-layer
   order that lets any `className` padding silently defeat density rules (`IconButton`'s `px-2`
   overrides all four button densities today).
5. **Docs and code have drifted apart** at every layer: stale docstrings (`Column.Block` claims
   `data-slot` placement; the attribute is set and never consumed), phantom APIs
   (`withColumn.bleed()` referenced, doesn't exist), dead classes (`dx-hover-row`, `dx-current-row`,
   `dx-toolbar`, `dx-row`), and dead tokens (`--spacing-icon-button-padding`,
   `--spacing-scroll-padding`, `--dx-input-*`, `--dx-lacuna-6/12` — zero consumers each).

The action plan (§8) sequences this into: decisions → truth/hygiene → surfaces → sizing/density →
Column/Form nesting → composition/enforcement.

---

## 2. The composable/slottable wrapper

`packages/ui/react-ui/src/util/slots.ts` — `slottable()`, `composable()`, `composableProps()`.

### What it gets right

- **It solves a real Radix failure mode.** `Slot` silently drops the injected `className`/`ref`
  when the child doesn't spread props/forward refs. The `COMPOSABLE` symbol check plus the
  `dx-slot-warning` visual makes an otherwise invisible bug visible.
- **`composableProps` gives a deterministic class merge**: part defaults → Slot-injected
  `className` → consumer `classNames`. This is the right precedence and it's in one place.
- **Narrow consumer types** (`SlottableProps<P>` / `ComposableProps<P>`) keep part APIs small
  while implementations still see full `HTMLAttributes`.

### Problems

1. **The failure handler is worse than the failure.** On an invalid `asChild` child, `slottable()`
   wraps the render result in an extra `<div role='none' class='dx-slot-warning'>`
   (`slots.ts:96-98`). Inside a grid/subgrid (exactly where these parts live) an extra div is a
   *layout-breaking* change — the diagnostic corrupts the thing it diagnoses. It should warn
   loudly (dev-only) and render unmodified, or apply the warning class to the rendered element
   via the class merge instead of wrapping.
2. **The check runs in production.** `Children.only` + symbol walk executes on every render of
   every `asChild` part. Cheap, but pure dev tooling — gate it on `process.env.NODE_ENV`.
3. **`role: 'none'` is defaulted universally** (`composableProps`, `slots.ts:38`). Every part
   renders `role="none"` unless someone remembers to pass a role. For pure layout divs that's
   defensible; for parts like `Card.Header` (a `<header>`!) it actively strips landmark
   semantics. The default belongs on the *parts that need it*, not in the shared prop merger.
4. **Adoption is half-done and the seams drop props.** `react-ui` uses the factories throughout;
   `react-ui-form` uses `composable()` for 6 of ~12 parts; `react-ui-list` mixes `composable()`
   with raw `forwardRef` that provably drops Slot-injected `className`
   (`Listbox.tsx:359-362`, `Picker.tsx:341-359`, `AccordionItem.tsx:67` — each spreads
   `...rest` then overwrites `className=`). `slottable()` has **zero** uses outside `react-ui`.
5. **Per-part boilerplate is still ~15 lines** (destructure `asChild`, `composableProps`,
   `Comp = asChild ? Slot : Primitive.div`, `tx(...)`, `displayName`). This invites the drift in
   (4). A `definePart({ tag, theme, defaultRole })` factory would collapse 90% of parts to one
   declaration and make the conventions (displayName, COMPOSABLE, classNames) impossible to skip.
6. **Consumers can't tell which parts are slottable.** `asChild` support is discoverable only by
   reading source. The type split (`SlottableProps` vs `ComposableProps`) helps, but nothing
   surfaces it in docs/stories.

**Verdict:** keep the mechanism — it's the right shape — but fix the warning wrapper, gate the
check to dev, remove the universal `role='none'`, add a part factory, and finish adoption in
`react-ui-form`/`react-ui-list` (three concrete `className`-drop bugs are open today).

---

## 3. The Column grid

`Column.Root` (3-track grid: gutter · `minmax(0,1fr)` · gutter) with `Row`/`Block`/`Center`/`Bleed`
parts and the `withColumn` helpers; `Card.Root` *is* a `Column.Root` (`gutter='lg'`).

### The concept is sound

A shared 3-track editorial grid — icons/actions pinned to gutters, content in the center track,
subgrid rows for pixel-aligned slots — is a legitimate, modern pattern, and Card proves it works:
zero placement violations across 78 `Card.Root`s and 200+ sub-parts.

### The execution has four placement mechanisms

For "put this child in the right track", the codebase currently uses **all** of:

| Mechanism | Where |
| --- | --- |
| `--dx-col` custom property (`grid-column: var(--dx-col, auto)`) | `withColumn.center()`, `css/components/card.css:11-13` (section children) |
| `.dx-gutter` marker class + `col-start-1/3` + `[&>*:not(.dx-gutter)]:col-start-2` | `Column.theme.ts:36,44`, repeated in `Card.theme.ts:31,60,78,93` |
| `data-slot='start'/'end'` attribute | **set** by `Column.Block`/`Card` parts, **consumed by nothing** — the docstring in `Column.tsx:169` ("Placement is via `data-slot`") is stale |
| Explicit `col-span-*` utilities as opt-out | `Card.theme.ts` (`poster`, `action`, `link`, `row fullWidth`) |

Plus `withColumn.propagate()` — an arbitrary-variant chain keyed on `.dx-column-root` *and*
`.dx-container` (`withColumn.ts:22-23`) — used by exactly two theme files. This is too many ways
to say the same thing; each has different behavior around `display: contents` children, and none
of it is discoverable without reading three files.

### Adoption reality

- **19 `Column.Root`s repo-wide, 5 in plugins.** `Column.Center` (28 uses) is mostly consumed as
  a *naked utility* inside `Dialog.Content`'s grid, not as part of a composed Column.
- **`Column.Bleed` has zero call sites** — including its own stories (`Column.stories.tsx:145`
  says "No Column.Bleed wrapper needed"). It is dead code, yet `Column.tsx:44` and the old
  `Column/AUDIT.md` name it the preferred ScrollArea wrapper. `Column/AUDIT.md` also documents
  class names (`dx-column`, `[.dx-column_&]`) that don't match the shipped `dx-column-root`, and
  `Column.tsx:48` references a nonexistent `withColumn.bleed()`.
- **≥10 hand-rolled 3-track gutter grids** duplicate `Column.Row`:
  `react-ui-thread/src/Message/Message.tsx:76`, `Thread/Thread.tsx:178`
  (`grid-cols-[var(--dx-rail-size)_1fr_min-content]`), `react-ui-chat/.../ChatDialog.tsx:109`,
  `plugin-simple-layout/.../AppBar.tsx:56`, `plugin-chess/.../Info.tsx:183`,
  `plugin-script/.../TestPanel.tsx:149`, `react-ui-form/.../ArrayField.tsx:232`, etc. Notably
  `react-ui-thread` re-implements the exact layout `react-ui`'s own `Message` builds from
  `Column.Row` + `Column.Block`.
- `subgrid` prop: **one** consumer (`plugin-inbox/.../ConversationStack.tsx:518` — correct and
  well-commented).

### Nesting is the structural failure (forms and cards)

`Form.Viewport` is a `Column.Root gutter='sm'` (8px) that, inside a Card (gutter 32px), spans
full and **declares its own tracks** instead of subgridding — so form fields inset 8px under a
card title inset 32px. The `gutter` prop that could mitigate is passed by **zero** call sites.
`Form.Root` renders no DOM (`display: contents` context), so subgrid can't propagate through it
either. Result: **three mutually exclusive idioms in production**, chosen per call site with no
API affordance:

1. `Form.Viewport` (owns its own gutter) — settings panels (`DefaultSettings.tsx:37`).
2. Bare `Form.Content` relying on `withColumn.center()` — cards
   (`plugin-trip/.../SegmentCard.tsx:106-120`, with an apologetic comment).
3. `Column.Center` + `Form.Content` — dialogs (`CreateObjectPanel.tsx:117-124`, whose comment
   documents why subgrid *can't* work through the `display: contents` wrapper).

Meanwhile `FormCard.tsx:118` and `ExpandoCard.tsx:66` ship idiom 1 inside cards — i.e. the
misalignment is live. `ArrayField.tsx:186` carries a `// TODO(burdon): Hacky.` `[--dx-col:auto]`
override — same root cause.

### Recommendations

1. **Pick one placement mechanism: the `--dx-col` custom property.** It's inheritance-based, so it
   survives `display: contents` wrappers (the failure mode of both subgrid and child selectors),
   and it's already the mechanism of record for `card.css` sections and `withColumn.center()`.
   Gutter blocks set their own explicit `col-start`; everything else defaults via
   `grid-column: var(--dx-col)`. Delete the unused `data-slot` writes and fix the docstrings;
   keep `.dx-gutter` only as the opt-out marker if the child-selector rule is retained during
   migration.
2. **Make nesting a first-class feature, not a per-call-site discovery.** `Column.Root` should
   detect (or accept) a host grid and become `subgrid` automatically; `Form.Viewport` must
   forward `subgrid`/`gutter` (or better: skip its own `Column.Root` when a host Column exists —
   the CSS can express this as `.dx-column-root .dx-column-root { … subgrid … }`). One documented
   idiom replaces the three current ones.
3. **Kill or promote `Column.Bleed`** — zero users; either delete it or make the canonical
   Panel/ScrollArea story actually use it. Same decision for `withColumn.propagate()`.
4. **Migrate the ten hand-rolled 3-track grids** (start with `react-ui-thread`, `react-ui-chat` —
   they're in the design system's own package family).
5. **Rewrite `Column`'s documentation once** (component docstrings, delete the stale
   `react-ui/src/components/Column/AUDIT.md`) so there is exactly one written story.

---

## 4. Panel and Card

### Panel (`react-ui/src/components/Panel`)

The shape (grid rows `auto 1fr auto` → toolbar/content/statusbar) is right, minimal, and adopted
everywhere: 256 roots across 217 files. Issues:

- **Conformance is shallow.** Of 258 `Panel.Content` sites: 35% are canonical
  (`asChild` → ScrollArea or a scroll-owning component), 19% delegate *without* `asChild`
  (49 sites — one-token additive fix), 17% wrap a hand-rolled flex/grid div (densest in
  devtools), and only 2 sites use the true anti-pattern (`overflow-y-auto` on a div). Only 22% of
  Panel files reference `ScrollArea` at all. `Panel.Toolbar` is healthiest (81% canonical
  `asChild` + `Menu.Root`).
- **`Panel.Toolbar` paints `bg-toolbar-surface` without publishing `--surface-bg`**
  (`Panel.theme.ts:29`) — every toolbar in the app has broken hover/selected derivation for its
  children (see §5). Same defect in `Toolbar.theme.ts:19`, which additionally references a
  nonexistent `.dx-toolbar` class.
- **Name collision:** `.dx-panel` in `css/components/panel.css` is an unrelated hue-tinted callout
  (22 near-identical rules that should be one rule with `light-dark()`/`var(--hue)`); it shares a
  name with the `Panel.*` composite. Rename one of them (suggest `.dx-callout`).
- `Panel.Statusbar` (21 uses) is fine as an optional row.

### Card (`react-ui/src/components/Card`)

The healthiest composite in the system — the subtlest contract (subgrid placement) with a perfect
usage record, plus a well-factored composition layer (`react-ui-card`'s `CardTile` =
`Mosaic.Tile > Focus.Item > Card.Root`, consumed by plugin-inbox). Residual issues:

- **~5 presentational card tiles are not `forwardRef`/composable** and so can't be slotted into
  `Focus.Item asChild` / `Mosaic.Tile asChild` (`plugin-simple-layout/.../NavBranch.tsx:100`,
  `plugin-thread/.../MessageThread.tsx:113`, `plugin-blogger/.../PostCard.tsx:49`,
  `plugin-projects/.../ObjectCard.tsx:51`, `plugin-tasks/.../OutlineCard.tsx:22`).
- `Card.Root` bakes `overflow-hidden` + `dx-card-surface` + width clamps into one class
  (`Card.theme.ts:20`); the width clamps (`dx-card-min-width`/`dx-card-max-width`) belong to the
  *host context* (a card in a Mosaic stack vs a card filling a dialog) and are already fought
  with `fullWidth`/`max-w-none!`.
- `Card.Menu`/`Card.ActionIconButton`/`Card.DragHandle` embed `IconButton` + translations —
  convenient, but they hard-pin geometry (see §6) rather than reading control-size tokens.
- Minor: `react-ui-rdf` ships a card-in-all-but-name (`FactViewer.theme.ts` — duplicated at two
  paths), and `react-ui-mosaic`'s `Board/Column.tsx` exports a kanban `Column` namespace that
  collides with the layout primitive's name.

---

## 5. Elevation, surfaces, and state (ui-theme)

### 5.1 Current state — three ladders, one truth needed

`semantic.css` defines `--dx-elevation-0…8` and aliases named surfaces onto it. The three
descriptions disagree:

| Surface | DESIGN_SYSTEM.md table | semantic.css comment | **actual assignment** |
| --- | --- | --- | --- |
| deck/void | 0 | 0 | 0 |
| l0 rail | 1 | 1 | **2** |
| sidebar/header/l1/r0/r1 | 2 | 2 | **3** |
| base/deck canvas | 3 | 1 | **2** |
| card | 4 | 3 | **1** (below base!) |
| group/input | 4 | 4 | **5** |
| toolbar | 5 | 5 | **4** |
| modal (dialog) | 6 | 5 | 6 |
| popover/menu/toast | 7 | 6 | 7 |
| elevation-8 | — | — | defined, unused |

Additional defects:

- **Light-mode monotonicity is broken**: `--dx-elevation-0` ≡ `-1` (`neutral-300`) and `-3` ≡ `-4`
  (`neutral-125`) — so "strictly monotonic, z-order low → high" (`semantic.css:14`) is false, and
  card ≡ deck, sidebar ≡ toolbar in light mode.
- **Cards sit *below* the canvas in dark mode** (card = n-925, base = n-900): cards render as
  recessed wells, while **sidebars sit *above* the canvas** (n-875). Prior art (Claude Code
  desktop, Linear, Slack) does the opposite on both counts: chrome recedes below the canvas,
  content surfaces (cards/panels) rise above it. Claude desktop's dark ontology, for reference:
  `sidebar #0B0B0B < main #0D0D0D < panel #131313/#161616 < input #1F1F1F <
  hover/selected #242424` — five levels plus derived states, nothing more.
- **Role/level conflation.** "Toolbar" is a *role*; its level depends on context (a toolbar in a
  card ≠ the topbar). A fixed `toolbar-surface → elevation-4` mapping cannot express nesting, and
  is why `Panel.Toolbar` at every depth paints the same color today.

### 5.2 The state-derivation mechanism is right — the delivery isn't

`semantic.css:163-193` + `surface.css:70-108`: hover/current/selected are derived from
`--surface-bg` via relative oklch (∓0.02/0.08/0.10/0.12 L), so a highlight is visible on any
surface. Two delivery problems:

1. **Zones are the only activation path and nobody uses them.** Surface entry must go through a
   `dx-*-surface` class (which paints *and* publishes `--surface-bg`). Measured adoption: **25
   zone-class uses vs ~164 bare `bg-*-surface` zone roots (~13%)**. `dx-base/deck/sidebar/header/
   group/input/toolbar-surface` have zero consumers. The l0/l1/r0/r1 chrome surfaces have **no
   zone class at all**, so the deck chrome structurally can't publish `--surface-bg`.
2. **The derivation block is duplicated** — the oklch formulas appear once in `semantic.css`
   (root fallback) and again in `surface.css` for the zone list, with a comment demanding they be
   kept in sync manually.

The duplication is unnecessary: since the derived tokens reference `var(--surface-bg)` (which
inherits), a **single universal rule** on a common selector re-derives per element, and each zone
then only needs to set `--surface-bg`:

```css
[data-surface] {
  background-color: var(--surface-bg);
  --color-hover-surface: light-dark(oklch(from var(--surface-bg) calc(l - 0.08) c h),
                                    oklch(from var(--surface-bg) calc(l + 0.08) c h));
  /* …current/selected/subtle, once… */
}
[data-surface='base']   { --surface-bg: var(--dx-elevation-base); }
[data-surface='raised'] { --surface-bg: var(--dx-elevation-raised); }
```

### 5.3 Proposed normative ontology

Separate three orthogonal axes that are currently entangled:

- **Level** (z-order, ~6 stops — the *only* thing the neutral ramp encodes),
- **Role** (semantic alias naming a UI region — maps to a level, provides the vocabulary),
- **Aspect** (state of an element *on* a level: rest / hover / selected / selected-hover /
  current / focus — always **derived** from the level's surface, never hand-assigned).

**Levels** (dark values shown; light mirrors with distinct stops — fix the collisions):

| Level | Name | Dark | Roles mapped |
| --- | --- | --- | --- |
| 0 | `sunken` | n-950 | scrim base, wells, deck gaps |
| 1 | `chrome` | n-925 | sidebar, topbar, l0/l1/r0/r1, statusbar |
| 2 | `base` | n-900 | document canvas, attention zone (rest) |
| 3 | `raised` | n-850 | cards, side panels, group, input fields |
| 4 | `overlay` | n-800 | dialogs, sheets, drawers (with scrim below) |
| 5 | `popup` | n-775 | popover, menu, toast, tooltip |

This covers the required set — base document (`base`), sidebar/topbar (`chrome`), side panels and
cards (`raised`), dialogs (`overlay`), popovers (`popup`) — with **toolbars deliberately absent**:
a toolbar is a *bar on its container* and should take the container's surface (optionally +1 ramp
stop via a derived `--color-bar-surface: oklch(from var(--surface-bg) …)` token, exactly like
hover), not a global level. That fixes both the nesting problem and the current oddity of a
"toolbar level" that sits between cards and dialogs.

**Aspects** are the existing oklch derivation, formalized: every level gets
`hover / hover-subtle / current / current-hover / selected(=current) / bar / separator` computed
from `--surface-bg` by the single universal rule above. Hand-assigned per-surface state tokens are
deleted. Off-ladder tokens remain explicitly off-ladder and documented as such (`input-bg`
control fill, grid/sheet "paper", scrim, inverse).

**Direction decision (needs sign-off):** flip `chrome` below `base` and `card` above `base`
(matching Claude/Linear/Slack and both of this repo's own docs), or keep the current inverted
order and rewrite the docs to match. The proposal above assumes the flip. Either way there must
be exactly **one** written ladder, in `semantic.css`, generated into `DESIGN_SYSTEM.md`, with the
light ramp given six distinct stops.

**Delivery mechanism:** one `data-surface="<level|role>"` attribute (or the `dx-*-surface`
classes rewritten to only set `--surface-bg`), applied by the owning primitives — `Main`,
`Dialog.Content`, `Popover.Content`, `Card.Root`, `Panel.Toolbar` — so plugins almost never touch
surface classes directly. Bare `bg-*-surface` on a zone root becomes lint-detectable (§8).

---

## 6. Tailwind patterns

### 6.1 Layers vs utility classes — the cascade trap

`main.css:12` pins the layer order `…, dx-components, utilities`. Utilities intentionally win —
right for layout overrides, **fatal for geometry tokens**: any `px-*`/`h-*` emitted by a TS theme
file into `className` beats every `@layer dx-components` density rule regardless of specificity.
Live consequence: `IconButton.theme.ts:16` emits unconditional `px-2`, silently overriding all
four `.dx-button[data-density]` paddings. State utilities already pay the `!important` tax for
the same reason (`state.css` comments).

**Rule to adopt:** *component geometry (heights, paddings, radii) and surface colors live in
`@layer dx-components` CSS driven by custom properties and `data-*` attributes; `tx()`/TS theme
files emit only variant→attribute mappings and layout hints.* The `dx-button` +
`data-density`/`data-variant` pattern is the model; `Input`, `IconButton`, `Select.Item`,
`Menu.Item`, toolbar items should follow it. This is also the precondition for the density
system (§7) — tokens can't win until padding leaves `className`.

Related: two theming systems coexist (TS `*.theme.ts` via `tx()`; CSS `dx-*` component classes).
The TS themes are additionally **not overridable** — `formSlots`/`listSlots` are exported "for
`bridgeTv` registration" but nothing registers them (`bridgeTv` is referenced only by its own
test), and neither is exported from the package index. Dead API surface; either wire theme
overriding or delete the hooks.

### 6.2 `dx-container` / `dx-expander` / friends

- **`dx-container` (114 uses) and `dx-expander` (43) have won** — only ~5 hand-rolled
  `flex-1 min-h-0` remain (~97% adoption). Keep them; clean the ~14 sites that redundantly stack
  `overflow-hidden`/`h-full` on top, and reconcile the `min-bs-0` logical-property dialect
  (6 sites in 2 files) to `min-h-0` per the physical-sizing convention.
- **`dx-fullscreen` is unadopted** (4 uses vs 60 `absolute inset-0`) — adopt it mechanically or
  delete it. **`dx-column` is dead** (1 real use) and its name collides with the `dx-column-root`
  marker — delete.
- Document the trio's contract in one place: `dx-expander` = fill + allow shrink;
  `dx-container` = that + clip; clipping is exactly why outset focus rings die and
  `dx-ring-pseudo` exists. The three are one system and should be documented as one.

### 6.3 Focus and rings

- **`dx-ring-pseudo` is the right approach** (ring on an `::after` above children; inset, so it
  survives ancestor clipping in scroll areas) and `dx-current` already uses it. It should become
  the *single* ring mechanism.
- **`focus.css` is a 17-class zoo** (`dx-focus-ring`, `-inset`, `-always`, `-group`, `-group-x`,
  `-group-y`, each × `-always`, `-inset-over-all`, `-main`, `-subdued`, `-static`…) with heavy
  internal duplication and box-shadow rings that need `z-[1]` hacks. Target: ~4 primitives —
  `dx-focus-ring` (pseudo-based), an inset variant, a group-indicator variant, and `-none` —
  with `:focus`/`:focus-visible` as a modifier, not a class-name fork. The old AUDIT already
  found the `-always` family unused.
- 86 raw `ring-*` usages exist outside the sanctioned classes; most are decorative, but
  selection/current rings should ride `dx-current`/`dx-ring-pseudo`.

### 6.4 State utilities (`dx-hover` / `dx-selected` / `dx-current`)

The ARIA-bound grammar (`state.md`) is good and the primitives that matter (`Listbox`,
`OrderedList`, `Picker`) follow it. Defects:

- **~36 hand-rolled state sites** vs ~53 sanctioned uses — including inside `react-ui` itself
  (`Menu.theme.ts:28` hand-rolls what `dx-highlighted` does; `Calendar`/`DatePicker`/`Slider`
  themes hand-roll `hover:bg-hover-surface`).
- **`dx-hover-row` / `dx-current-row` have zero consumers** while `Timeline.tsx:350` re-implements
  exactly them inline — and also references `dx-row`, a class that doesn't exist (the same silent
  no-op trap `state.md` documents for `dx-active`).
- `Tree` uses a bespoke `is-current:` variant + `aria-current='location'`, which `dx-current`
  (bound to `aria-[current=true]`) can never match — either widen the binding to
  `[aria-current]:not([aria-current='false'])` (the `is-current` variant already exists in
  `main.css:141`) or normalize Tree.
- `ui-theme/src/fragments/hover.ts` (`ghostHover`) is a sanctioned parallel API that legitimizes
  hand-rolling — delete it.
- The camelCase-token migration is >99% done; 11 dead-class stragglers remain (all no-ops, e.g.
  `bg-activeSurface` ×3, `bg-hoverOverlay` ×2) — mechanical cleanup.

---

## 7. Sizing, padding, density

### 7.1 What exists

- **17 distinct control heights** at fine pointer (4, 16, 20, 24, 26, 28, 32, 36, 40, 48, 49px …),
  from five sources: `button.css` densities (24/28/32/40), the parallel
  `fragments/density.ts` used only by `Input` (which disagrees with button padding at every
  density and with button *height* at coarse-md), per-component hardcodes (`Select.Item` 32,
  `Menu.Item` 36, `Calendar` 28/36, `input.triggerIcon` 28), the `--dx-rail-*` arithmetic
  (32/40/48/49 — with a `+1px` border fudge leaking 49px into a dozen layouts), and raw
  `h-7`/`h-8`/`h-[24px]` literals.
- **Root font-size flips 16px↔20px on pointer type** (`plugins/main.css:7-14`), so every
  rem-based "size" is two sizes; the coarse world produces a second non-overlapping scale
  (30/35/40/50/61px). Comments in `spacing.css` quoting px values are wrong at coarse (and
  `--dx-topbar-size` is 49, not the commented 50, even at fine).
- **Two density systems, no bridge**: React `Density` context (read by exactly 4 components:
  Button, Input, SegmentedInput ×3 hooks; provided in 5 places) vs `.dx-density-*` CSS classes
  that set three `--spacing-*` vars **no control consumes**. `.dx-density-md` is used in 5 places
  but *not defined*; `sm` and `xs` are byte-identical; `tw-merge-config.ts:25` lists the
  nonexistent class and omits the existing one. `Toolbar` accepts `density` but doesn't provide
  it to children, so a `sm` toolbar renders `md` (32px) buttons and clips.
- **Padding tokens are unconsumed**: 44 hard-coded padding utilities across `react-ui` theme
  files vs **zero** token-based; `--spacing-icon-button-padding`, `--spacing-scroll-padding`,
  `--dx-input-{sm,md,lg}`, `--dx-lacuna-6/12` have zero consumers. `react-ui-form`'s default
  variant has **no tokenized spacing at all** (its `fieldSet`/`field`/`fieldControl` slots are
  empty strings, locked in by a test); rhythm is an emergent side effect of `h-8` labels.
- `--dx-rail-item` (32px) is the de-facto row/icon-slot unit and is honored by
  Icon/Column/Card/Input.Block/OrderedList — but not by `Listbox.Item` (~40px), `Picker.Item`
  (~28px), `Accordion` (24px), or anything in `react-ui-form` (raw `h-8`/`size-8`).

### 7.2 Target model — one scale, one mechanism

**(a) Three control sizes.** Adopt exactly three, named by role, defined once in
`theme/spacing.css`:

```css
--dx-control-sm: 1.5rem;  /* 24px fine / 30px coarse */
--dx-control-md: 2rem;    /* 32px fine / 40px coarse */
--dx-control-lg: 2.5rem;  /* 40px fine / 50px coarse */
--dx-control: var(--dx-control-md);
```

Decisions this forces (all recommended):

1. **Keep rem** (the pointer-coarse enlargement is a *feature* — free touch targets); document
   that "24/32/40" means "at fine pointer". The alternative (absolute px) breaks touch ergonomics
   and `lit-grid` interop for no gain.
2. **Kill the 28px step** (`sm` today). Density collapses `xs|sm|md|lg` → `sm|md|lg`. Every
   current 28px site (`h-7`, `size-7`, `min-h-[1.75rem]`, `Calendar`, `input.triggerIcon`,
   form's `CompactIconButton`) maps to `sm` (24) or `md` (32).
3. **Derive the rails instead of the controls**: `--dx-rail-item: var(--dx-control-md)`,
   `--dx-toolbar-size: var(--dx-control-lg)`, topbar = `3rem` on the same grid, and **drop the
   `+1px` fudge** (borders belong to the border-box or a separate separator element, not the
   size token).
4. **Non-density controls land on the grid**: `Select.Item`/`Menu.Item` → `md`; scroll buttons,
   accordion bands → `sm`; `Calendar` day cells → `md`. `Tag` stays font-metric (documented
   exception, like checkbox/switch glyphs).

**(b) One density mechanism, CSS-var based.** `DensityProvider` stops being a data source that
four components poll and becomes a *class emitter*: it renders `dx-density-{sm,md,lg}` (all three
defined!), and the classes set the variables:

```css
.dx-density-sm { --dx-control: var(--dx-control-sm); --dx-control-pad: var(--spacing-trim-xs); }
.dx-density-md { --dx-control: var(--dx-control-md); --dx-control-pad: var(--spacing-trim-sm); }
.dx-density-lg { --dx-control: var(--dx-control-lg); --dx-control-pad: var(--spacing-trim-md); }
```

Components consume only the vars, in `@layer dx-components`:
`.dx-button { min-height: var(--dx-control); padding-inline: var(--dx-control-pad); }` — which
simultaneously fixes the cascade trap (§6.1), the Button/Input padding disagreement, the
Toolbar-doesn't-propagate bug (a class on the toolbar root densifies all children, including
`react-ui-menu` items, with zero React plumbing), and deletes `fragments/density.ts`. The
`data-density` per-component attribute remains only as a local *override*.

**(c) One spacing ramp for all `react-ui-*` packages.** `--spacing-trim-{xs,sm,md,lg}` is today
4/8/12/24 — add `16` (rename `lg`→`xl` or insert `trim-lg: 1rem`) so the ramp is 4/8/12/16/24,
then express the other spacing families as aliases onto it: `--dx-gutter-sm/md/lg` = trim-sm/
trim-lg(16)/32, `--spacing-form-*` = trims, list item insets = trims. Then sweep the theme files:
`react-ui-form` (`gap-3`, `px-2 pb-2`, `h-8` → `gap-trim-*`, `p-trim-*`, `min-h-(--dx-control)`),
`react-ui-list` (three different item insets → one), `react-ui` themes (44 hard-coded paddings).
The rule of thumb after the sweep: **a `p-*`/`gap-*` literal in a `*.theme.ts` is a review
defect** unless annotated as intentionally off-ramp.

---

## 8. Action plan

Ordered so that every phase leaves the tree consistent; each item names an owner artifact.
Phases 2–4 are independent of each other after Phase 1.

### Phase 0 — Decisions (sign-off needed, no code)

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Elevation order: chrome vs base vs card | Flip to `chrome < base < raised` (§5.3); matches prior art and both existing docs |
| D2 | Level vocabulary | 6 levels: `sunken, chrome, base, raised, overlay, popup`; toolbar becomes a derived *aspect* (`bar`) of its host surface, not a level |
| D3 | Control scale | rem-based `--dx-control-{sm,md,lg}` = 1.5/2/2.5rem; 28px step eliminated |
| D4 | Surface delivery | `data-surface` attribute + one universal derivation rule; zone classes become thin aliases during migration |
| D5 | Geometry ownership | heights/paddings move from `className` (TS themes) into `@layer dx-components` vars (§6.1) |

### Phase 1 — Truth & hygiene (small PRs, no visual change)

1. **One ladder.** Rewrite `semantic.css` assignments + header comment + `DESIGN_SYSTEM.md` to a
   single story per D1/D2; give light mode six distinct stops (fix 0≡1, 3≡4); delete unused
   `--dx-elevation-8`.
2. **Delete dead surface**: `dx-hover-row`, `dx-current-row` (or adopt in Timeline), `dx-column`,
   `withColumn.propagate()` if unadopted, `Column.Bleed` (per §3.3 decision), `ghostHover`
   fragment, `densityBlockSize`, `--spacing-icon-button-padding`, `--spacing-scroll-padding`,
   `--dx-input-*`, `--dx-lacuna-6/12`, `.dx-panel` → rename `.dx-callout`, duplicate
   `--dx-hair-line` block in `spacing.css:96-105`, duplicate `react-ui-rdf` theme file.
3. **Fix stale docs/no-ops**: `Column.tsx` docstrings (`data-slot`, `withColumn.bleed()`), delete
   `react-ui/src/components/Column/AUDIT.md` + `react-ui/AUDIT.md` + `Focus/AUDIT.md` or fold
   into package docs; kill `dx-row` (Timeline), 11 camelCase stragglers, `dx-toolbar` reference;
   fix `tw-merge-config.ts` density list; correct the px comments in `spacing.css`.
4. **Cheap conformance wins**: add missing `asChild` at the 49 Panel.Content delegation sites;
   fix the two `overflow-y-auto` panels; fix the one `ScrollArea.Root` missing `asChild`.

### Phase 2 — Surfaces & aspects

1. Implement the universal derivation rule + `data-surface` levels (D4); collapse
   `surface.css` to per-level one-liners; keep `dx-*-surface` classes as aliases that set only
   `--surface-bg`.
2. Wire the owning primitives: `Main`/deck chrome (`l0/l1/r0/r1` get zones at last),
   `Panel.Toolbar` + `Toolbar.Root` (bar aspect of host surface), `Dialog.Content`,
   `Popover`/`Menu`/`Toast` (already correct), `Card.Root` (already correct).
3. Migrate the ~164 bare `bg-*-surface` zone roots (scriptable: the survey has the list;
   leaf/decorative uses stay).
4. Widen `dx-current` to `[aria-current]:not([aria-current='false'])` or normalize Tree; route
   `Menu`/`Calendar`/`DatePicker`/`Slider` themes through `dx-hover`/`dx-highlighted`.

### Phase 3 — Sizing & density

1. Land `--dx-control-*` tokens + rewritten `.dx-density-*` classes (D3, §7.2b); make
   `DensityProvider` emit the class; keep `data-density` as local override.
2. Move button/input/select/menu/toolbar geometry into `@layer dx-components` var-driven rules
   (D5); delete `fragments/density.ts`; reconcile Button vs Input padding.
3. Re-derive rails: `--dx-rail-item`/`--dx-toolbar-size` etc. from control tokens; remove the
   `+1px` fudge; `Toolbar.theme.ts` consumes `--dx-toolbar-size`.
4. Sweep escape hatches (`min-h-1!`, `min-h-0 h-7 w-7 p-0`, `size-8`, …) onto the scale; extend
   `--spacing-trim-*` ramp (add 16) and alias `--dx-gutter-*`/`--spacing-form-*` onto it; sweep
   the 44 hard-coded paddings in `react-ui` themes and the form/list themes (§7.2c).
5. Give `react-ui-form`'s default variant tokenized rhythm (`Form.Content` gap, field row
   min-height = `--dx-control`), and land list items on the grid.

### Phase 4 — Column & Form nesting

1. Single placement mechanism (`--dx-col`); remove dead `data-slot` writes; consolidate the
   repeated `[&>*:not(.dx-gutter)]` selectors into one shared fragment/CSS rule.
2. Subgrid nesting: `Column.Root`-in-`Column.Root` adopts host tracks; `Form.Viewport` forwards
   `subgrid` (or skips its own root inside a host Column); document the one canonical
   form-in-card/dialog idiom and migrate the three current idioms + `ArrayField` hack.
3. Migrate hand-rolled 3-track grids (`react-ui-thread`, `react-ui-chat`, `plugin-simple-layout`
   AppBar, chess/script/devtools panels).
4. Gutter scale: `--dx-gutter-*` values from the unified spacing ramp (§7.2c).

### Phase 5 — Composition & enforcement

1. `slots.ts`: dev-gate the COMPOSABLE check; replace the wrapper-div warning with a non-layout
   signal; drop the universal `role='none'`; add a `definePart()` factory.
2. Finish `composable()` adoption in `react-ui-form`/`react-ui-list`; fix the three
   `className`-drop sites; make the ~5 non-composable card tiles `forwardRef`.
3. Enforcement (keeps all of the above from regressing):
   - ESLint: `dx-selected`/`dx-current` require the paired ARIA attribute; unknown `dx-*` class
     names (catches `dx-row`/`dx-active`); `bg-*-surface` on an element that also sets
     `overflow`/`grid`/`flex` container roles without `data-surface`; raw padding literals in
     `*.theme.ts`.
   - Storybook: a `Theme.stories` page rendering the 6 levels × aspects matrix and the 3 control
     sizes, so regressions are visible in review.
4. Either wire theme overriding (`bridgeTv`) or delete `formSlots`/`listSlots` and the hook.

### Metrics to re-run after each phase

| Metric | Today |
| --- | --- |
| Surface-zone adoption (zone class vs bare `bg-*-surface` roots) | ~13% |
| Panel canonical scroll shape | ~35% (54% after Phase 1.4) |
| Distinct control heights (fine pointer) | 17 |
| Hand-rolled 3-track grids | ≥10 |
| Hand-rolled state styling sites | ~36 |
| Dead `dx-*` classes / dead tokens | 6 / 8 |
