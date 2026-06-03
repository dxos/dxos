# Composer Theme: Monotonic Surface Elevation

Date: 2026-06-02
Status: Approved (design) — pending spec review
Branch: `claude/compassionate-mclaren-b485af`

## Problem

Composer's surface tokens in [`packages/ui/ui-theme/src/css/theme/semantic.css`](../../../packages/ui/ui-theme/src/css/theme/semantic.css)
are not organized as an ordered elevation system. Concretely (dark mode):

- **Five roles collapse onto `n-825`**: `toolbar`, `card`, `modal`, and (via `dx-modal-surface`)
  `popover` + `toast`. `card-surface` is _identical_ to `toolbar-surface`, so a card has no edge as it
  scrolls under the toolbar.
- **Overlays barely separate from content**: popovers/toasts/menus/dialogs all use
  `dx-modal-surface` (`n-825`), only one ramp step lighter than the deck (`n-850`); they rely on shadow +
  blur alone to read as floating.
- **The ramp is not monotonic by elevation**: the header (`n-875`) is _darker_ than the deck (`n-850`)
  it frames, and the toolbar (`n-825`) is _lighter_ than the deck yet equal to cards.

`DESIGN_SYSTEM.md` already describes an idealized ordered hierarchy, but the shipped CSS has drifted from it.

Two further component-level issues are bundled into the same branch (see §6, §7).

## Goals

1. A single, **strictly monotonic** elevation model: lighter = higher = closer to the viewer (dark
   mode); inverted toward white (light mode). No two adjacent named surfaces collide.
2. Encode it as an explicit **numbered elevation primitive** (`--dx-elevation-0…7`); every named surface
   points at exactly one level. (Approach "C" from brainstorming.)
3. Fix the two reported symptoms structurally:
   - Popovers/toasts/menus distinct from the background.
   - Cards distinct from the toolbar they scroll under.
4. Bundle two adjacent fixes: Message-button valence inheritance, and the `CreateObjectDialog` form
   nesting regression.

Non-goals: re-theming hue/status colors, touching the grid/sheet tokens, or restyling individual
plugins beyond what the token remap implies.

## The elevation model

A numbered scale, **z-order low → high**. The toolbar is a _raised, shadowed bar_ that floats above
scrolling content (decision "B" from brainstorming).

| Level | Name     | Roles (named surfaces)        | Dark  | Light |
| ----- | -------- | ----------------------------- | ----- | ----- |
| 0     | `void`   | window gaps, scrim base       | n-950 | n-200 |
| 1     | `rail`   | L0 icon rail                  | n-900 | n-175 |
| 2     | `chrome` | L1 / R0 / R1 sidebars, header | n-875 | n-150 |
| 3     | `canvas` | base, deck                    | n-850 | n-125 |
| 4     | `raised` | card, group, input            | n-825 | n-100 |
| 5     | `bar`    | toolbar (sticky, shadowed)    | n-800 | n-75  |
| 6     | `modal`  | dialog, modal                 | n-775 | n-50  |
| 7     | `float`  | popover, menu, toast, tooltip | n-750 | white |

Notes:

