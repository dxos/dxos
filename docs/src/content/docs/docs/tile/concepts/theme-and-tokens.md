---
title: Theme and tokens
description: Semantic tokens, cascade layers, and `classNames` instead of `className`.
---

TILE's colors and sizes are CSS custom properties, called tokens. Components and plugins use tokens by role, never by
value, so one theme change reaches all of them.

## Model

**Three tiers of color tokens.** Each tier is built from the one below it:

| Tier     | Example                                   | Use                                                   |
| -------- | ----------------------------------------- | ----------------------------------------------------- |
| Scale    | `--color-neutral-150`, `--color-blue-600` | Raw values. Never used directly by a component        |
| Hue role | `--color-red-surface`, `--color-red-fg`   | One set of roles per hue, for color that carries data |
| Semantic | `--color-card-surface`, `--color-fg-muted`, `--color-error-text` | Named parts of the UI. The tier to reach for |

**A token becomes utilities.** Every `--color-<name>` token yields the Tailwind utilities `bg-<name>`, `text-<name>` and
`border-<name>`. So `--color-card-surface` gives `bg-card-surface`.

**Names follow one pattern:** `{name}-{part}[-{state}]`. The part is one of `surface` (a background), `fg` (text on that
surface), `bg` (a solid fill such as a primary button), `bg-hover`, `border`, and `text` (text on the page itself, with
no surface). A state such as `hover` comes last.

**Surfaces form a ladder.** Six levels, from `sunken` up through `chrome`, `base`, `raised` and `overlay` to `popup`.
Higher surfaces are lighter in dark mode, so a menu reads as sitting above a card, which sits above the page.

| Level     | Named surfaces                              |
| --------- | ------------------------------------------- |
| `sunken`  | `deck-surface`                              |
| `chrome`  | `sidebar-surface`, `header-surface`         |
| `base`    | `base-surface`                              |
| `raised`  | `card-surface`                              |
| `overlay` | `modal-surface`: dialogs, sheets, drawers   |
| `popup`   | `popover-surface`: menus, popovers, tooltips |

**Light and dark in one value.** A semantic token holds both values with CSS `light-dark()`. The theme sets
`color-scheme: dark` under the `dark` class, so the browser picks the dark value there.

**Status colors** alias hues: `info` is cyan, `success` emerald, `warning` amber and `error` rose. Each has the full set
of parts, so `text-error-text` and `bg-warning-surface` both exist.

**Cascade layers.** The theme puts its rules in named layers, in this order: `properties`, `theme`, `dx-tokens`,
`user-tokens`, `base`, `tw-base`, `dx-base`, `components`, `tw-components`, `dx-components` and `utilities`. An app's
own styles outside any layer win over all of them. `user-tokens` comes after the theme's own `dx-tokens`, so a token
value set in that layer replaces the default.

**Generated at build time.** `ThemePlugin` runs Tailwind over your sources and the components' stylesheets. A class
that no scanned file names is not in the CSS. A class built from a string at run time, such as `` `bg-${hue}-surface` ``,
is never seen, so name classes in full.

## Behavior

**Overrides go through `classNames`.** Themed components take a `classNames` prop, a string or an array of strings,
and merge it after their own classes. `className` is not part of their props.

```tsx
<Button.Root classNames='w-full'>Save</Button.Root>
```

Pass layout hints such as width or margin this way. Pass color through tokens, never raw values.

**Components read `--dx-*` variables** for their sizes and states, such as `--dx-block-size` for a control's height and
`--dx-focus-ring-color` for its focus ring. Setting one on an element changes the components inside it.

## Limits

- A guessed token name is not an error. `bg-input` or `text-primary` simply produce no CSS, and the element falls back to
  inherited colors that may be unreadable in one theme. Check the name against the theme's CSS, or copy it from an
  existing component.
- Hue-role and scale tokens do not follow the semantic ladder. A `bg-red-surface` stays red in both themes, so use it
  only where the color carries meaning.
