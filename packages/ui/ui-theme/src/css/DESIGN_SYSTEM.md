# Design System: Color Tokens

This document describes how color tokens are organized in `ui-theme`, the naming rules they follow, and the rationalization of overlapping state tokens (`current` / `active` / `highlight` / `selected` / `hover`) and text-on-surface tokens (`surface-text` → `foreground`).

## Token tiers

Three layers, each consuming the one below:

| Tier        | File                                         | Purpose                                                                                                                                                                 | Example                                                                 |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Scale    | [`theme/palette.css`](./theme/palette.css)   | Raw color values. Extends Tailwind's neutral/blue scales with intermediate stops and aliases the `primary-*` ramp to `blue-*`.                                          | `--color-neutral-150`, `--color-primary-500`                            |
| 2. Hue role | [`theme/styles.css`](./theme/styles.css)     | Per-hue role tokens for every Tailwind hue plus `neutral`. Six roles each: `bg`, `bg-hover`, `surface`, `fg`, `text`, `border`. Light/dark resolved via `light-dark()`. | `--color-red-surface`, `--color-neutral-border`                         |
| 3. Semantic | [`theme/semantic.css`](./theme/semantic.css) | Named UI surfaces and states. May reference hue-role tokens (e.g. `error-surface` → `rose-surface`) or compose directly from the scale.                                 | `--color-card-surface`, `--color-current-surface`, `--color-error-text` |

A consumer should reach for the highest tier that fits. Use `bg-card-surface`, not `bg-neutral-825`. Use `text-error-text`, not `text-rose-700`.

## Naming convention

Token names follow `--color-{name}-{part}[-{state}]`:

- **`name`** identifies the role or surface (`card`, `current`, `accent`, `error`, `red`).
- **`part`** is one of a fixed vocabulary:
  - `surface` — the background fill of a thing.
  - `fg` — the text/icon color that sits on the surface (paired with `surface`).
  - `bg` — solid attention-grabbing fill (buttons, badges, indicators); more saturated than `surface`.
  - `bg-hover` — hover state for `bg`.
  - `border` — border color on the surface.
  - `text` — text color used standalone, on the base canvas (no enclosing surface).
- **`state`** is optional, appended last: `hover`, `active` (pressed). State always follows the part it modifies.

### Pattern rules

- Suffix order is fixed: `{name}-{part}-{state}`. The part comes first, then the state.
- Pair rule: every `{name}-surface` that hosts text has a matching `{name}-fg`. Don't invent new ink-suffix names — keep the vocabulary closed.
- A state token implies a base — `current-surface-hover` only makes sense if `current-surface` exists.
- The `-text` part (standalone) is reserved for text on the base canvas, with no enclosing surface (e.g. `accent-text` for a hyperlink in body copy). Text on any named surface uses `{name}-fg`.

## Surfaces

Surfaces are governed by a strict elevation ladder: **lighter = higher = closer to the viewer** in dark
mode; inverted toward white in light mode. Every named surface token is an alias of exactly one
`--dx-elevation-N` level. Never set a surface to a raw scale value — pick the level that matches the
role and point the token there.

| Level | Name     | Dark    | Light   | Named surfaces                                                                |
| ----- | -------- | ------- | ------- | ----------------------------------------------------------------------------- |
| 0     | `void`   | `n-950` | `n-200` | scrim base, window gaps                                                       |
| 1     | `rail`   | `n-900` | `n-175` | `l0-surface` (icon rail)                                                      |
| 2     | `chrome` | `n-875` | `n-150` | `sidebar-surface`, `header-surface`, `l1-surface`, `r0-surface`, `r1-surface` |
| 3     | `canvas` | `n-850` | `n-125` | `base-surface`, `deck-surface`                                                |
| 4     | `raised` | `n-825` | `n-100` | `card-surface`, `group-surface`, `input-surface`                              |
| 5     | `bar`    | `n-800` | `n-75`  | `toolbar-surface` (sticky, drop-shadowed)                                     |
| 6     | `modal`  | `n-775` | `n-50`  | `modal-surface` (dialogs)                                                     |
| 7     | `float`  | `n-750` | `white` | `popover-surface` (menus, popovers, toasts, tooltips)                         |

