---
order: 4
---

# Core Plugins

## [Intent](intent.md)

Intents are a way for plugins to communicate with each other. They represent user actions and enable plugins to respond to changes in state initiated by the user or any other plugin. Similar to redux actions.

## [Surface](surface.md)

Defines a component `<Surface />` that allows developers to delegate presentation of arbitrary content to plugins. The entire user interface of Composer is constructed of Surfaces, and the core plugins `provide` components that fulfill them.

## [Graph](graph.md)

Responsible for maintaining the organizational structure of the user's data and representing the user's possible actions on that data.

## Theme

Provides a default DXOS UI theme to the rest of the app's components.

## Layout

Responsible for creating the main surfaces of the app layout, including the sidebars, main content area, dialog, and toolbar areas.

## NavTree

Responsible for rendering the Graph in a sidebar tree view.

## Markdown

Responsible for providing components that render and edit markdown content.

## PWA

Responsible for the PWA manifest and service worker for offline support.

## Native

Takes care of communications with the Socket Supply Runtime native components.

## Space

This plugin provides access to [DXOS](https://dxos.org) spaces.

::: note Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with feedback anytime.

:::
