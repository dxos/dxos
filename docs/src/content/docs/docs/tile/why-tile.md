---
title: Why TILE?
description: Why UI written by many hands still looks and behaves like one app.
---

An app grows screens written by different people, at different times. Without a shared system, each screen picks its
own grays, paddings and focus styles. Keyboard behavior drifts from one menu to the next, and the app looks like a
collage.

TILE is the shared system. It gives you tokens that name roles instead of colors, components that bring their keyboard
and ARIA behavior with them, and one size scale. [Composer](/composer), DXOS's local-first workspace, loads plugins
from many authors who never talk to each other, and it draws every one of them with TILE.

## Tokens instead of colors

When you style a screen by hand, you pick each color yourself, and you pick a second one for dark mode. The next
author picks a slightly different gray.

With TILE, a plugin never names a raw color. It names a role, such as `bg-card-surface` for a card, `text-fg-muted`
for secondary text or `border-separator` for a rule. A **token** is the color behind a role, which the theme defines
once.

Each token has a light value and a dark value, so a screen that names roles follows light and dark mode with no code
of its own. When the theme gives a token a new value, every screen that names it changes too.

[Theme and tokens](/docs/tile/concepts/theme-and-tokens/) lists the roles and how their names are built.

## Components that bring their behavior

A menu has to open on Enter, move with the arrow keys, close on Escape and return focus to its trigger. A dialog has to
keep focus inside it. These rules are easy to get almost right.

TILE's components are built on [Ark UI](https://ark-ui.com), whose components run [zag](https://zagjs.com) state
machines. The machine owns the keyboard behavior and the ARIA roles, so they come with the component, and a plugin
cannot leave them out.

[Composite components](/docs/tile/concepts/composite-components/) shows how you put a component together from its
parts. [Focus and keyboard](/docs/tile/concepts/focus-and-keyboard/) says what each kind of control does with the
keys.

## One size scale

When each component sets its own height and padding, you adjust them one by one until a row lines up.

In TILE, every control reads its height, text size and icon size from one scale, `xs` to `xl`. A toolbar, the input in
it and the rows of a menu all take their height from that scale, so they line up without per-component padding.

[Density and sizes](/docs/tile/concepts/density-and-sizes/) shows how a size set on one element reaches the controls
inside it.

## No ECHO or PLEX required

`@dxos/react-ui` depends on neither ECHO, DXOS's database, nor PLEX, its plugin framework. You can use it in any React
app that adds TILE's Vite plugin and its stylesheets. [Installation](/docs/tile/learn/installation/) sets that up
from scratch.
