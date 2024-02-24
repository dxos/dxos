---
order: 1
---

# Core concepts

### Plugins

Everything in Composer is provided by a Plugin. For example, the `Layout` plugin provides a layout for the application, the `NavTree` plugin provides a navigation tree, and the `Stack` plugin provides a vertically-scrollable list of objects. Plugins can be swapped out or extended, and new plugins can be added to the application to provide new functionality.

### Surfaces

The Surface plugin defines an interface that allows developers to delegate presentation of arbitrary content to a set of plugins. This allows developers to easily render arbitrary content and for plugins to collaborate on presenting any kind of content recursively. The entire user interface of Composer is constructed of Surfaces that can be fulfilled by components from different plugins.

### Intents

Plugins can communicate with each other through a system of intents that represent user actions, enabling plugins to respond to changes in state initiated by the user or any other plugin.

### Graph

The Graph plugin provides a way to store and manipulate data in a graph structure. It is used to organize the user's data and to represent the user's possible actions in the application.
