# Design System: Color Tokens

This document describes how color tokens are organized in `ui-theme`, the naming rules they follow, and the rationalization of overlapping state tokens (`current` / `active` / `highlight` / `selected` / `hover`) and text-on-surface tokens (`surface-text` → `foreground`).

## Token tiers

Three layers, each consuming the one below:

| Tier        | File                                         | Purpose                                                                                                                                                                                       | Example                                                                 |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Scale    | [`theme/palette.css`](./theme/palette.css)   | Raw color values. Extends Tailwind's neutral/blue scales with intermediate stops and aliases the `primary-*` ramp to `blue-*`.                                                                | `--color-neutral-150`, `--color-primary-500`                            |
| 2. Hue role | [`theme/styles.css`](./theme/styles.css)     | Per-hue role tokens generated mechanically for every Tailwind hue plus `neutral`. Five roles each: `fill`, `surface`, `foreground`, `text`, `border`. Light/dark resolved via `light-dark()`. | `--color-red-surface`, `--color-neutral-border`                         |
| 3. Semantic | [`theme/semantic.css`](./theme/semantic.css) | Named UI surfaces and states. May reference hue-role tokens (e.g. `error-surface` → `rose-surface`) or compose directly from the scale.                                                       | `--color-card-surface`, `--color-current-surface`, `--color-error-text` |

A consumer should reach for the highest tier that fits. Use `bg-card-surface`, not `bg-neutral-75`. Use `text-error-text`, not `text-rose-700`.

## Naming convention

Token names follow `--color-{name}-{part}[-{state}]`:

- **`name`** identifies the role or surface (`card`, `current`, `accent`, `error`, `red`).
- **`part`** is one of a fixed vocabulary:
  - `surface` — the background fill of a thing.
  - `foreground` — the text/icon color that sits on the surface (paired with `surface`).
  - `border` — border color on the surface.
  - `fill` — solid attention-grabbing fill (badges, dots, indicators); more saturated than `surface`.
  - `text` — text color used standalone, on the base canvas (no enclosing surface).
- **`state`** is optional, appended last: `hover`, `active` (pressed). State always follows the part it modifies.

### Pattern rules

- Suffix order is fixed: `{name}-{part}-{state}`. The part comes first, then the state.
- Pair rule: every `{name}-surface` that hosts text has a matching `{name}-foreground`. Don't invent new ink-suffix names — keep the vocabulary closed.
- A state token implies a base — `current-surface-hover` only makes sense if `current-surface` exists.
- The `-text` part (standalone) is reserved for text on the base canvas, with no enclosing surface (e.g. `accent-text` for a hyperlink in body copy). Text on any named surface uses `{name}-foreground`.

## Surfaces

Layered fills, ordered from recessive to prominent:

```
base-surface          n-50  / n-950   the page canvas
deck-surface          n-50  / n-950   deck panes
toolbar-surface       n-75  / n-925   toolbars
card-surface          n-75  / n-925   cards
group-surface         n-100 / n-900   grouped containers
modal-surface         n-100 / n-900   modals / dialogs
sidebar-surface       n-100 / n-900   sidebars
header-surface        n-100 / n-900   headers
input-surface         n-200 / n-800   form controls
```

Each surface that hosts text declares a matching `*-foreground` (defaulting to `n-950 / n-50`).

## State tokens (rationalized)

The system has three orthogonal states. Pick by what the ARIA / markup is saying.

| State                      | Token                    | When                                                             | Value             |
| -------------------------- | ------------------------ | ---------------------------------------------------------------- | ----------------- |
| Active item, one-of-N      | `current-surface`        | `aria-current=true` (nav cursor, current row, current path)      | `n-100` / `n-900` |
| Hovering on current item   | `current-surface-hover`  | pointer-over on a `current` element                              | `n-200` / `n-800` |
| Text on a current surface  | `current-foreground`     | text/icon color paired with `current-surface`                    | `n-950` / `n-50`  |
| Selected / checked         | `selected-surface`       | `aria-selected=true` (multi-select, listbox option, checked row) | `n-150` / `n-850` |
| Hovering on selected       | `selected-surface-hover` | pointer-over on a `selected` element                             | `n-250` / `n-750` |
| Text on a selected surface | `selected-foreground`    | text/icon color paired with `selected-surface`                   | `n-950` / `n-50`  |
| Transient pointer-over     | `hover-surface`          | `:hover`, Radix `data-highlighted` (keyboard cursor in menus)    | `n-250` / `n-750` |
| Text on a transient hover  | `hover-foreground`       | text/icon color paired with `hover-surface`                      | `n-950` / `n-50`  |

