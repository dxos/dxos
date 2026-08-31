# ui-theme-tree — Design

Audits of the DXOS theme (surfaces, density) against shadcn/ui and Ark UI, the dx-preview hover
card, and the decision + architecture for rebuilding the Tree on `@ark-ui/react` to replace the
composer navtree.

## 1. Theme audit: surfaces & density vs shadcn/ui & Ark UI

### 1.1 The three models

|                 | DXOS                                                                                                         | shadcn/ui                                                              | Ark UI                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Token model     | 3 tiers: palette ramp → hue roles → semantic surfaces/aspects                                                | Flat semantic pairs (`--card` / `--card-foreground`, …)                | **None** — headless, `data-scope`/`data-part`/`data-state` only |
| Light/dark      | `light-dark()` + `.dark` flips `--dx-lift` (derivation direction)                                            | Same vars re-declared under `.dark`                                    | Consumer's problem                                              |
| Elevation       | 6-level lightness ladder (sunken→popup), _lighter = higher in both themes_; chrome sits **below** the canvas | No ladder; `--background`≈`--card`≈`--popover` differ ad hoc per theme | n/a                                                             |
| Hover/selection | **Derived from the host surface** via relative oklch (`--surface-bg` + lift × attenuate × offset)            | Fixed (`--accent`, `--muted`) — same color on every surface            | n/a                                                             |
| Borders         | 4 separator strengths derived per surface                                                                    | Single `--border` (+`--input`, `--ring`)                               | n/a                                                             |
| Density         | 3 CSS variables (`--dx-control`, `--dx-control-pad`, `--dx-control-leading`), class + data-attr              | Per-component cva `size` variants                                      | None                                                            |
| Radius          | Static 5-value scale (no `--radius-xs` — silently falls back to Tailwind's)                                  | Single `--radius` knob → derived sm…4xl                                | n/a                                                             |
| Shadows         | None (elevation = lightness + backdrop-blur)                                                                 | `shadow-md` etc. on components                                         | n/a                                                             |

### 1.2 Contrast at elevation (the core question)

DXOS's distinctive mechanism: every interaction aspect is computed **relative to the surface that
hosts it** —

```text
aspect = oklch(from var(--surface-bg) calc(l + lift · attenuate(family) · offset) c h)
```

- `--dx-lift` = −1 light / +1 dark ("away from the canvas"), so hover/selection always move in the
  direction that reads as emphasis on that theme.
- Offsets (dark = reference): hover-subtle 0.02 · hover 0.08 · current 0.10 · current-hover 0.12 ·
  toolbar 0.025 · well 0.05 · separator-line 0.166 · input/subdued/primary separators
  0.115/0.089/0.064 · placeholder 0.30 · scrollbar 0.23–0.34.
- Light attenuates per family (state/well ×0.5, separator ×0.75, separator-line ×0.45) because
  lightness deltas read stronger near white.

**Consequence:** the _perceived_ ΔL of hover/selection/borders is constant at every elevation — a
selected row on the popup surface (L 0.242 dark) and on the sunken surface (L 0.145 dark) both sit
exactly +0.10 above their host. shadcn cannot express this: `--accent` is one fixed color, so on
any surface that isn't `--background` the hover delta is _whatever happens to result_ — on a dark
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

### 1.3 Measured contrast per elevation (empirical)

Browser-resolved tokens per surface zone (probe: `temp/contrast-probe.mjs` against the worktree
storybook; full JSON in `temp/contrast-probe.json`). `ΔL` = oklch lightness of the aspect minus its
host surface; `WCAG` = contrast ratio vs the host surface.

**Dark** (attenuation = 1, the reference contract):

| level   | bg L  | hover ΔL | current ΔL | separator ΔL | subdued-sep ΔL | body-fg WCAG | description WCAG |
| ------- | ----- | -------- | ---------- | ------------ | -------------- | ------------ | ---------------- |
| sunken  | 0.145 | +0.081   | +0.102     | +0.167       | +0.089         | 15.0         | 7.6              |
| chrome  | 0.176 | +0.079   | +0.099     | +0.164       | +0.087         | 14.3         | 7.3              |
| base    | 0.205 | +0.079   | +0.100     | +0.166       | +0.089         | 13.6         | 6.9              |
| raised  | 0.238 | +0.078   | +0.099     | +0.166       | +0.087         | 12.5         | 6.4              |
| overlay | 0.269 | +0.080   | +0.102     | +0.165       | +0.090         | 11.4         | 5.8              |
| popup   | 0.296 | +0.079   | +0.098     | +0.164       | +0.087         | 10.5         | 5.3              |

**Light** (state ×0.5, separator ×0.75/0.45 attenuation):

| level   | bg L  | hover ΔL | current ΔL | separator ΔL | subdued-sep ΔL | body-fg WCAG | description WCAG |
| ------- | ----- | -------- | ---------- | ------------ | -------------- | ------------ | ---------------- |
| sunken  | 0.906 | −0.040   | −0.052     | −0.076       | −0.068         | 15.0         | 5.9              |
| chrome  | 0.936 | −0.042   | −0.051     | −0.076       | −0.067         | 16.4         | 6.5              |
| base    | 0.981 | −0.042   | −0.051     | −0.075       | −0.069         | 18.8         | 7.4              |
| raised  | 0.990 | −0.039   | −0.051     | −0.075       | −0.066         | 19.3         | 7.6              |
| overlay | 0.996 | −0.042   | −0.051     | −0.075       | −0.069         | 19.6         | 7.7              |
| popup   | 1.000 | −0.039   | −0.051     | −0.075       | −0.066         | 19.8         | 7.8              |

Findings:

1. **The invariant holds exactly** — hover/current/separator ΔL is flat across all six levels in
   both themes (±0.003). This is the property shadcn's fixed `--accent`/`--muted`/`--border`
   cannot provide (its deltas drift with whatever surface hosts them, §1.2).
2. **Perceptual, not photometric, constancy**: the _WCAG ratio_ of a fixed ΔL grows with dark-mode
   elevation (hover 1.16 → 1.35 sunken→popup) — intended, since oklch L is the perceptual axis.
3. **Text contrast is comfortably conformant everywhere**: body ≥ 10.5:1, description ≥ 5.3:1
   (AA for normal text at every elevation; body clears AAA). The dark popup level is the global
   minimum — the level to watch if the ladder is ever extended upward.
4. Selection (`current-surface`) at ΔL ≈ 0.10 is a ~1.2–1.5:1 surface-on-surface ratio — below any
   WCAG threshold for _meaningful_ contrast, which is why the `dx-selected`/`dx-current` grammar
   pairs it with `font-semibold` / the pseudo ring rather than relying on fill alone.

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
keeping in mind: `Toolbar.Root` must emit both the class _and_ the provider because controls stamp
`data-density` from context (see #12839 finding).

## 2. dx-preview hover card (implemented)

Mechanism recap: `dx-anchor` (Lit) dispatches `DxAnchorActivate`; hosts (EditorPreviewProvider in
storybook, plugin-preview → plugin-deck in Composer) open a virtual-trigger Popover. `state: false`
was already the close contract.

Design (shadcn HoverCard semantics, single implementation point):

- **The Lit element owns hover intent** — works identically under both hosts with zero host
  logic. New `trigger` property: `'hover'` (default) | `'click'`. Open delay 100ms (tuned down from
  the 400ms `HOVER_CARD_DELAY` precedent; shadcn 700, Ark 600), close grace 300ms (= shadcn/Ark).
- While hover-open, a document-level `pointerover` listener keeps the card alive when the pointer
  is over the anchor **or** any `[data-dx-popover-content]` element (attribute now stamped by
  `Popover.Content`; the constant lives in `@dxos/ui-types`, the shared dependency of `lit-ui` and
  `react-ui`). Anything else re-arms the 300ms close.
- **Click pins**: a click (or Enter/Space — added, since `role=button` on a non-button gets no
  native key activation) opens without leave-to-close, and any pointer-down inside the open card
  pins it too (portaled menus opened from the card must not re-arm leave-to-close); dismissal
  reverts to outside-click/Escape. Focus deliberately does NOT open: the popover returns focus to
  the anchor on every close, so a focus-open re-opens what just closed.
- Touch pointers never hover-open.
- Hosts close immediately on `state: false` (the element owns all grace timing).
  `EditorPreviewProvider` previously ignored `state` — it would have re-_opened_ on the close
  event; fixed. plugin-preview already handled it (with the activation-sequence race guard).
- **Animation**: shadcn recipe (fade + zoom-from-95% at the anchor-side transform origin), added as
  theme tokens `--animate-popover-in/out` (150ms) and applied to the preview-card content in both
  hosts. Deliberately _not_ made the `popoverTheme.content` default yet — promoting it repo-wide is
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
   `--height` var. As built, enter animates `block-size: 0 → auto` via
   `interpolate-size: allow-keywords` (opacity carries the reveal where unsupported), and exit runs
   a conceal animation first: expansion is controlled, so the model close commits only when the
   animation (or its timeout) completes.
2. Zag's roving tabindex owns item focus; end-of-row menu buttons are `tabIndex=-1` (APG-correct)
   rather than tabster-groupper steps. Noted as an experiment finding either way.
3. Ark keys state by node **value**, not path — we use the joined path as the value, which
   preserves the current per-path open state semantics (same node expandable independently at two
   locations).

### 3.3 Architecture (as built)

- Dependency: `@ark-ui/react` via catalog, consumed by `react-ui-list`.
- **The public `Tree` prop surface is preserved** (model + callbacks + `renderColumns` +
  `gridTemplateColumns`) so `plugin-navtree` needed zero code changes — the internals are the Ark
  parts (`Root`/`Tree`/`Branch`/`BranchControl`/`BranchContent`/`BranchTrigger`/`Item` via
  `NodeProvider`). A full consumer-API re-namespacing was deliberately deferred: it would have
  ballooned the port without changing what the experiment tests.
- **Reactive walk → collection**: one atom walks the `TreeModel` families (childIds, item,
  itemProps, itemOpen, itemCurrent) into an entry tree; any dependency change recomputes the walk
  and hands the machine a fresh immutable `TreeCollection` plus the controlled
  `expandedValue`/`selectedValue` arrays. Node value = joined path (per-path state preserved).
- **Selection policy**: machine `onSelectionChange` is the single select path; input modifiers
  (alt/shift) are captured on `pointerdown` and consulted within a 500ms window (zag callbacks
  carry no input event). Re-activating an already-selected row (toggle a current branch, re-open a
  current leaf) is a row-level `onClick`, since the machine emits no event for an unchanged
  selection. `expandOnClick=false` keeps navtree's click-navigates semantics; the chevron is
  `BranchTrigger` (zag stops propagation, so it never selects).
- **DnD**: `draggable`/`dropTargetForElements` + tree-item hitbox moved from the heading button to
  the row element; spring-loaded expand and drag-collapse via `onOpenChange`; `TreeData` payload
  and the navtree `monitorForElements` contract unchanged; `TreeDropIndicator` kept.
- **Groups**: rendered as section headings; **spliced out of the collection topology** (their
  children become machine-children of the group's parent) so keyboard traversal never lands on a
  header. Levels are carried on the entries, so group children stay at the header's indent.

### 3.4 Findings (experiment log)

1. **zag role placement**: `role=treeitem` + `aria-selected`/`aria-expanded` land on the Branch
   _wrapper_; the visible row (BranchControl) is `role=button` with `data-selected` only. Since the
   wrapper is `display: contents`, selection styling keys off `data-[selected]` on the row — a
   deliberate deviation from the `aria-selected ↔ dx-selected` grammar (leaf Items do carry
   `aria-selected`, so the grammar holds there).
2. **`hidden` vs utility classes**: zag collapses BranchContent with the `hidden` attribute; any
   display utility (`grid`) overrides the UA rule, so BranchContent needs `[&[hidden]]:hidden`.
   Generalizable gotcha for any zag/Ark part styled with Tailwind display classes.
3. **Atoms ↔ machine bridge works cleanly**: fully-controlled expanded/selected + diffing the
   change details onto per-path `onOpenChange`/`onSelect` callbacks round-trips through the navtree
   ViewState atoms with no double-fires observed. Cost: any state change rebuilds the whole walk +
   collection (fine at sidebar scale; a memoized incremental walk is the escalation path).
4. **pragmatic-dnd coexists with the machine** — no interference between zag's pointer handling
   and draggable/dropTarget on the same element (draggable attr stamped, instructions render).
   Real drop verification needs a human drag (native HTML5 drag can't be automated).
5. Verified 17/17 generic checks (render, chevron + full keyboard expand/collapse incl. typeahead
   keymap, click/keyboard selection, select-vs-toggle policy, groups, draggable wiring, zero
   console errors) plus navtree story parity vs main (identical DOM facts + pixel-equivalent
   screenshots) and the plugin-navtree play tests (7/7).

### 3.5 Open items

- Multi-select (`selectionMode='multiple'` is plumbed but unused; Shift+Arrow range selection
  untested against navtree semantics).
- Consider promoting the popover fade+zoom to `popoverTheme.content` as the default popover motion.
- Tabster-groupper equivalent for end-of-row controls (currently reachable by pointer only, per
  APG); evaluate zag's expectations before wiring tabster inside machine-owned rows.
