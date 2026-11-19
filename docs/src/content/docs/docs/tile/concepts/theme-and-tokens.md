---
title: Theme and tokens
description: Semantic tokens, cascade layers, and `classNames` instead of `className`.
---

A token is a CSS custom property that holds one of TILE's colors or sizes. You style with tokens by role, never by
value, so one change to the theme reaches every component and every plugin.

## Model

A CSS variable lets you name a value once and use it in many rules. A token goes one step further. Its name says what
the value is for, such as a card's surface, not what the value is.

### Tiers

Color tokens come in three tiers. The table starts with the raw values, and each tier is built from the tiers above it
in the table:

| Tier     | Example                                                          | Use                                                     |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Scale    | `--color-neutral-150`, `--color-blue-600`                        | Raw values. A component never uses one directly         |
| Hue role | `--color-red-surface`, `--color-red-fg`                          | One set of roles per hue, for color that carries data   |
| Semantic | `--color-card-surface`, `--color-fg-muted`, `--color-error-text` | Named surfaces and roles of the UI. Reach for this tier |

You use a token through a class. Every `--color-<name>` token yields the Tailwind utilities `bg-<name>`, `text-<name>`
and `border-<name>`. For example, `--color-card-surface` gives `bg-card-surface`.

### Names

A color token is named `{name}-{kind}[-{state}]`. The name says what the token is for, such as `card`, `accent` or
`error`. The kind says what the color paints, and it is one of five words:

- `surface` is a background.
- `fg` is text on that surface.
- `bg` is a solid fill, such as a primary button.
- `border` is a border on the surface.
- `text` is text on the page itself, with no surface.

A state such as `hover` comes last. For example, `accent-bg-hover` is the fill of a primary button while the pointer
is over it.

### Light and dark

A semantic token holds its light value and its dark value together, with CSS `light-dark()`. The theme sets
`color-scheme: dark` under the `dark` class, so the browser picks the dark value there.

### Status colors

Four names are status colors, and each is an alias of a hue: `info` is sky, `success` is emerald, `warning` is amber
and `error` is rose. Each has all five kinds, so `text-error-text` and `bg-warning-surface` both exist. A **valence**
is the status a component shows. A component's `valence` prop takes one of these four, or `neutral`, which carries no
status and uses the neutral hue.

### Surface levels

A **surface** is a background that content sits on. Surfaces form a ladder of six **levels**, from `sunken` up through
`chrome`, `base`, `raised` and `overlay` to `popup`. A higher surface is lighter in dark mode, so a menu reads as
sitting above a card, which sits above the page.

| Level     | Named surfaces                                       |
| --------- | ---------------------------------------------------- |
| `sunken`  | `deck-surface`                                       |
| `chrome`  | `sidebar-surface`, `header-surface`                  |
| `base`    | `base-surface`                                       |
| `raised`  | `card-surface`, `modal-surface` (dialogs)            |
| `overlay` | None. Set this level on an element to lift it higher |
| `popup`   | `popover-surface`, for menus, popovers and toasts    |

The levels `overlay` and `popup` name backgrounds. An overlay, by contrast, is a component that TILE draws above the
page, such as a dialog or a menu, and it need not sit at the `overlay` level. A dialog draws on `modal-surface`, at
the `raised` level.

### Cascade layers

The theme puts its rules in named cascade layers, in this order: `properties`, `theme`, `dx-tokens`, `user-tokens`,
`base`, `tw-base`, `dx-base`, `components`, `tw-components`, `dx-components` and `utilities`. Your app's own styles
outside any layer win over all of them.

The theme declares its tokens in `theme`. In `dx-tokens` it sets its line widths and gutters, and the values that
change with a surface or with a density, which is how compact a region's controls are.

`user-tokens` comes after both, so a token value you set in that layer replaces the default.
[Custom themes and dark mode](/docs/tile/guides/custom-themes/) sets an accent color this way.

### Generated CSS

`ThemePlugin` generates the CSS when your app builds. It runs Tailwind over your sources and the components'
stylesheets, and a class that no scanned file names is not in the CSS. A class built from a string at run time, such
as `` `bg-${hue}-surface` ``, is never seen, so name classes in full.

## Behavior

**Overrides go through `classNames`.** A themed component takes a `classNames` prop, which is a string or an array of
strings, and merges it after its own classes. `className` is not among its props.

**Example** (Passing a width class to a button)

```tsx
<Button.Root classNames='w-full'>Save</Button.Root>
```

`w-full` is a layout hint, like a margin, and layout hints are what `classNames` is for. Pass color through tokens,
never as a raw value.

**Components read `--dx-*` variables.** These hold their sizes and states, such as `--dx-block-size` for a control's
height and `--dx-focus-ring-color` for its focus ring. If you set one on an element, it changes the components inside
it.

## Limits

- A guessed token name is not an error. `bg-input` or `text-primary` produce no CSS, and the element falls back to
  inherited colors that may be unreadable in one mode. Check the name against the theme's CSS, or copy it from an
  existing component.
- Hue-role and scale tokens do not follow the semantic ladder. A `bg-red-surface` stays red in both modes, so use it
  only where the color carries meaning.