- **Strictly monotonic** in both modes. Dark mode has `950→750` of headroom, so eight distinct levels
  are comfortable. Light mode saturates at white, so the **light canvas darkens to ≈ n-125** (from
  today's near-white base) to leave `n-100 / n-75 / n-50 / white` for the raised tiers. Net effect: light
  theme reads slightly more "gray paper"; cards/toolbar/overlays clearly lift off it. _(Chosen over the
  keep-it-bright + shadow-only alternative.)_
- `n-775` is a **new neutral step** (dark: `color-mix(n-750, n-800)`), added to
  [`palette.css`](../../../packages/ui/ui-theme/src/css/theme/palette.css) following the existing
  `color-mix` interpolation convention. Light mode needs no new step (float = white).
- Card↔toolbar now a full level apart (`825` vs `800`) **plus** the toolbar's drop shadow as content
  passes beneath — the reported collision is gone.
- Floating overlays sit 2–3 levels above the deck — they pop without relying on shadow alone.

### Mockups

Rendered with real OKLCH values during brainstorming (persisted under
`.superpowers/brainstorm/`): `current-state.html` (the collisions), `proposed-state.html`,
`toolbar-direction.html` (A vs B), `final-system.html` (the locked B system, both modes).

## §5. Implementation — elevation primitive

### 5.1 Add the elevation scale (`semantic.css`)

Introduce an ordered, mode-aware primitive at the top of the `@theme` block:

```css
/* Elevation ladder — z-order low → high. Lighter = higher (dark); toward white (light). */
--dx-elevation-0: light-dark(var(--color-neutral-200), var(--color-neutral-950)); /* void   */
--dx-elevation-1: light-dark(var(--color-neutral-175), var(--color-neutral-900)); /* rail   */
--dx-elevation-2: light-dark(var(--color-neutral-150), var(--color-neutral-875)); /* chrome */
--dx-elevation-3: light-dark(var(--color-neutral-125), var(--color-neutral-850)); /* canvas */
--dx-elevation-4: light-dark(var(--color-neutral-100), var(--color-neutral-825)); /* raised */
--dx-elevation-5: light-dark(var(--color-neutral-75), var(--color-neutral-800)); /* bar    */
--dx-elevation-6: light-dark(var(--color-neutral-50), var(--color-neutral-775)); /* modal  */
--dx-elevation-7: light-dark(var(--color-white), var(--color-neutral-750)); /* float  */
```

`--color-neutral-775` is the only **new** ramp step (dark: `color-mix(n-750, n-800)`); light mode reuses
existing steps with the float tier going pure white. These are private `--dx-*` knobs, not utilities, so
they need no `@source inline`.

### 5.2 Re-point named surfaces at levels

Every existing `--color-*-surface` is redefined as `var(--dx-elevation-N)` — names unchanged, so consumers
(`bg-card-surface`, `dx-modal-surface`, …) keep working:

```css
--color-base-surface: var(--dx-elevation-3);
--color-deck-surface: var(--dx-elevation-3);
--color-card-surface: var(--dx-elevation-4);
--color-group-surface: var(--dx-elevation-4);
--color-input-surface: var(--dx-elevation-4);
--color-toolbar-surface: var(--dx-elevation-5);
--color-modal-surface: var(--dx-elevation-6);
--color-popover-surface: var(--dx-elevation-7); /* NEW */
--color-sidebar-surface: var(--dx-elevation-2);
--color-header-surface: var(--dx-elevation-2);
--color-l0-surface: var(--dx-elevation-1);
--color-l1-surface: var(--dx-elevation-2);
--color-r0-surface: var(--dx-elevation-2);
--color-r1-surface: var(--dx-elevation-2);
```

- `group-alt-surface`, `attention-surface`, `focus-surface` etc. are reconciled to the nearest level (to
  be confirmed during implementation; `attention-surface` currently aliases `focus-surface`).
- The matching `*-fg` tokens are reviewed for contrast at the new levels and adjusted only where a level
  moved enough to break legibility.

### 5.3 New `popover-surface` token + `dx-popover-surface` class

Add `--color-popover-surface` (level 7) and a `.dx-popover-surface` utility in
[`surface.css`](../../../packages/ui/ui-theme/src/css/components/surface.css) mirroring `.dx-modal-surface`
(with `backdrop-blur` + `--surface-bg`). Re-point the overlay theme files off `dx-modal-surface`:

- [`Popover.theme.ts`](../../../packages/ui/react-ui/src/components/Popover/Popover.theme.ts) → `dx-popover-surface`
- [`Toast.theme.ts`](../../../packages/ui/react-ui/src/components/Toast/Toast.theme.ts) → `dx-popover-surface`
- [`Menu.theme.ts`](../../../packages/ui/react-ui/src/components/Menu/Menu.theme.ts) → `dx-popover-surface`
- [`Dialog.theme.ts`](../../../packages/ui/react-ui/src/components/Dialog/Dialog.theme.ts) → stays `dx-modal-surface` (level 6)

### 5.4 Toolbar elevation + shadow

The toolbar moves to level 5 and gains a downward drop shadow so scrolling content reads as passing
beneath it. Reuse the existing `surfaceShadow()` elevation helper where toolbars are themed
([`Panel`](../../../packages/ui/react-ui/src/components/Panel/Panel.tsx) / toolbar theme) rather than a
bespoke shadow.

### 5.5 `DESIGN_SYSTEM.md` rewrite — see §8.

## §6. Message-button valence inheritance

**Goal:** a `Button` inside a `Message` adopts the message's valence color instead of the default neutral
fill.

**Mechanism (matches the existing token-re-derivation idiom):**
[`Message.Root`](../../../packages/ui/react-ui/src/components/Message/Message.tsx) already applies
`messageValence(valence)` and provides `valence` via context. Have it additionally set scoped CSS
variables for the valence hue (e.g. `--dx-fill`, `--dx-fill-hover`, `--dx-fill-fg`) the way `main.css`
re-derives `--surface-bg` inside `.dx-main-sidebar`. A new `buttonValence(valence)` in
[`valence.ts`](../../../packages/ui/ui-theme/src/util/valence.ts) returns the classes a button uses to
consume those vars.

**Token role:** use the existing solid-fill role `bg` / `bg-hover` (e.g. `bg-success-bg`,
`bg-success-bg-hover`, `text-success-fg`). There is **no separate `fill` role** — `DESIGN_SYSTEM.md`'s
mention of one is stale and is removed in §8, not implemented. (The brief's "`-fill`" means this `-bg`
role.)

`buttonValence(valence)` in [`valence.ts`](../../../packages/ui/ui-theme/src/util/valence.ts) returns the
classes a button uses for its fill/hover/ink, reading the scoped CSS variables that `Message.Root` sets
for the message's hue (the `--surface-bg` re-derivation idiom). Message and button stay in sync because
both derive from the same `valence`. Scope: `valence.ts`, `Message.tsx` (+ `Message.theme.ts`).

## §7. `CreateObjectDialog` form nesting

**Root cause:** the Form is rendered indirectly through `CreateObjectPanel`, which sits inside
`Dialog.Body` but does not participate in the Column grid that `Dialog.Body` propagates
(`withColumn.propagate()`). The Form then builds its own nested `Column.Root`, producing a
double-nested padded panel instead of flowing into the dialog's column layout.

- Broken: [`CreateObjectDialog.tsx`](../../../packages/plugins/plugin-space/src/containers/CreateObjectDialog/CreateObjectDialog.tsx)
  → [`CreateObjectPanel.tsx`](../../../packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx)
- Working reference: [`CreateSpaceDialog.tsx`](../../../packages/plugins/plugin-space/src/containers/CreateSpaceDialog/CreateSpaceDialog.tsx)
  places `Form.Root` as a **direct child** of `Dialog.Body`.

**Fix (recommended):** make the Form participate in the column grid — either render `Form.Root` directly
under `Dialog.Body` (hoist out of the wrapper for the schema-form branch), or give `CreateObjectPanel`'s
wrapper the propagation classes (`[.dx-column-root_&]:col-span-full` + subgrid) so the form column lines
up with the dialog's. Match the `CreateSpaceDialog` structure. Verify both branches of
`CreateObjectPanel` (schema form vs. type picker) still render correctly.

## §8. `DESIGN_SYSTEM.md` rewrite (done last)

The doc has drifted from the CSS and must be brought back in line as the final step:

- Replace the "Surfaces" and "Visual hierarchy" sections with the numbered elevation ladder (§3) as the
  source of truth; show the actual dark/light values per level.
- **Remove the `fill` role** from the naming-convention vocabulary and the "Adding a new token" guidance —
  it was never implemented. The hue roles are `bg / bg-hover / surface / fg / text / border`.
- Document `popover-surface` (level 7) and the `--dx-elevation-*` primitive.
- Reconcile the "State tokens" / consolidation tables against the shipped `semantic.css` while here (fix
  any other stale references noticed during implementation).

## Testing & verification

- **Storybook is the primary review surface.** Run from the worktree on a free port
  (`moon run storybook-react:serve -- --port 9014 --no-open --ci`) and drive with Playwright; never kill
  the user's :9009 server.
- Visual checks, both light and dark:
  - Card scrolling under the toolbar shows a clear edge + shadow.
  - Popover / menu / toast / tooltip clearly float above the deck.
  - Dialog over content; popover opened from within a dialog still reads above it.
  - Sidebars / header / rail form a coherent recessive frame; deck lighter than chrome.
- The two component items get/keep stories: a `Message` with a valence + button; the `CreateObjectDialog`
  form rendering flush in the dialog column.
- `moon run :lint -- --fix`, `moon run :test`, and a build of `ui-theme` + affected `react-ui*` packages.
- Audit diff for casts per CLAUDE.md.

## Risks

- Re-pointing surfaces shifts many screens at once; the light-canvas darkening is the most visible change
  and must be reviewed in-app, not just storybook.
- `*-fg` contrast at moved levels — review legibility on each surface.
- Adding the `fill` role (if Option A) touches every hue; mechanical but wide.

## Out of scope / follow-ups

- The two `bg-hover-surface`-as-resting-fill drift sites noted in `DESIGN_SYSTEM.md`.
- The commented-out `dx-tokens` re-derivation block in `surface.css` (hover/input/separator inside
  sidebar/modal) — revisit only if the remap makes it necessary.
