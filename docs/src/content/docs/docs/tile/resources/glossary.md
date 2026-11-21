---
title: Glossary
description: Every TILE term, defined once.
---

ECHO terms, such as space and object, are in ECHO's [glossary](/docs/echo/resources/glossary/). PLEX terms, such
as surface and capability, are in PLEX's [glossary](/docs/plex/resources/glossary/).

### Action

An action is a label, an icon and the function it runs. A toolbar or a menu can be drawn from a list of actions. See
[ActionToolbar](/docs/tile/api/react-ui-menu/action-toolbar/) for how to build the list.

### `asChild`

`asChild` is a prop that makes a part render no element of its own and pass its props to its single child. See
[Composite components](/docs/tile/concepts/composite-components/) for what the child must do in return.

### `classNames`

`classNames` is the prop that adds classes to a themed component, in place of `className`. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/) for what to pass in it.

### Composite component

A composite component is a component made of parts in one namespace, such as `Dialog.Root` and `Dialog.Content`. See
[Composite components](/docs/tile/concepts/composite-components/) for how the parts share state.

### Container

A container is the React component of a PLEX plugin that a PLEX surface renders. It reads the app's data and passes it to
components as props. The layout primitive with the same name is always written `Layout.Container`. See
[TILE in a PLEX plugin](/docs/tile/guides/tile-in-a-plex-plugin/) for the split between components and containers.

### Density

Density is how compact a region's controls are. A size sets it. See
[Density and sizes](/docs/tile/concepts/density-and-sizes/) for how a size reaches the controls inside an element.

### Focus ring

The focus ring is the ring a control draws while it has the keyboard's focus. See
[Focus and keyboard](/docs/tile/concepts/focus-and-keyboard/) for the variables that set its width and color.

### [Gutter](/docs/tile/api/layout/)

A gutter is the space at the start and at the end of the rows of a `Layout.Container`. A `rail` gutter is wide enough
for an icon.

### [Height chain](/docs/tile/concepts/layout/)

The height chain is the run of elements from a panel to its scrolling content, each passing its height down. A wrapper
that breaks it stops the content from scrolling.

### [Layout primitive](/docs/tile/concepts/layout/)

A layout primitive is one of the six components in the `Layout` namespace: `Flex`, `Grid`, `Container`, `Block`,
`Columns` and `Separator`.

### Level

A level is a step of the surface ladder, from `sunken` to `popup`. A higher level reads as nearer the viewer. The
levels `overlay` and `popup` name surfaces, not components. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/) for the surfaces at each level.

### [Mode](/docs/tile/guides/custom-themes/)

The mode is light or dark. Every semantic token has a value for each, and the dark values apply under a `dark` class
on the root element.

### [Namespace](/docs/tile/concepts/composite-components/)

A namespace is the object that holds a component's parts, such as `Dialog`. You import it whole from the component's
entry point.

### [Overlay](/docs/tile/learn/overlays/)

An overlay is a component that TILE draws above the page, such as a dialog, a popover, a menu, a tooltip or a toast.
It is not the `overlay` level of the surface ladder.

### Part

A part is one element of a composite component, such as `Dialog.Title`. See
[Composite components](/docs/tile/concepts/composite-components/) for how a part reads its `Root`'s state.

### Size

A size is a step of the size scale, `xs` to `xl`, set with `size` or `data-size` and inherited. See
[Density and sizes](/docs/tile/concepts/density-and-sizes/) for which components take one.

### Skill

A skill is a folder with a `SKILL.md` file that tells a coding agent how to do one kind of work. See
[Build with a coding agent](/docs/tile/build-with-a-coding-agent/) for the two skills DXOS keeps for TILE.

### Sprite

The sprite is the single SVG file, `/icons.svg`, that holds the icons an app draws. See
[Translations and icons](/docs/tile/concepts/translations-and-icons/) for how an icon gets into it.

### [Surface](/docs/tile/concepts/theme-and-tokens/)

A surface is a background that content sits on, such as `card-surface`. A PLEX surface is a different thing, a named
place in an app's UI.

### [Theme](/docs/tile/concepts/theme-and-tokens/)

The theme is TILE's stylesheets and the tokens they are built from. `ThemePlugin` generates the tokens' CSS when the
app builds.

### Token

A token is a CSS custom property for a color, size or spacing, used by role. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/) for how tokens are named.

### Translation namespace

A translation namespace is the name a set of translation keys is filed under, such as `com.example.contacts`. See
[Translations and icons](/docs/tile/concepts/translations-and-icons/) for how a component reads one.

### [Translation resource](/docs/tile/concepts/translations-and-icons/)

A translation resource is an object that maps a language to translation namespaces, and each namespace to keys and
their strings.

### `tx`

`tx` is the prop of `Theme.Provider` that takes a theme function. `Theme.defaultTx` is the one TILE exports. See
[Installation](/docs/tile/learn/installation/) for where it is passed.

### Valence

A valence is the status a component shows: `info`, `success`, `warning` or `error`, or `neutral` for none. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/) for the hue behind each.
