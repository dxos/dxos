# @dxos/graph

## 0.12.0

### Minor Changes

- 3c7b013: ECHO atom families no longer use `Atom.keepAlive`, so an entity's atoms, snapshots and subscriptions are released once nothing observes them instead of being retained for the lifetime of the page. Multi-key families (`Obj.atomProperty`, `Annotation.atom`, ref properties) are keyed by a tuple rather than nested families.

  `@dxos/effect` adds the `AtomEx` namespace with `AtomEx.makeRegistry`, an atom registry with a 5 second idle grace period (`AtomEx.DEFAULT_IDLE_TTL`). Use it for any registry that hosts ECHO atoms, which no longer carry `keepAlive`. The plugin manager's registry uses it (`atomIdleTTL`).

  Breaking: app-graph's `Graph.nodeOrThrow` and `@dxos/graph`'s `Store.nodeOrThrow` atoms are removed. Use `getNodeOrThrow`, which now throws `GraphNode.NotFoundError`, or read `node` and handle `Option.none`.

- b02fe16: Rebuilt `@dxos/graph` on Effect's `Graph` module and split the generic expansion engine out of the app graph builder.

  `GraphModel` is now a long-lived Effect `MutableGraph` with granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, incremental adjacency, `release(ids)` for unloading a subgraph outright (distinct from tombstoning `removeNode`), and opt-in `retainAtoms` that keeps each node's atom mounted for the life of the node. `ReadonlyGraphModel` and `ReactiveGraphModel` merge into `AbstractGraphModel`; constructors take an options bag.

  `@dxos/graph/GraphBuilder` owns the extension registry, connector subscriptions, id qualification, ordering and dirty-flush over a `Store` port, with `ModelGraphBuilder` as the default specialization; `@dxos/app-graph`'s `AppGraphBuilder` specializes the same engine with app nodes, actions and URL bindings (`BuilderExtension.url` is now the generic `meta`). Node-id path helpers move to `@dxos/graph/GraphNode`. The app-graph namespaces are renamed to `AppGraph`/`AppGraphBuilder`/`AppGraphNode` and published as subpaths under those names; the old `NodeMatcher` splits, with the generic combinators in `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones in `@dxos/app-toolkit/AppNodeMatcher`. Writes read the model directly instead of atoms (a mid-flush atom read returns pre-flush state), flushes coalesce through `GraphModel.batch` rather than `Atom.batch` (whose deferred rebuild strands invalidations raised after its rebuild pass), and expansion, updates and removal are measured faster than before the rebuild across the board.

- 3c85350: Composer now unloads the parts of the graph nothing is showing, and rebuilds them when you return. Plugins contribute `AppCapabilities.AppGraphRetention`s naming the nodes they need, as `{ id, depth? }`, and once any is installed the builder releases what none of them reaches below the root's children. A retention also names the relations whose targets live and die with their source (`attached`), so nothing but the policy decides what counts as a level. The deck keeps the whole of the active workspace, the previous one, and any workspace with a plank on screen, and names `action` and `companion` attached; the debug panel keeps its tree for the session.

  A node's URL now comes from the shape of its id rather than from the extension that produced it, so a node has the same URL whether or not it is loaded, and `Open` navigates at once instead of waiting for its subjects to load. A `UrlBinding` declares its shape with `path` (always segments), `minDepth` (the fewest segments its id spans, default 1), and `workspace`, and a singleton is its key below `path`; a data-dependent binding adds `resolve` for forward resolution, and its id is the node's last segment.

  Breaking: `AppGraphNode.actionRelation()` and `childRelation()` are now the constants `AppGraphNode.action` and `AppGraphNode.child`, with `AppGraph.inverseRelation` for the inbound side; companions now attach through `AppNode.companion` rather than `child`, so an extension returning `AppNode.makeCompanion` or `makeDeckCompanion` must declare that relation, and companions are read with `graph.connections(id, AppNode.companion)`. `GraphBuilder.Store` requires `release` and `outgoing`, `GraphBuilderProps.structural` is replaced by `Retention.attached`, `setRetention` takes a list, `AppCapabilities.AppGraphRetention` is a multi capability, `GraphTreeModelOptions` is removed, and `UrlGrammar.linkedKey`/`linkedPrefix` are now `linked: { key, relation, prefix }`, each field defaulting (`'linked'`, `'linked'`, `'~'`); the app graph learns the linked relation from the grammar, and a reader expands the relation itself. `NotFound.expandPath` is now `AppGraph.expandPath`. A `UrlBinding`'s resolver moves from `path` to `resolve`, `urlRepresentation` returns an `Option`, `GraphBuilder.getNodeExtensionId` and `Inline.owned` are removed, database views are addressed as `db/<type>+<id>` rather than `view/<type>+<id>`, commerce providers as `commerce/<id>` rather than `commerce/providers+<id>`, registry plugin nodes sit under a hidden `plugins` node, and a type section with a `sectionUrlKey` is named by that key (`createTypeSectionPaths` takes it too).

### Patch Changes

- 251f586: A graph builder marks a connector dirty when its inputs change and reads it once on the next flush, within the frame budget, so a burst of changes no longer recomputes connectors inside the change events. A connector node with an invalid id, or an extension that throws, is now logged and dropped at flush time rather than throwing from the expansion. Re-expanding a relation that `release` tore down now removes outputs its connector no longer produces. A store's `node(id)` atom must cut off unchanged values with nothing subscribed to it.
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [fd23a8b]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