The primitive `--dx-elevation-0…7` is defined in `semantic.css` using `light-dark()`. Raw scale values
(`n-*`) are in `palette.css` — the table above is for human reference only.

### Visual hierarchy (dark)

```text
popover/float   n-750  ↑ highest / closest to viewer
modal/dialog    n-775
toolbar         n-800  (sticky bar; content passes beneath)
card/raised     n-825
canvas/deck     n-850
chrome/sidebar  n-875
rail/L0         n-900
void            n-950  ↓ lowest
```

Each surface that hosts text declares a matching `*-fg` (defaulting to `n-950 / n-50`).

## Elevation primitive

The `--dx-elevation-0…7` custom properties in `semantic.css` are the single source of truth for the
surface ladder. They are private (`--dx-*` prefix) — never use them directly in component CSS; use the
named surface tokens (`bg-card-surface`, `dx-modal-surface`, etc.) instead.

When adding a new surface:

1. Decide which elevation level the new surface belongs to (see the table above).
2. Add `--color-<name>-surface: var(--dx-elevation-N);` in the Surfaces block of `semantic.css`.
3. Add a matching `--color-<name>-fg` if text/icons sit on it.
4. If the surface needs a utility class (like `dx-modal-surface`), add it to `surface.css`.

## State tokens (rationalized)

The system has three orthogonal states. Pick by what the ARIA / markup is saying.

| State                      | Token                    | When                                                             | Value             |
| -------------------------- | ------------------------ | ---------------------------------------------------------------- | ----------------- |
| Active item, one-of-N      | `current-surface`        | `aria-current=true` (nav cursor, current row, current path)      | `n-100` / `n-900` |
| Hovering on current item   | `current-surface-hover`  | pointer-over on a `current` element                              | `n-200` / `n-800` |
| Text on a current surface  | `current-fg`             | text/icon color paired with `current-surface`                    | `n-950` / `n-50`  |
| Selected / checked         | `selected-surface`       | `aria-selected=true` (multi-select, listbox option, checked row) | `n-150` / `n-850` |
| Hovering on selected       | `selected-surface-hover` | pointer-over on a `selected` element                             | `n-250` / `n-750` |
| Text on a selected surface | `selected-fg`            | text/icon color paired with `selected-surface`                   | `n-950` / `n-50`  |
| Transient pointer-over     | `hover-surface`          | `:hover`, Radix `data-highlighted` (keyboard cursor in menus)    | `n-250` / `n-750` |
| Text on a transient hover  | `hover-fg`               | text/icon color paired with `hover-surface`                      | `n-950` / `n-50`  |

**Why these three.** `current` describes one-of-N navigation/selection state ("you are here"); `selected` describes a checked item in a set (multi-select-able); `hover` is transient pointer feedback. Driving the distinction off ARIA keeps markup and tokens in sync.

### Visual hierarchy (state, dark)

```text
card-surface          n-825    resting
current-surface       n-100 / n-900    "I am the active one"
current-surface-hover n-200 / n-800    hovering the active one
hover-surface         n-250 / n-750    transient pointer-over anywhere else
```

## Consolidation: tokens that go away

These are merged into the rationalized state vocabulary:

