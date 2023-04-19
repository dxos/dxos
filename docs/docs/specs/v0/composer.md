# Composer

A developer-first, peer-to-peer knowledge management system.

## Scenarios

1. Users can collaborate on a github issue together
2. Users can work on folders of markdown files
3. Developers can extend Composer with custom data sources and visual surfaces

## Extensibility
> "Composer Chrome" refers to the total composer UI organization and all affordances surrounding the content the users interact with - all UI which is not the content itself.

Two levels of complexity are proposed in sequence:

**Static chrome**, where we constrain the application chrome to be statically defined and not extensible by plugins. Elements of the chrome may each expose some API surface for plugins to extend, but the overall elements of the chrome are fixed and can be assumed by all plugins without explicit dependency expressions.

**Dynamic chrome**, where the chrome and it's organization is also extensible and now plugins have to express explicitly the elements of chrome they depend on because their presence can no longer be assumed.

These are in addition to another orthogonal dimension of complexity, the way we load plugins:

**Static plugins**, where a `<Composer />` element is given a list of `Plugin[]` directly as props and has to be compiled into the app at build time.

**Dynamic plugins**, where the app knows how to load plugins via ESM `import` calls in the browser at runtime.


### 1. Static chrome (v1)

Large screens are split vertically into `sidebar` and `content` areas.
.------------.
|    |     o |
|    |       |
|    |       |
|    |       |
'------------'
Small screens turn the `sidebar` into a slide-over element that hides by default.

The HALO button (o) is in one of the corners and can be used to access the DXOS Shell.

The sidebar presents a tree of nodes which can be populated by plugins.

The content area can be filled by plugins, and can sense the state of the tree view (selection, nodes, etc).

```ts

type MaybePromise<T> = T | Promise<T>;

interface Plugin {
  // plugins can provide TreeNodes to the Tree
  getTreeNodes(parent: TreeNode): MaybePromise<TreeNode[]>;
  // plugins can provide actions to TreeNodes
  getTreeNodeActions(parent: TreeNode): MaybePromise<Action[]>;

  // plugins can provide a UI for the content area
  // content area components access the rest of the UI state via context
  getComponent(selection: TreeNode[]): MaybePromise<React.FC>;
}

```

In order to populate the tree, plugins are first asked to present their lists of children without a `parent` node (or a stand-in root node value). This generates the first level items in the Tree. Then, for each node ad-nauseum, plugins are asked to return more children until the tree reaches a steady state. This allows plugins to add nodes to each other's nodes.

Things to think about:
- how to do paging of large result sets
- how to detect circular / infinite trees and deal with them
- how to expand `getTreeNodes` lazily / in a timely manner without losing too much fidelity in the Tree

Some of the first plugins:
0. the spaces plugin - which provides a list of root nodes representing accessible ECHO spaces
1. the markdown plugin - which provides a plain text editor for the content area and fills the Tree with document and folder nodes
2. the filesystem plugin - which provides import / export to folders on disk
3. the github plugin - which provides nodes representing github issues and assets
4. the stacks plugin - which provides a stack editor for the content area and import / export actions to github

If a stack with custom tiles (frames) is required, that is just an extension of the stacks plugin, where the `Stack` returned from `getComponent` is endowed with more kinds of frames statically.


### 2. Dynamic chrome (v2)

Most of this will be discovered by experimentation with `static chrome` (v1) plugins to find the wishlists of plugin developers.

The core assumptions of this model can be that the screen receives elements (views) horizontally in a "stack" from left to right. This way, an activity bar stacks before a sidebar, followed by the content area, and possibly other "areas" further to the right if that becomes relevant. This might be the way to enable deep drilldown into complex data.

Views can be informed in general by the state of the views to the left. There is almost no statically defined chrome in Composer, except some paradigm for managing the views themselves (through the HALO button).

The HALO button can become "the only piece of chrome the app needs", and encapsulate a pop-over shell with panels that contain a plugin store, space navigation and access control, profile and presence management, etc. Plugins are discovered, installed, and managed entirely in the shell.

This is not a model we need to develop for now.