# @dxos/graph

## 0.12.0

### Minor Changes

- b02fe16: Rebuilt `@dxos/graph` on Effect's `Graph` module and split the generic expansion engine out of the app graph builder.

  `GraphModel` is now a long-lived Effect `MutableGraph` with granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, incremental adjacency, `release(ids)` for unloading a subgraph outright (distinct from tombstoning `removeNode`), and opt-in `retainAtoms` that keeps each node's atom mounted for the life of the node. `ReadonlyGraphModel` and `ReactiveGraphModel` merge into `AbstractGraphModel`; constructors take an options bag.

  `@dxos/graph/GraphBuilder` owns the extension registry, connector subscriptions, id qualification, ordering and dirty-flush over a `Store` port, with `ModelGraphBuilder` as the default specialization; `@dxos/app-graph`'s `AppGraphBuilder` specializes the same engine with app nodes, actions and URL bindings (`BuilderExtension.url` is now the generic `meta`). Node-id path helpers move to `@dxos/graph/GraphNode`. The app-graph namespaces are renamed to `AppGraph`/`AppGraphBuilder`/`AppGraphNode` and published as subpaths under those names; the old `NodeMatcher` splits, with the generic combinators in `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones in `@dxos/app-toolkit/AppNodeMatcher`. Writes read the model directly instead of atoms (a mid-flush atom read returns pre-flush state), flushes coalesce through `GraphModel.batch` rather than `Atom.batch` (whose deferred rebuild strands invalidations raised after its rebuild pass), and expansion, updates and removal are measured faster than before the rebuild across the board.

### Patch Changes

- Updated dependencies [e8088ea]
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
