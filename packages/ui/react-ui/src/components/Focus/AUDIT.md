# Focus

## Problem

Grid cells use `overflow-hidden` which clips outward CSS `ring` (box-shadow) and `outline` styles.
Using `border` for focus indicators creates doubled lines at grid cell boundaries.
Inset `box-shadow` alone is obscured by child elements with backgrounds (e.g., toolbar headers).

## Solution

Uses a `::after` pseudo-element overlay with `ring-inset` to paint the focus ring above all child content.
The pseudo-element is absolutely positioned, `pointer-events-none`, and inherits `border-radius`.

- **Default**: ring is transparent (invisible until focused).
- **`border` prop**: shows a CSS `border-separator` when unfocused (e.g., for grid cell edges).
- **Focus/active/error states**: ring color changes to the appropriate indicator color.

Both `Focus.Group` and `Focus.Item` support the `border` prop.

## Why `::after` overlay

| Approach                 | Clipped? | Obscured by children? | Notes                                                                 |
| ------------------------ | -------- | --------------------- | --------------------------------------------------------------------- |
| `ring` (outward)         | Yes      | N/A                   | Extends outside bounds, clipped by parent `overflow-hidden`.          |
| `ring-inset`             | No       | Yes                   | Inset box-shadow is part of background layer; children paint over it. |
| `::after` + `ring-inset` | No       | No                    | Pseudo-element paints above children. Requires `position: relative`.  |

## Relationship to `dx-focus-ring-inset-over-all`

The CSS class `dx-focus-ring-inset-over-all` (in `focus-ring.css`) uses the same `::after` technique
but only reacts to `:focus-visible`. `Focus.Group/Item` additionally support programmatic states
via `data-focus-state` (`active`, `error`).

## Clean-up

- [ ] Unify: extend `dx-focus-ring-inset-over-all` to support `data-focus-state` attributes,
      then have `Focus.Group/Item` use the CSS class instead of inline Tailwind utilities.
      Consumers: Plank, StackItem, Tabs, AttentionProvider, main sidebar.

## Audit

- [ ] Create a list of all container components (outside of `react-ui`) that directly use `overflow-hidden`;
      Consider containers to be components that have `children` and expand (e.g., `grid`, `grow`, `h-full`, `w-full`).
