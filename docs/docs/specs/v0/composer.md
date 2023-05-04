# Composer

A developer-first, peer-to-peer knowledge management system.

## Scenarios

1. Users can collaborate on a github issue together
2. Users can work on folders of markdown files
3. Developers can extend Composer with custom data sources and visual surfaces

## Non-goals

1. Cross-application extensibility at the UI level

Although we intend to exercise scenarios where multiple applications share the same ECHO space and interoperate on ECHO objects, for the extensibility model described here, implementing support for multiple applications sharing plugins is out of scope.  

i.e. Composer should not have to support it's plugins running in Kai, and vice-versa, although the intention is to keep the Kai extensibility model within reach of Composer's such that experiments in Kai can move to Composer's design incrementally over time, through breaking changes and major version bumps.

## Extensibility

> `Application Chrome` refers to all UI elements and organization which are not user-generated content.

Two levels of complexity are proposed in sequence:

**Static chrome**, where we constrain the application chrome to be statically defined and not extensible by plugins. Elements of the chrome may each expose some API surface for plugins to extend, but the overall elements of the chrome are fixed and can be assumed by all plugins without explicit dependency expressions.

**Dynamic chrome**, where the chrome and it's organization is also extensible and now plugins have to express explicitly the elements of chrome they depend on because their presence can no longer be assumed.

These are in addition to another orthogonal dimension of complexity: **the way we load plugins**:

**Static plugins**, where the application is given a list of `Plugin[]` directly as props and has to be compiled into the app at build time.

**Dynamic plugins**, where the app knows how to load plugins via ESM `import` calls in the browser at runtime.

### 1. Static chrome (v1)

Large screens are split vertically into `sidebar` and `content` areas.

```
.-------------.
|    |    s o |
|    |        |
|    |        |
|    |        |
'-------------'
```

Small screens turn the `sidebar` into a slide-over element that hides by default.

The HALO button `(o)` is in the top right corner and can be used to access the DXOS Shell.

The Universal Search affordance `(s)` is in the top right corner, next to the HALO button (o). Clicking on it brings up an input box next to it, and any input there becomes visible to all plugins and surfaces through the application state `AppState`. The `sidebar` may visualize a flat list of filtered results found in the `tree` (instead of the `tree`) when a `searchTerm` is present in the `AppState`.

The `sidebar` presents a `tree` of nodes which can be populated by plugins.

The `tree` is a logical first solution to the problem of organization and represents a model users and developers are very familiar with and have grown to expect, having found the same model in almost all nearby and competitive products: Notion, Quip, Dropbox Paper, Google Docs, VSCode, Obsidian, ... etc.

Plugins also provide components that can fill the `content` area fully, one at a time, and can sense the state of the `tree` (selection, nodes, etc) and all other surfaces of the app.

#### Plugin interfaces

```ts
type MaybePromise<T> = T | Promise<T>;

type Plugin = {
  meta: {
    // serializable, could be stored in a space.
    id: string;
    name: string;
    description: string;
    icon: string | React.FC; // can be a URL or base64 encoded data: URL?
  };
  provides: {
    graph: {
      getNodes(parent: GraphNode): Observable<GraphNode[]>;
      getActions(parent: GraphNode): Observable<Action[]>;
    };
    content: {
      getComponent(selection: GraphNode[]): MaybePromise<React.FC>;
    };
  };
};

type Effect = (state: AppState) => MaybePromise<AppState>;

type Action = {
  id: string;
  label: string;
  icon?: React.FC;
  invoke(state: AppState): MaybePromise<Effect | Effect[]>;
};

type GraphNode<T = any> = {
  id: string;
  data?: T;
  label: string;
  description?: string;
  icon?: React.FC;
  actions?: Action[];
  loading?: boolean;
  disabled?: boolean;
  children?: GraphNode[];
  // parent?: GraphNode;
  labelEditable?: boolean;
  onLabelChanged?(value: string): any;
};

type AppState = {
  location: string; // the route URL
  searchTerm: string; // any search terms in universal search
  surfaces: {
    tree: {
      selection: GraphNode[];
      nodes: GraphNode[];
    };
    sidebar: {
      isOpen: boolean; // is the sidebar currently open
      isPinned: boolean; // whether the sidebar will autohide
    };
  };
  plugins: Plugin[];
  client: Client;
  // etc
};
```

In order to populate the tree, plugins are first asked to present their lists of children without a `parent` node (or a stand-in root node value). This generates the first level items in the Tree. Then, for each node ad-nauseum, plugins are asked to return more children until the tree reaches a steady state. This allows plugins to add nodes to each other's nodes.

Some of the first plugins:

0. the **spaces** plugin - which provides a list of root nodes representing accessible ECHO spaces
1. the **markdown** plugin - which provides a plain text editor for the content area and fills the Tree with document and folder nodes
2. the **filesystem** plugin - which provides import / export to folders on disk
3. the **github** plugin - which provides nodes representing github issues and assets
4. the **stacks** plugin - which provides a stack editor for the content area and import / export actions to github

If a stack of custom components is required, that is just an extension of the stacks plugin, where the `Stack` returned from `getComponent` is endowed with more kinds of components statically.

