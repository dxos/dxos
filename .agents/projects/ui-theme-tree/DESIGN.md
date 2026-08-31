# ui-theme-tree — Design

Audits of the DXOS theme (surfaces, density) against shadcn/ui and Ark UI, the dx-preview hover
card, and the decision + architecture for rebuilding the Tree on `@ark-ui/react` to replace the
composer navtree.

## 1. Theme audit: surfaces & density vs shadcn/ui & Ark UI

### 1.1 The three models

| | DXOS | shadcn/ui | Ark UI |
|---|---|---|---|
| Token model | 3 tiers: palette ramp → hue roles → semantic surfaces/aspects | Flat semantic pairs (`--card` / `--card-foreground`, …) | **None** — headless, `data-scope`/`data-part`/`data-state` only |
| Light/dark | `light-dark()` + `.dark` flips `--dx-lift` (derivation direction) | Same vars re-declared under `.dark` | Consumer's problem |
| Elevation | 6-level lightness ladder (sunken→popup), *lighter = higher in both themes*; chrome sits **below** the canvas | No ladder; `--background`≈`--card`≈`--popover` differ ad hoc per theme | n/a |
| Hover/selection | **Derived from the host surface** via relative oklch (`--surface-bg` + lift × attenuate × offset) | Fixed (`--accent`, `--muted`) — same color on every surface | n/a |
| Borders | 4 separator strengths derived per surface | Single `--border` (+`--input`, `--ring`) | n/a |
| Density | 3 CSS variables (`--dx-control`, `--dx-control-pad`, `--dx-control-leading`), class + data-attr | Per-component cva `size` variants | None |
| Radius | Static 5-value scale (no `--radius-xs` — silently falls back to Tailwind's) | Single `--radius` knob → derived sm…4xl | n/a |
| Shadows | None (elevation = lightness + backdrop-blur) | `shadow-md` etc. on components | n/a |

### 1.2 Contrast at elevation (the core question)

DXOS's distinctive mechanism: every interaction aspect is computed **relative to the surface that
hosts it** —

```
aspect = oklch(from var(--surface-bg) calc(l + lift · attenuate(family) · offset) c h)
```

- `--dx-lift` = −1 light / +1 dark ("away from the canvas"), so hover/selection always move in the
  direction that reads as emphasis on that theme.
- Offsets (dark = reference): hover-subtle 0.02 · hover 0.08 · current 0.10 · current-hover 0.12 ·
  toolbar 0.025 · well 0.05 · separator-line 0.166 · input/subdued/primary separators
  0.115/0.089/0.064 · placeholder 0.30 · scrollbar 0.23–0.34.
- Light attenuates per family (state/well ×0.5, separator ×0.75, separator-line ×0.45) because
  lightness deltas read stronger near white.

**Consequence:** the *perceived* ΔL of hover/selection/borders is constant at every elevation — a
selected row on the popup surface (L 0.242 dark) and on the sunken surface (L 0.145 dark) both sit
exactly +0.10 above their host. shadcn cannot express this: `--accent` is one fixed color, so on
any surface that isn't `--background` the hover delta is *whatever happens to result* — on a dark
`--card` (L 0.205) vs `--background` (0.145) the same `--accent` (0.269) yields ΔL 0.064 vs 0.124,
i.e. hover fades as elevation rises, and on the `--popover` in some themes it nearly vanishes.

Empirical per-level tables (browser-resolved values, both themes, WCAG contrast for fg tokens and
ΔL for aspect tokens) are in §1.3 — measured, not derived from the CSS, so they include the
attenuation and any zone re-declaration bugs.

The costs of the DXOS model, seen in the audit:

1. **Zone repetition** — CSS custom properties substitute per scope, so the ~12 aspect formulas are
   re-declared verbatim in every zone selector list in `surface.css`; aliases must be re-declared
   per zone or freeze at `:root`. shadcn has no equivalent maintenance surface.
2. **A bare `bg-*-surface` utility does not publish `--surface-bg`** — painting a surface without
   entering the zone silently collapses every aspect inside onto base. This is the theme's sharpest
   footgun; nothing lints it.
3. **Thin spots** confirmed by comparison: no `--radius-xs` (most-used radius resolves to the
   Tailwind default, an accident that happens to look right), `--radius` (bare) is dead, and there
   is no shadow ramp at all (deliberate, but it makes the popup/overlay distinction rest entirely
   on ΔL 0.03 + backdrop blur).

### 1.3 Measured surfaces (filled in by the probe — see `contrast-probe` results)

_To be appended: per-level resolved colors + ΔL for hover/current/separator families, per theme._

### 1.4 Density

DXOS: `Density = 'lg' | 'md' | 'sm'` → three variables (`--dx-control` 40/32/24px,
`--dx-control-pad`, `--dx-control-leading`), delivered by React context (components stamp
`data-density` on themselves) or subtree class (`dx-density-*`). Fixed chrome sizes derive from the
same scale (`--dx-toolbar-size` = control-lg, `--dx-statusbar-size` = control-md,
`--dx-rail-item` = control-md), so bars and their controls share one grid, and the rem basis makes
pointer-coarse scale everything by root font-size.

shadcn sizes each component with cva `size` variants (`h-9`/`h-8`/`h-10` hard-coded per
component) — no shared knob, no subtree density, no coarse-pointer scaling. Ark ships nothing.
**Verdict: our density model is strictly more capable; nothing to adopt.** The one scar worth
keeping in mind: `Toolbar.Root` must emit both the class *and* the provider because controls stamp
`data-density` from context (see #12839 finding).

## 2. dx-preview hover card (implemented)

Mechanism recap: `dx-anchor` (Lit) dispatches `DxAnchorActivate`; hosts (EditorPreviewProvider in
storybook, plugin-preview → plugin-deck in Composer) open a virtual-trigger Popover. `state: false`
was already the close contract.

Design (shadcn HoverCard semantics, single implementation point):

- **The Lit element owns hover intent** — works identically under both hosts with zero host
  logic. New `trigger` property: `'hover'` (default) | `'click'`. Open delay 400ms (in-repo
  `HOVER_CARD_DELAY` precedent; shadcn 700, Ark 600), close grace 300ms (= shadcn/Ark).
- While hover-open, a document-level `pointerover` listener keeps the card alive when the pointer
  is over the anchor **or** any `[data-dx-popover-content]` element (attribute now stamped by
  `Popover.Content`; the constant lives in `@dxos/ui-types`, the shared dependency of `lit-ui` and
  `react-ui`). Anything else re-arms the 300ms close.
- **Click pins**: a click (or Enter/Space — added, since `role=button` on a non-button gets no
  native key activation) opens without leave-to-close; dismissal reverts to outside-click/Escape.
  Keyboard `:focus-visible` opens like a hover; blur closes with grace.
- Touch pointers never hover-open.
- Hosts close immediately on `state: false` (the element owns all grace timing).
  `EditorPreviewProvider` previously ignored `state` — it would have re-*opened* on the close
  event; fixed. plugin-preview already handled it (with the activation-sequence race guard).
- **Animation**: shadcn recipe (fade + zoom-from-95% at the anchor-side transform origin), added as
  theme tokens `--animate-popover-in/out` (150ms) and applied to the preview-card content in both
  hosts. Deliberately *not* made the `popoverTheme.content` default yet — promoting it repo-wide is
  a follow-up decision (the rename popover keeps its slide motion).

## 3. Tree: adopt `@ark-ui/react` TreeView (experiment, per user direction)

### 3.1 Current state (audit)

`react-ui-list` Tree is the one component that predates the list rewrite: monolithic (no namespace
parts), five atom-family `TreeModel` interface, bespoke arrow-key handling in `Treegrid` (Left/Right
both just toggle — not the APG grammar; no Home/End/typeahead), non-standard `aria-current=''`
styling (neither `dx-current` nor `dx-selected`), no disclosure animation, per-item pragmatic-dnd
effect with the tree-item hitbox, group headers hard-coded as a special case, and real defects:
`aria-level=0` on every row, a no-op `rowRef.focus()`, mixed path separators in stories, ~170 lines
of scaffolding required to mount a static tree in a story.

### 3.2 Decision

**Adopt `@ark-ui/react` TreeView** as the machine + accessibility layer; keep everything DXOS on
top: theme tokens, pragmatic-dnd, atoms/ECHO state, end-of-row menus. Rationale:

- Complete WAI-ARIA keymap (arrows per APG, Home/End, typeahead, `*`, multi-select) for free —
  the part our implementation never caught up on.
- Controlled `expandedValue`/`selectedValue`/`focusedValue` (string arrays + change callbacks) maps
  directly onto our atom families; this is the reactivity experiment the user wants: zag machine
  state bridged to effect-atom/ECHO.
- No native DnD in Ark — which is what we want: pragmatic-dnd layers on the parts, and the
  `TreeData` payload / `monitorForElements` contract with navtree is unchanged.
- MIT, actively maintained (Chakra v3 builds on the same machine); already referenced as prior art
  in `ui-template` (zag spike) and the solid catalog.

Known gaps accepted up front:

1. **No measured-height disclosure animation** — BranchContent is `hidden`-toggled with no
   `--height` var. v1 ships an enter animation (`data-state=open` fade/slide keyframes); animated
   exit needs our own measurement and is a follow-up.
2. Zag's roving tabindex owns item focus; end-of-row menu buttons are `tabIndex=-1` (APG-correct)
   rather than tabster-groupper steps. Noted as an experiment finding either way.
3. Ark keys state by node **value**, not path — we use the joined path as the value, which
   preserves the current per-path open state semantics (same node expandable independently at two
   locations).

### 3.3 Architecture

- Dependency: `@ark-ui/react` via catalog, consumed by `react-ui-list`.
- Rewrite `Tree` in place as a namespaced composite (`Tree.Root`/`Tree.Item`… wrapping Ark parts,
  themed via `List.theme.ts` slots, `dx-current`/`dx-selected` grammar), replacing the monolith;
  port `plugin-navtree` (L1Panel/NavTreeContainer/columns) and any other consumers in the same
  change — no compatibility shims.
- Adapter from the navtree atom families to an Ark `TreeCollection` snapshot, rebuilt on graph
  atom change; expanded/current bridged to the existing persisted ViewState atoms.
- DnD: `draggable`/`dropTargetForElements` + tree-item hitbox on the item rows, spring-loaded
  expand via the Ark API, `TreeDropIndicator` kept.
- Groups ("islands"): `disposition=group` renders a section-heading part (first-class
  `Tree.Section` instead of the hard-coded special case).

### 3.4 Open items

_Running log of findings from the implementation._
