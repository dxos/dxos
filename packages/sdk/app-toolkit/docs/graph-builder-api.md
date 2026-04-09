# Graph Builder API

## What Is the App Graph?

The app graph drives the entire layout of the application — the navigation tree, object actions, companion panels, and keyboard shortcuts. The ontology of the application is encoded into graph builder extensions, which compose across plugins to define what exists, how it's organized, and what you can do with it.

The graph is reactive — when the underlying data changes (e.g., a new object is created), graph builder extensions re-evaluate and the graph updates automatically.

## How Graph Builder Extensions Fit Together

```
Extension ──> Match ──> Actions / Connector
                │              │
        NodeMatcher       Node.makeAction / AppNode.makeCompanion
```

1. The framework evaluates each graph builder extension's `match` function against graph nodes.
2. For matching nodes, the extension's `actions` and/or `connector` functions run.
3. Actions appear in menus and toolbars. Connectors add child nodes.

## Core API: `@dxos/app-graph`

### `GraphBuilder.createExtension(options)`

Creates a graph builder extension with a matcher and optional actions/connector.

```typescript
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';

GraphBuilder.createExtension({
  id: 'root-actions',
  // Optional: 'hoist' places actions in the primary area.
  position: 'hoist',
  // Match function — determines which nodes this extension applies to.
  match: NodeMatcher.whenRoot,
  // Actions — functions returning action nodes for the matched node.
  actions: (node, get) =>
    Effect.succeed([
      Node.makeAction({
        id: 'create-something',
        data: () => Operation.invoke(MyOperation.Create, {}),
        properties: {
          label: ['create.label', { ns: meta.id }],
          icon: 'ph--plus--regular',
          disposition: 'menu',
        },
      }),
    ]),
  // Connector — returns child nodes for the matched node.
  connector: (node, get) =>
    Effect.succeed([Node.make({ id: 'child-node', type: 'my-type', data: myData, properties: { label: 'Child' } })]),
});
```

### `GraphBuilder.createTypeExtension(options)`

Convenience wrapper that matches ECHO objects of a specific type. The callback receives the typed object.

```typescript
GraphBuilder.createTypeExtension({
  id: 'item-actions',
  type: MyItem.MyItem,  // The Effect/Schema type with ECHO annotations.
  // `item` is typed as MyItem.MyItem.
  actions: (item, get) => Effect.succeed([
    Node.makeAction({
      id: 'archive',
      data: () => Operation.invoke(MyOperation.Archive, { item }),
      properties: {
        label: ['archive.label', { ns: meta.id }],
        icon: 'ph--archive--regular',
        disposition: 'list-item',
      },
    }),
  ]),
  connector: (item, get) => Effect.succeed([
    AppNode.makeCompanion({ id: 'details', label: [...], icon: '...', data: 'details' }),
  ]),
});
```

### NodeMatcher Patterns

```typescript
import { NodeMatcher } from '@dxos/app-graph';

// Matches the root node (global actions, deck companions).
NodeMatcher.whenRoot;

// Matches any node with an ECHO object.
NodeMatcher.whenEchoObject;

// Matches ECHO objects of a specific type.
NodeMatcher.whenEchoObjectMatches;

// Custom matcher — return Option.some(data) to match, Option.none() to skip.
const whenMyType = (node) => {
  return isMyType(node.data) ? Option.some(node.data) : Option.none();
};
```

### `Node.makeAction(options)`

Creates an action node in the graph.

```typescript
Node.makeAction({
  // Unique action ID.
  id: 'create',
  // Function or Effect invoked when the action triggers.
  data: () => Operation.invoke(MyOperation.Create, {}),
  properties: {
    label: ['create.label', { ns: meta.id }], // i18n label.
    icon: 'ph--plus--regular', // Phosphor icon.
    testId: 'myPlugin.create', // Test automation ID.
    // Where the action appears:
    // 'toolbar' — article toolbar, 'list-item' — navtree context menu, 'menu' — dropdown menu.
    disposition: 'toolbar',
    // Optional keyboard shortcut.
    keyBinding: { macos: 'meta+shift+e', windows: 'ctrl+shift+e' },
  },
});
```