| Removed                   | Replaced by             | Notes                                                                                                                                                                             |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active-surface`          | `current-surface`       | Same concept ("the active one"). Same value already.                                                                                                                              |
| `active-text`             | `current-fg`            | Renamed and reclassified — it was always foreground (text on the surface), not `text`.                                                                                            |
| `highlight-surface`       | `current-surface`       | `selected.css` used it for `aria-current=true`.                                                                                                                                   |
| `highlight-surface-hover` | `current-surface-hover` |                                                                                                                                                                                   |
| `highlight-surface-text`  | `current-fg`            | Rename to the new `-fg` suffix.                                                                                                                                                   |
| `*-surface-text` (all)    | `*-fg`                  | Repository-wide rename for every hue, semantic, and named-surface token (e.g. `base-surface-text` → `base-fg`, `red-surface-text` → `red-fg`, `error-surface-text` → `error-fg`). |

### Out-of-scope drift to fix separately

Two sites use `bg-hover-surface` as a _resting_ fill (not a hover state):

- [packages/plugins/plugin-navtree/src/experimental/Tree.tsx:196](../../../../plugins/plugin-navtree/src/experimental/Tree.tsx)
- [packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:171](../../../../plugins/plugin-script/src/components/TestPanel/TestPanel.tsx)

These should probably move to `card-surface` or `current-surface` depending on intent. Tracked as a follow-up.

## Accent (primary)

`accent-*` is the project's primary brand color (blue). The token name is `accent`, not `primary`, to avoid colliding with the raw scale `--color-primary-*` (which is aliased to `blue-*` for Tailwind utility convenience).

| Token               | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `accent-bg`         | Fill for primary buttons / call-to-action surfaces. |
| `accent-bg-hover`   | Hover state.                                        |
| `accent-fg`         | Text/icon color on accent surfaces.                 |
| `accent-text`       | Standalone accent-colored text (links, emphasis).   |
| `accent-text-hover` | Hover state for accent text.                        |

This is the canonical illustration of the `fg` vs `text` distinction: `accent-fg` is the ink on an accent button; `accent-text` is the accent-colored body link.

Note: `accent-focus-indicator` is removed — focus rings are now global tokens (see [Focus rings](#focus-rings)).

## Focus rings

Focus indicators are a global UI affordance, not a per-surface property. Every focusable element should pick from the same small set of ring colors so focus stays visually consistent and accessible.

| Token               | Value             | Used by                                                  |
| ------------------- | ----------------- | -------------------------------------------------------- |
| `focus-ring`        | `blue-600`        | Default focus ring (buttons, inputs, grid cells, links). |
| `focus-ring-subtle` | `n-400` / `n-600` | Subdued ring for low-emphasis focusable elements.        |

Tokens removed in this rationalization:

| Removed                   | Replaced by         | Notes                                                          |
| ------------------------- | ------------------- | -------------------------------------------------------------- |
| `accent-focus-indicator`  | `focus-ring`        | Was `blue-600`. Same value.                                    |
| `grid-focus-indicator`    | `focus-ring`        | Was `primary-600` (= `blue-600`). Identical to accent variant. |
| `neutral-focus-indicator` | `focus-ring-subtle` | Was `n-400` / `n-600`. Same value.                             |

## Semantic aliases

Status colors point at hue-role tokens:

| Token       | Aliases     |
| ----------- | ----------- |
| `info-*`    | `cyan-*`    |
| `success-*` | `emerald-*` |
| `warning-*` | `amber-*`   |
| `error-*`   | `rose-*`    |

Each provides `bg`, `bg-hover`, `surface`, `fg`, `text`, `border`.

## Adding a new token

1. Does an existing semantic token already cover it? For a new named surface, check the elevation ladder first — the new surface probably fits an existing level and should alias `--dx-elevation-N` rather than a raw scale value.
2. Does it represent a new named surface, state, or status? Add it to `semantic.css` referencing scale or hue-role tokens — never raw hex.
3. Follow the suffix order: `{name}-{part}[-{state}]`.
4. If the new token will be used through a Tailwind utility that the source-scan can't see (e.g. CSS file, dynamic class), add it to `@source inline(...)` in [`main.css`](./main.css).
5. If it ships state variants (`-hover`, `-active`), declare them adjacent to the base in the same block.
