---
title: Glossary
description: Every TILE term, defined once.
---

### `asChild`

`asChild` is a prop that makes a part render no element of its own and pass its props to its single child. See
[Composite components](/docs/tile/concepts/composite-components/).

### `classNames`

`classNames` is the prop that adds classes to a themed component, in place of `className`. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/).

### Composite component

A composite component is a component made of parts in one namespace, such as `Dialog.Root` and `Dialog.Content`. See
[Composite components](/docs/tile/concepts/composite-components/).

### Container

A container is a `Panel` or `Layout.Container`, an element that sets the size and gutters for what is inside. See
[Layout](/docs/tile/concepts/layout/).

### Gutter

A gutter is the space at the start and end of a container's rows. A `rail` gutter is wide enough for an icon. See
[Layout API](/docs/tile/api/layout/).

### Height chain

The height chain is the run of elements from a panel to its scrolling content, each passing its height down. A wrapper
that breaks it stops the content from scrolling. See [Layout](/docs/tile/concepts/layout/).

### Level

A level is a step of the surface ladder, from `sunken` to `popup`. A higher level reads as nearer the viewer. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/).

### Part

A part is one element of a composite component, such as `Dialog.Title`.

### Size

A size is a step of the size scale, `xs` to `xl`, set with `size` or `data-size` and inherited. See
[Density and sizes](/docs/tile/concepts/density-and-sizes/).

### Sprite

The sprite is the single SVG file, `/icons.svg`, that holds every icon the app names. See
[Translations and icons](/docs/tile/concepts/translations-and-icons/).

### Token

A token is a CSS custom property for a color, size or spacing, used by role. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/).

### `tx`

`tx` is the theme function, which maps a component and its props to classes. `Theme.defaultTx` is TILE's. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/).

### Valence

A valence is a status color: `info`, `success`, `warning`, `error` or `neutral`.
