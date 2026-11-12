---
title: Why TILE?
description: Why plugins written by different people look like one app.
---

Composer is made of plugins, and most of them are written by people who never talk to each other. Each plugin draws its
own UI. Without a shared system, every plugin would pick its own grays, paddings and focus styles, and the app would look
like a collage. TILE is the shared system.

## Tokens instead of colors

A plugin never names a raw color. It names a role: `bg-card-surface` for a card, `text-fg-muted` for secondary text,
`border-separator` for a rule. Each role has a light value and a dark value, so a plugin that uses roles follows the
user's theme without any code of its own. When the theme changes, every plugin changes with it. See
[Theme and tokens](/docs/tile/concepts/theme-and-tokens/).

## Components that bring their behavior

A menu has to open on Enter, move with the arrow keys, close on Escape and return focus to its trigger. A dialog has to
keep focus inside it. These rules are easy to get almost right. TILE's components are built on
[zag](https://zagjs.com) state machines through Ark UI, so the keyboard behavior and the ARIA roles come with the
component, and a plugin cannot leave them out. See [Composite components](/docs/tile/concepts/composite-components/)
and [Focus and keyboard](/docs/tile/concepts/focus-and-keyboard/).

## One size scale

Every control reads its height, text size and icon size from one scale, `xs` to `xl`. A toolbar, the input in it and
the menu it opens all take the same size, so they line up without per-component padding. See
[Density and sizes](/docs/tile/concepts/density-and-sizes/).

## No ECHO or PLEX required

`@dxos/react-ui` depends on neither. It works in any React app that adds its Vite plugin and stylesheet. The
[Installation](/docs/tile/installation/) page sets that up from scratch.
