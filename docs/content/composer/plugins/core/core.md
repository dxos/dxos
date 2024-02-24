---
order: 2
---
# Core Plugins

## Theme

Provides a default DXOS UI theme to the rest of the app's components.

## [Surface](surfaces)

Defines a component `<Surface />` that allows developers to delegate presentation of arbitrary content to plugins. The entire user interface of Composer is constructed of Surfaces, and the core plugins `provide` components that fulfill them.

## Layout

Responsible for creating the main surfaces of the app layout, including the sidebars, main content area, dialog, and toolbar areas.

## Graph

Responsible for maintaining the organizational structure of the user's data and representing the user's possible actions on that data.

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
