# @dxos/app-graph

## 0.12.0

### Minor Changes

- b02fe16: Rebuilt `@dxos/graph` on Effect's `Graph` module and split the generic expansion engine out of the app graph builder.

  `GraphModel` is now a long-lived Effect `MutableGraph` with granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, incremental adjacency, `release(ids)` for unloading a subgraph outright (distinct from tombstoning `removeNode`), and opt-in `retainAtoms` that keeps each node's atom mounted for the life of the node. `ReadonlyGraphModel` and `ReactiveGraphModel` merge into `AbstractGraphModel`; constructors take an options bag.

  `@dxos/graph/GraphBuilder` owns the extension registry, connector subscriptions, id qualification, ordering and dirty-flush over a `Store` port, with `ModelGraphBuilder` as the default specialization; `@dxos/app-graph`'s `AppGraphBuilder` specializes the same engine with app nodes, actions and URL bindings (`BuilderExtension.url` is now the generic `meta`). Node-id path helpers move to `@dxos/graph/GraphNode`. The app-graph namespaces are renamed to `AppGraph`/`AppGraphBuilder`/`AppGraphNode` and published as subpaths under those names; the old `NodeMatcher` splits, with the generic combinators in `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones in `@dxos/app-toolkit/AppNodeMatcher`. Writes read the model directly instead of atoms (a mid-flush atom read returns pre-flush state), flushes coalesce through `GraphModel.batch` rather than `Atom.batch` (whose deferred rebuild strands invalidations raised after its rebuild pass), and expansion, updates and removal are measured faster than before the rebuild across the board.

- 3214dcf: **Breaking:** `Graph.expand` is renamed to `Graph.expandSync`, and `Graph.expand` now returns an `Effect` that runs the expansion off the paint-critical path. Both overloads (direct and curried) are preserved on `expandSync`, so migrating is a rename. Interrupting the new `expand` cancels a still-pending expansion, which makes superseding one scheduled expansion with another a matter of interrupting the previous fiber.

  Expanding a node also no longer blocks the main thread on stack-trace capture. `Atom.withLabel` records a stack trace on every call, and the graph labelled an atom per node, per connection key and per extension, so a single expansion cost hundreds of captures — measured at 17ms with 40 registered extensions. Labels are now opt-in via `VITE_ATOM_LABELS` under the dev server.

  The nav-tree's hover prefetch uses the new scheduled `expand` behind a 150ms settle delay, so moving the cursor across rows only expands the row it stops on.

  The tooltip context is split so that pointing at a trigger no longer re-renders every `Tooltip.Trigger` in the app, and the open tooltip's `data-state`/`aria-describedby` are applied to the active trigger alone rather than to all of them.

- 987f7e1: Replace each plugin's `./plugin` entrypoint with an `XPlugin` namespace. **Breaking:** import the plugin from its own subpath and construct it with `make` — `import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin'; ChessPlugin.make()` in place of `import { ChessPlugin } from '@dxos/plugin-chess/plugin'; ChessPlugin()`. Plugin metadata is available as `XPlugin.meta` without loading the plugin body. **Breaking:** `@dxos/plugin-graph` no longer re-exports `@dxos/app-graph`, which now publishes per-namespace subpaths: `AppGraph`, `AppGraphBuilder` and `AppGraphNode`. The old `NodeMatcher` splits by member — the generic combinators (`whenRoot`, `whenId`, `whenNodeType`, `whenAll`, `whenAny`, `whenNot`) move to `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones (`whenEchoObject`, `whenEchoObjectMatches`, `whenEchoType`, `whenEchoTypeMatches`) to `@dxos/app-toolkit/AppNodeMatcher`.

### Patch Changes

- bf4f1e6: Key observable atoms by reference so graph extensions no longer fail on clients without a shell.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 68e61ca: Drive connector-auth ("Connect X") toolbar actions from a `ConnectorAuthAnnotation` schema annotation, resolved by a single app-graph extension in plugin-connector — replacing the per-plugin `connectorAuthExtension` helper (removed). Owning plugins inline their own sync/generate toolbar actions. Adds `actionGroups` to `GraphBuilder.createExtension`/`createTypeExtension` and a `primary` menu-action variant.
- 1a989ed: Graph actions can now declare `disposition` as an array and a `presentation` chrome override per surface, letting one action multi-target the object toolbar and nav-tree context menu with appropriate chrome in each. Mailbox and calendar "Sync" now surface from a single graph action instead of a duplicated toolbar button.

### Patch Changes

- 5585ec8: Fix the graph's `_expanded` / `_initialized` latches and `_initialNodes` / `_initialEdges` seeds never recording anything: they were built with `Record.empty()` and written with `Record.set(...)`, which is immutable in Effect and returns a new record rather than mutating. As a result every `Graph.expand` call re-fired the node's connector, re-running its queries. They are now a `Set`/`Map`, matching `_pendingExpands`.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
