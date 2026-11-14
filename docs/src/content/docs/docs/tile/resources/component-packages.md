---
title: Component packages
description: The other react-ui packages, one line each.
---

These packages build on `@dxos/react-ui`. Each has its stories in the DXOS Storybook, and its source in
[`packages/ui`](https://github.com/dxos/dxos/tree/main/packages/ui). They are grouped by the data they are designed for.

## General purpose

These work with any data, in any React app.

| Package                             | What it holds                                                      |
| ----------------------------------- | ------------------------------------------------------------------ |
| `@dxos/react-ui-list`               | Lists, list boxes, ordered lists and trees                         |
| `@dxos/react-ui-menu`               | Menus and toolbars built from actions                              |
| `@dxos/react-ui-editor`             | The text editor                                                    |
| `@dxos/react-ui-attention`          | The attention system: which part of the app the user is working in |
| `@dxos/react-ui-pickers`            | Pickers for an emoji, a hue or an icon                             |
| `@dxos/react-ui-syntax-highlighter` | Highlighted source code                                            |
| `@dxos/react-ui-grid`               | A data grid, as a React wrapper of the `dx-grid` element           |
| `@dxos/react-ui-calendar`           | A calendar                                                         |
| `@dxos/react-ui-chat`               | Chat components                                                    |
| `@dxos/react-ui-feed`               | A virtualized feed of message items                                |
| `@dxos/react-ui-virtual`            | A virtualizer that keeps a list's position anchored as it grows    |
| `@dxos/react-ui-dnd`                | Drag and drop                                                      |
| `@dxos/react-ui-masonry`            | A masonry layout                                                   |
| `@dxos/react-ui-canvas`             | A 2D scene canvas with grids, layers and frames                    |
| `@dxos/react-ui-graph`              | Graphs and trees drawn in SVG                                      |
| `@dxos/react-ui-plot`               | Charts and plots                                                   |
| `@dxos/react-ui-geo`                | Maps and globes                                                    |
| `@dxos/react-ui-html`               | Sanitized HTML, rendered in a shadow root                          |
| `@dxos/react-ui-terminal`           | A terminal emulator for Effect CLI apps                            |
| `@dxos/react-ui-audio`              | Audio hooks and visualizations                                     |
| `@dxos/react-ui-animation`          | Timeline controls and clock hooks                                  |
| `@dxos/react-ui-dashboard`          | Dashboard components                                               |
| `@dxos/react-ui-gameboard`          | A game board                                                       |
| `@dxos/react-ui-rdf`                | A viewer for extracted semantic facts                              |
| `@dxos/react-ui-debug`              | An in-app viewer for `@dxos/log`                                   |
| `@dxos/react-ui-introspect`         | Browse and invoke the introspect MCP tools                         |
| `@dxos/react-ui-components`         | General-purpose components                                         |
| `@dxos/react-ui-experimental`       | Components still being tried out                                   |

## Designed for ECHO

These are built with ECHO's objects and schemas in mind, such as a form generated from an object's type.

| Package                         | What it holds                                 |
| ------------------------------- | --------------------------------------------- |
| `@dxos/react-ui-form`           | Forms generated from a schema                 |
| `@dxos/react-ui-table`          | A table of objects                            |
| `@dxos/react-ui-board`          | A board of columns and cards                  |
| `@dxos/react-ui-card`           | Card building blocks: rows, tiles and avatars |
| `@dxos/react-ui-markdown`       | Markdown viewing and editing                  |
| `@dxos/react-ui-thread`         | Threads, comments and messages                |
| `@dxos/react-ui-task`           | Task lists                                    |
| `@dxos/react-ui-search`         | Search lists, panels and results              |
| `@dxos/react-ui-query`          | Editors for ECHO queries                      |
| `@dxos/react-ui-assistant`      | The assistant's chat thread                   |
| `@dxos/react-ui-transcription`  | Audio capture and transcription               |
| `@dxos/react-ui-canvas-editor`  | The scene editor on `react-ui-canvas`         |
| `@dxos/react-ui-canvas-compute` | A compute graph for the canvas editor         |
| `@dxos/react-ui-trace`          | Process trees and trace timelines             |
| `@dxos/react-ui-mosaic`         | Stacks, decks and other layouts of objects    |

Four packages have guides: [Lists](/docs/tile/guides/lists/),
[Forms](/docs/tile/guides/forms/), [Menus and toolbars](/docs/tile/guides/menus-and-toolbars/) and
[Text editor](/docs/tile/guides/text-editor/).
