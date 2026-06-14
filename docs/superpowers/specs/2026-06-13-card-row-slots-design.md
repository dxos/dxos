# Card/Dialog Row Slots — Design

Date: 2026-06-13
Status: Proposed

## Problem

`Card.Row` conflates three concerns into one overloaded `icon` prop:

- **What** goes in the slot — `icon?: string | JSX.Element` (string → auto `CardIcon size={4}`; element → caller's responsibility).
- **Where** it goes — only column 1. There is no first-class column 3 slot; trailing `IconButton`s today are dumped into the content track and do not align to the right gutter.
- **Geometry** — a passive `<Icon>` must be wrapped in `IconBlock` (sized to `--dx-rail-item`) to line up with an interactive `IconButton`. Callers must remember to do this; `IconBlock` and the `icon` convenience are both acknowledged hacks.

`Card.Row` is, structurally, just `Column.Row` (a 3-column subgrid `gutter | minmax(0,1fr) | gutter`) with an icon shortcut bolted on. `Panel` already solves "place a child into a named track" cleanly: a `data-slot` attribute drives grid placement, and anonymous children auto-route to the content region. We adopt that idiom for the horizontal 3-column rows used by `Column`, `Card`, and `Dialog`.

## Goals

- Place an icon or `IconButton` in **either** gutter (column 1 or column 3) of a row.
- A passive icon and an `IconButton` in a gutter share identical geometry **by construction**, not by callers remembering to wrap.
- Keep the common case terse (one leading passive icon).
- Remove the overloaded `Card.Row.icon` prop, `Card.Icon`, and `Card.IconBlock`; migrate all call sites (no compat shims). **Keep** the standalone `IconBlock` primitive — it has ~21 non-card uses (`react-ui-form`, `react-ui-list`, `react-ui-components`, …) and `Column.Block` is built on its geometry.
- Apply the same mechanism to `Card.Header`, and to `Dialog.Header` / a new `Dialog.Row`.

## Non-goals

- Changing `fullWidth` row semantics (no subgrid → slots are inert; documented).
- Reworking `Column.Center` / `Column.Bleed`.
- Restyling existing visuals beyond what slot placement requires.

## Design

### 1. `Column` — the layout primitive

`Column.Row` already spans all three columns via subgrid. Placement is explicit (not DOM-order), so conditional children (`{cond && <Block/>}`) never shift content into a gutter:

- `Column.Block` **self-places** into column 1 (leading) or column 3 (`end`) with a plain
  `col-start-1` / `col-start-3` utility, and carries a `dx-gutter` marker class.
- The row places every non-gutter (content) child into column 2 via
  `[&>*:not(.dx-gutter)]:col-start-2`.

**Implementation note:** the original design routed by `data-slot`
(`[&>[data-slot=start]]:col-start-1`), mirroring `Panel`. That does not work here —
Tailwind does not generate arbitrary variants that nest a square-bracket attribute
selector, so the rule silently no-ops. Class-based placement (`dx-gutter` + `:not(.dx-gutter)`)
is the pattern the codebase already uses (`withColumn.propagate`) and generates correctly.
The `data-slot` attribute is still set on the block as a semantic marker.

Add **`Column.Block`** — the gutter slot component. It **reuses `IconBlock`'s geometry** (the `icon.block` theme / `--dx-rail-item` square) and adds grid placement. It is a **pure geometry slot**: no `icon` shortcut, callers always pass a real child (`<Icon>`, `<IconButton>`, `<Avatar>`, …):

```tsx
type ColumnBlockProps = SlottableProps<{
  end?: boolean; // default: start (column 1). `end` opts into column 3.
  compact?: boolean; // from IconBlock: omit height constraint.
  square?: boolean; // from IconBlock: aspect-square vs width-only.
}>;
```

Behavior:

- Renders a `dx-gutter` element sized to `--dx-rail-item` (`grid place-items-center`, the
  current `IconBlock` theme verbatim) that self-places into column 1 or 3. Also sets
  `data-slot={end ? 'end' : 'start'}` as a semantic marker. The child is centered in the
  rail-item square; a passive `<Icon>` and an `IconButton` align to the pixel by construction.
- **No `icon` / `size` props.** A decorative `<Icon>` child carries no explicit `size`,
  so it inherits the `--icon-size` CSS var set by the enclosing row/header (via the
  existing `iconSize()` helper) — `Card.Row` sets 4, `Card.Header` sets 5. The same
  `Card.Block` renders correctly in either context with no per-call config.
- `asChild` is inherited from `slottable()` (Slot vs `Primitive.div` + `COMPOSABLE`).
  With `asChild`, the single child becomes the grid cell, receiving `data-slot` + the
  layout-only rail geometry directly — useful for making a trailing `<a>` or control the
  focusable cell rather than nesting it in a wrapper `<div>`.
- **A11y fix:** the geometry wrapper does **not** blanket-set `aria-hidden` (today's
  `IconBlock` does, which is wrong when it wraps an interactive control). Semantics are
  left to the child — an `IconButton` carries its own label; a purely decorative `<Icon>`
  block can be marked `aria-hidden` by the caller.

### 2. `Card` — themed over `Column`

- **`Card.Block`** = themed `Column.Block` (Card density). Defaults its text color to
  subdued so a decorative `<Icon>` child inherits today's `text-subdued` look with no
  per-call styling; interactive children (`IconButton`) set their own color. Inherits
  `asChild`.
- **`Card.Row`** = themed `Column.Row`, sets `--icon-size` 4. **Remove the `icon`
  prop.** `fullWidth` unchanged; when set there is no subgrid, so blocks are inert
  (documented).
- **`Card.Header`** = themed `Column.Row` rendered as a `<header>` element, sets
  `--icon-size` 5. **Drop `Toolbar.Root` entirely.** Header and Row share the exact
  same subgrid + `data-slot` layout; the only differences are the semantic element and
  the default icon size. Rationale: ~75% of `Card.Header` call sites have 0–1
  interactive controls, where `role="toolbar"` + roving tabindex is incorrect or
  pointless; the ~20% multi-control headers lose arrow-key roving, which is an
  accepted trade for correct semantics and a uniform layout. `CardHeaderProps` becomes
  `SlottableProps` (+ `density?`), no longer `ToolbarRootProps`.
- **Header helpers reconciliation:** `Card.DragHandle` / `Card.ActionIconButton` /
  `Card.Menu` are reimplemented on the base `IconButton`/`DropdownMenu` (no
  `Toolbar.*` primitives) and wrapped in `Card.Block` (`end` for actions/menus).
  Because `Card.Header` no longer provides a `RovingFocusGroup`, **any raw
  `Toolbar.IconButton`/`Toolbar.Separator` placed directly in a `Card.Header` at a
  call site throws at runtime** and must be swapped for the base `IconButton`
  (wrapped in `Card.Block`) — ~15 call sites. This is part of the migration, not
  optional.
- **Remove** `Card.IconBlock` and `Card.Icon`; `Card.Block` replaces both
  (`<Card.Block><Icon …/></Card.Block>` for the passive case). The standalone
  `IconBlock` primitive is **untouched** — `Column.Block` reuses its `icon.block` theme.

### 3. `Dialog` — deferred (gutter geometry mismatch)

**Decision (during implementation): not adopted in this change.** `Dialog.Content` wraps
children in `Column.Root` with gutter `sm` (1rem). The rail-item block is `2rem`
(`--dx-rail-item` = `--dx-rail-content` 3rem − 1rem), which is exactly the card `md`
gutter (2rem) but **2× the dialog `sm` gutter**. So a gutter-placed `Card.Block`-style
slot overflows in a dialog — which is precisely why `Dialog.Header` uses `flex
justify-between` rather than a subgrid today.

Adopting the gutter-slot model in `Dialog` therefore requires a separate decision about
dialog gutter width (e.g. a `md`-gutter dialog variant) before it is geometrically
sound. The mechanism now lives in `Column` (`Column.Block` + `Column.Row` routing), so
`Dialog` can opt in later without rework. `Dialog.Header` is left unchanged; no
`Dialog.Row`/`Dialog.Block` shipped (YAGNI — zero current consumers).

### Resulting usage

```tsx
<Card.Row>
  <Card.Block><Icon icon='ph--user--regular' /></Card.Block>   {/* col 1 (default start) */}
  <Card.Title>Alice</Card.Title>                               {/* anonymous → content */}
  <Card.Block end>                                             {/* col 3 */}
    <IconButton iconOnly icon='ph--x--regular' label='Remove' />
  </Card.Block>
</Card.Row>

{author && (                                                   {/* conditional: safe, no shift */}
  <Card.Block><Icon icon='ph--user--regular' /></Card.Block>
)}

<Card.Block end asChild>                                       {/* asChild */}
  <a href={href}><Icon icon='ph--arrow-up-right--regular' /></a>
</Card.Block>
```

## Surface change summary

| Before                                            | After                                                |
| ------------------------------------------------- | ---------------------------------------------------- |
| `Card.Row` `icon?: string \| JSX.Element`         | removed                                              |
| `IconBlock` (public, standalone)                  | **kept** — `Column.Block` reuses its geometry        |
| `Card.IconBlock`                                  | removed → `Card.Block`                               |
| `Card.Icon`                                       | removed → `<Card.Block><Icon/></Card.Block>`         |
| —                                                 | `Column.Block`, `Card.Block`                         |
| `Dialog.Header` flex                              | unchanged (gutter too narrow for slots — deferred)   |
| `Card.Header` = `Toolbar.Root` (`role="toolbar"`) | plain `<header>`, shared Row layout, `--icon-size` 5 |
| `Card.Header` icon via helpers/`IconBlock`        | `data-slot` routing + `Card.Block`                   |

## Migration (full replace, per repo no-shim policy)

Touch every call site in the same change:

1. `<Card.Row icon='x'>…` → `<Card.Row><Card.Block><Icon icon='x'/></Card.Block>…</Card.Row>`.
2. `<Card.Row icon={<El/>}>` → `<Card.Row><Card.Block><El/></Card.Block>…`.
3. Trailing buttons living inside row content → wrap in `<Card.Block end>`.
4. Replace `Card.IconBlock` / `Card.Icon` usages with `Card.Block`. **Standalone
   `IconBlock` usages are left as-is.**
5. `Dialog.Header` close/action buttons → `end` slot; add `Dialog.Row` where dialogs
   hand-rolled gutter rows.
6. Update `Card.stories.tsx` and any `Dialog` stories.

Known call sites (non-exhaustive): `plugin-feed/PostStack`, `plugin-inbox/Header` & `Message`, `plugin-preview/PersonCard`, `plugin-trip/SegmentCard`, plus `react-ui` stories.

## Testing

- Storybook: `Card` stories cover start-only, end-only, both, `asChild`, conditional
  (falsy) block, `fullWidth` (blocks inert), Header-vs-Row icon size (5 vs 4), and a
  passive-icon-vs-`IconButton` alignment story proving identical geometry. Add
  equivalent `Dialog` stories.
- Visual regression via existing storybook snapshots where available.
- Build + lint + `react-ui` tests green; audit diff for new casts.

## Risks / open questions

- Broad call-site churn across plugins (accepted: full replace).
- `Dialog.Header` restyle could subtly shift spacing for non-title/close layouts —
  verify each dialog visually.
- Dropping `Toolbar.Root` from `Card.Header` removes arrow-key roving for the ~20
  multi-control headers (accepted trade for correct ARIA semantics). Verify those
  headers still tab through their controls normally.