### `Node.make(options)`

Creates a child node in the graph (used in connectors).

```typescript
Node.make({
  id: 'my-node',
  type: 'my-type',
  data: myObject,
  properties: { label: 'My Node', icon: 'ph--circle--regular' },
});
```

## App-Toolkit Helpers: `@dxos/app-toolkit`

### `AppNode.makeCompanion(options)`

Creates a plank-level companion node (a side panel attached to a specific object).

```typescript
import { AppNode } from '@dxos/app-toolkit';

AppNode.makeCompanion({
  id: 'related', // Identifies which surface renders.
  label: ['related.label', { ns: meta.id }], // i18n label.
  icon: 'ph--users-three--regular', // Tab icon.
  data: 'related', // Data passed to the surface filter.
  position: 'fallback', // Optional: 'fallback' renders after others.
});
```

### `AppNode.makeDeckCompanion(options)`

Creates a deck-level (workspace-wide) companion node.

```typescript
AppNode.makeDeckCompanion({
  id: 'my-panel',
  label: ['my-panel.label', { ns: meta.id }],
  icon: 'ph--sidebar--regular',
  data: 'my-panel' as const,
  position: 'fallback',
});
```

The corresponding surface uses `role: 'deck-companion--my-panel'` and `filter: AppSurface.literalSection('my-panel')`.

### `AppNode.makeSection(options)`

Creates a virtual branch node for a space section (e.g., a plugin's own sub-tree in the navigation tree).

```typescript
AppNode.makeSection({
  id: 'my-section',
  type: 'my-section-type',
  label: ['section.label', { ns: meta.id }],
  icon: 'ph--folder--regular',
  space,
});
```

### `AppPlugin.addAppGraphModule`

Registers graph builder extensions during the `SetupAppGraph` activation event.

```typescript
export const MyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  // ...
);
```

## Reactive Data Access: `get(atom)`

The `get` parameter in actions and connectors reads from reactive atoms powered by [effect-atom](https://github.com/effect-atom/atom). When an atom's value changes, the graph builder extension automatically re-evaluates and the graph updates. This is the same reactivity model used throughout the DXOS stack — atoms are lightweight reactive containers that track dependencies and propagate changes.

```typescript
import { AtomQuery } from '@dxos/echo-atom';
import { Filter } from '@dxos/echo';

connector: (space, get) => {
  // `AtomQuery.make` creates an atom that reactively tracks a database query.
  // When objects matching the filter are added or removed, `get` returns
  // the updated result and the connector re-runs.
  const items = get(AtomQuery.make(space.db, Filter.type(MyItem.MyItem)));
  return Effect.succeed(
    items.map((item) => createObjectNode({ db: space.db, object: item, resolve })),
  );
},
```

## Examples

- **plugin-exemplar**: [`src/capabilities/app-graph-builder.ts`](../../plugins/plugin-exemplar/src/capabilities/app-graph-builder.ts) — Root actions, sub-graph sections, type-specific actions, plank companions, and deck companions.
- **plugin-space**: [`src/capabilities/app-graph-builder/extensions/spaces.ts`](../../plugins/plugin-space/src/capabilities/app-graph-builder/extensions/spaces.ts) — Complex root actions with keyboard shortcuts and space node connectors.
- **plugin-script**: [`src/capabilities/app-graph-builder.ts`](../../plugins/plugin-script/src/capabilities/app-graph-builder.ts) — Type-specific companion panels.
- **plugin-meeting**: [`src/capabilities/app-graph-builder.ts`](../../plugins/plugin-meeting/src/capabilities/app-graph-builder.ts) — Conditional type-specific actions with reactive state.
