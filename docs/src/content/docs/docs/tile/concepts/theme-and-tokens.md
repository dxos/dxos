---
title: Theme and tokens
description: Semantic tokens, cascade layers, and `classNames` instead of `className`.
---

A token is a CSS custom property that holds one of TILE's colors or sizes. Components and plugins use tokens by role,
never by value. This means one theme change reaches all of them.

## Model

A CSS variable lets you name a value once and use it in many rules. A token goes one step further. Its name says what
the value is for, such as a card's surface, not what the value is.

**Three tiers of color tokens.** Each tier is built from the one below it:

| Tier     | Example                                                          | Use                                                   |
| -------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| Scale    | `--color-neutral-150`, `--color-blue-600`                        | Raw values. Never used directly by a component        |
| Hue role | `--color-red-surface`, `--color-red-fg`                          | One set of roles per hue, for color that carries data |
| Semantic | `--color-card-surface`, `--color-fg-muted`, `--color-error-text` | Named parts of the UI. The tier to reach for          |

**A token becomes utilities.** Every `--color-<name>` token yields the Tailwind utilities `bg-<name>`, `text-<name>` and
`border-<name>`. For example, `--color-card-surface` gives `bg-card-surface`.

**Names follow one pattern.** A token is named `{name}-{part}[-{state}]`. A state such as `hover` comes last.

The part is `surface` (a background), `fg` (text on that surface), `bg` (a solid fill such as a primary button),
`bg-hover` or `border`. One more part, `text`, is for text on the page itself, with no surface.

**Surfaces form a ladder.** The ladder has six levels, from `sunken` up through `chrome`, `base`, `raised` and
`overlay` to `popup`. Higher surfaces are lighter in dark mode, so a menu reads as sitting above a card, which sits
above the page.

| Level     | Named surfaces                               |
| --------- | -------------------------------------------- |
| `sunken`  | `deck-surface`                               |
| `chrome`  | `sidebar-surface`, `header-surface`          |
| `base`    | `base-surface`                               |
| `raised`  | `card-surface`, `modal-surface` (dialogs)    |
| `overlay` | none; set it on an element to lift it higher |
| `popup`   | `popover-surface`: menus, popovers, tooltips |

**Light and dark in one value.** A semantic token holds both values with CSS `light-dark()`. The theme sets
`color-scheme: dark` under the `dark` class, so the browser picks the dark value there.

**Status colors alias hues.** `info` is sky, `success` is emerald, `warning` is amber and `error` is rose. Each has
the full set of parts, so `text-error-text` and `bg-warning-surface` both exist.

A component's `valence` prop takes one of these four, or `neutral`. A `neutral` valence carries no status and uses
the neutral hue.

**Cascade layers.** The theme puts its rules in named layers, in this order: `properties`, `theme`, `dx-tokens`,
`user-tokens`, `base`, `tw-base`, `dx-base`, `components`, `tw-components`, `dx-components` and `utilities`. Your app's
own styles outside any layer win over all of them.

The theme declares its tokens in `theme`. In `dx-tokens` it sets its line widths and gutters, and the values that
change with a density or a surface.

`user-tokens` comes after both, so a token value you set in that layer replaces the default. See
[Custom themes and dark mode](/docs/tile/guides/custom-themes/) for how to set one.

**Generated at build time.** `ThemePlugin` runs Tailwind over your sources and the components' stylesheets. A class
that no scanned file names is not in the CSS. A class built from a string at run time, such as `` `bg-${hue}-surface` ``,
is never seen, so name classes in full.

## Behavior

**Overrides go through `classNames`.** In plain React, you style an element with `className`. Themed components take a
`classNames` prop instead, which is a string or an array of strings. They merge it after their own classes, and
`className` is not part of their props.

**Example** (Passing a width class to a button)

```tsx
<Button.Root classNames='w-full'>Save</Button.Root>
```

Use `classNames` for layout hints such as width or margin. Pass color through tokens, never raw values.

**Components read `--dx-*` variables.** These hold their sizes and states, such as `--dx-block-size` for a control's
height and `--dx-focus-ring-color` for its focus ring. If you set one on an element, it changes the components inside
it.

## Limits

- A guessed token name is not an error. `bg-input` or `text-primary` produce no CSS, and the element falls back to
  inherited colors that may be unreadable in one theme. Check the name against the theme's CSS, or copy it from an
  existing component.
- Hue-role and scale tokens do not follow the semantic ladder. A `bg-red-surface` stays red in both themes, so use it
  only where the color carries meaning.