#### Things to think about:

- how to do paging of large result sets
- how to detect circular / infinite trees and deal with them
- how to expand `getNodes` lazily / in a timely manner without losing too much fidelity in the Tree

#### How Kai relates to this model

In v1 (static chrome) Kai can take advantage of the chrome to get ahead on compatibility with mobile screens, take advantage of the magic search box, and reduce boilerplate. Kai can re-implement itself as a specific expression of the `<AppChrome />` element with custom values for the sidebar content and list of plugins.

```tsx
const Kai = () => (
  <AppChrome
    sidebar={<KaiSidebar />}
    plugins={[
      new FramesPlugin(),
      new ChessPlugin(),
      new NotesPlugin(),
      new EmailPlugin(),
      new StacksPlugin({
        // with custom components that regular Stacks doesn't know about
        components: [Image, Map]
      })
      // ... etc
    ]}
  />
);
```

The current frames list can be implemented using Composer's `tree` surface where the "installed frames" are the root level items in the tree with no children. This list can be provided by the `FramesPlugin.provides.tree.getTreeNodes()` API. To replace the content area with a specific frame, the appropriate plugin can return it's `Frame` from e.g.: `ChessPlugin.provides.content.getComponent(selection)` API which is given the current selection from the `tree`. Routing state and updates to the URL will be handled by the Composer element internally.

Content items for every frame (such as email messages, specific contacts, etc) could exist as second level items in the tree under their respective frame nodes.

`<KaiSidebar />` is equally free to avoid using a `Tree` entirely and can replace that content with any form of accordion or stacked views desired. This sidebar can use a context hook like `useAppState` to get access to the current UI state which includes the list of loaded plugins and their APIs.

Kai plugins are free to extend the base `Composer.Plugin` while at the same time expanding their behavior with things Composer can't do.

In this example, Kai ignores the `tree` extensibility surface, and prescribes a different one for rendering a flat list of content items below the list of frames in the sidebar.

```tsx
interface KaiPlugin extends Plugin {
  provides: Optional<Plugin['provides'], 'tree'> & {
    contentList: {
      getItems(): ListItem[];
    };
  };
}
```

Dynamic loading of components / frames / routes in Kai should likely be unnecessary (because bundle size is adequately low) with this model and can be achieved "for free" later when Composer develops the `dynamic loading with ESM` capability for plugins.

### 2. Dynamic chrome (v2)

Most of this will be discovered by experimentation with `static chrome` (v1) plugins to find the wishlists of plugin developers.

The core assumptions of this model can be that the screen receives large, screen-dividing elements (views/surfaces) horizontally in a "stack" from left to right. This way, an activity bar stacks before a sidebar, followed by the content area, and possibly other "areas" further to the right if that becomes relevant. This might be the way to enable deep drilldown into complex data.

Views can be informed in general by the state of the views to the left. There is almost no statically defined chrome in Composer, except some paradigm for managing the views themselves (through the HALO button).

The HALO button can become "the only piece of chrome the app needs", and encapsulate a pop-over shell with panels that contain a plugin store, space navigation and access control, profile and presence management, etc. Plugins are discovered, installed, and managed entirely in the shell.

This is not a model we need to develop for now.

### Glossary

#### DMG
Distributed Meta Graph can store a graph of pointers to resources, and is used for plugin registration and discovery.

#### Application

An HTML web application running in a browser on a specific URL.

#### Component

A regular React component like `React.FC`.

#### Application Chrome

The set of components that make up UI elements which are not user-generated content. All the UI/UX and organization of layout around the content and data users manipulate in the app.

#### Extensibility Surface

A component (or group of) which can be influnced by plugin code. In Composer's v2 extensibility model (dynamic chrome) these are also provided by plugins and are represented in the DMG.

#### Plugin

A unit of code that satisfies one or more extensibility surfaces. Plugins are represented in the DMG.

#### Tree

A specific component in the sidebar of Composer which defines a way to render `TreeNode` and the `tree` extensibility surface for plugins.

#### Content Area

A specific component filling the main content area of Composer which chooses a component from what is provided by plugins to render full-screen in the content area, depending on what is selected in the `tree`.

#### Frame

Not a concept in this extensibility model (succeeded by any `Component` employing the `useAppState` hook), but can be a concept defined by a plugin within Kai.

## Key differences from Kai's frame-based extensibility model

- extensibility model is pure of (decoupled from) ECHO types and schema (with exception of maybe `Client` itself).
- new unit of registration and packaging (Plugin) is 1-n with Frames (Components) instead of 1-1 with them.
- replacement of a "new concept" `Frame` with any old React Component which uses the `useAppState` context hook.
- introduction of abstract concept of `extensibility surfaces` and made statically concrete two: `tree` and `content` surfaces.
- replacement of <FrameContainer> with the `Content area` extensibility surface.
- unification of `useAppRouter` and `useAppState` (and all other forms of application state into one).
- replacement of `React.lazy` loading of specific JSX modules containing Frames with static linking for v1, and with `ESM import` loading of Plugins in v2 version of the model.