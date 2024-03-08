---
order: 1
---

# Core concepts

### Plugins

Everything in Composer is provided by a Plugin. For example, the `Layout` plugin provides a layout for the application, the `NavTree` plugin provides a navigation tree, and the `Settings` plugin provides a user preferences dialog.

### Surfaces

The Surface plugin defines an interface that allows developers to delegate the presentation of arbitrary content to a set of plugins. This allows developers to easily render content and for plugins to collaborate on presenting content recursively. The entire user interface of Composer is constructed of Surfaces that are fulfilled by components from different plugins.

### Intents

Plugins can communicate with each other through a system of intents that represent user actions, enabling plugins to respond to changes in state initiated by the user or any other plugin.

### Graph

The Graph plugin provides a way to store and manipulate data in a graph structure. It is used to organize the user's data and to represent the user's possible actions in the application.

::: note Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with feedback anytime.

:::