**Why these three.** `current` describes one-of-N navigation/selection state ("you are here"); `selected` describes a checked item in a set (multi-select-able); `hover` is transient pointer feedback. Driving the distinction off ARIA keeps markup and tokens in sync.

### Visual hierarchy

```
card-surface          n-75  / n-925    resting
current-surface       n-100 / n-900    "I am the active one"
current-surface-hover n-200 / n-800    hovering the active one
hover-surface         n-250 / n-750    transient pointer-over anywhere else
```

## Consolidation: tokens that go away

These are merged into the rationalized state vocabulary:

| Removed                   | Replaced by             | Notes                                                                                                                                                                                                     |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active-surface`          | `current-surface`       | Same concept ("the active one"). Same value already.                                                                                                                                                      |
| `active-text`             | `current-foreground`    | Renamed and reclassified — it was always foreground (text on the surface), not `text`.                                                                                                                    |
| `highlight-surface`       | `current-surface`       | `selected.css` used it for `aria-current=true`.                                                                                                                                                           |
| `highlight-surface-hover` | `current-surface-hover` |                                                                                                                                                                                                           |
| `highlight-surface-text`  | `current-foreground`    | Rename to the new `-foreground` suffix.                                                                                                                                                                   |
| `*-surface-text` (all)    | `*-foreground`          | Repository-wide rename for every hue, semantic, and named-surface token (e.g. `base-surface-text` → `base-foreground`, `red-surface-text` → `red-foreground`, `error-surface-text` → `error-foreground`). |

### Visual change to expect

The 9 `bg-active-surface` call sites become one shade subtler (from `n-200/800` to `n-100/900`). This aligns them with the existing `selected.css` treatment of `aria-current=true` and produces the coherent layering shown above.

### Out-of-scope drift to fix separately

Two sites use `bg-hover-surface` as a _resting_ fill (not a hover state):

- [packages/plugins/plugin-navtree/src/experimental/Tree.tsx:196](../../../../plugins/plugin-navtree/src/experimental/Tree.tsx)
- [packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:171](../../../../plugins/plugin-script/src/components/TestPanel/TestPanel.tsx)

These should probably move to `card-surface` or `current-surface` depending on intent. Tracked as a follow-up; not part of this rationalization.

## Accent (primary)

`accent-*` is the project's primary brand color (blue). The token name is `accent`, not `primary`, to avoid colliding with the raw scale `--color-primary-*` (which is aliased to `blue-*` for Tailwind utility convenience).

| Token               | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `accent-fill`       | Fill for primary buttons / call-to-action surfaces. |
| `accent-fill-hover` | Hover state.                                        |
| `accent-foreground` | Text/icon color on accent surfaces.                 |
| `accent-text`       | Standalone accent-colored text (links, emphasis).   |
| `accent-text-hover` | Hover state for accent text.                        |

This is the canonical illustration of the `foreground` vs `text` distinction: `accent-foreground` is the ink on an accent button; `accent-text` is the accent-colored body link.

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

Each provides `fill`, `surface`, `foreground`, `text`, `border`.

## Adding a new token

1. Does an existing semantic token already cover it? If yes, use it.
2. Does it represent a new named surface, state, or status? Add it to `semantic.css` referencing scale or hue-role tokens — never raw hex.
3. Follow the suffix order: `{name}-{part}[-{state}]`.
4. If the new token will be used through a Tailwind utility that the source-scan can't see (e.g. CSS file, dynamic class), add it to `@source inline(...)` in [`main.css`](./main.css).
5. If it ships state variants (`-hover`, `-active`), declare them adjacent to the base in the same block.
