# @dxos/effect

## 0.12.0

### Minor Changes

- 3c7b013: ECHO atom families no longer use `Atom.keepAlive`, so an entity's atoms, snapshots and subscriptions are released once nothing observes them instead of being retained for the lifetime of the page. Multi-key families (`Obj.atomProperty`, `Annotation.atom`, ref properties) are keyed by a tuple rather than nested families.

  `@dxos/effect` adds the `AtomEx` namespace with `AtomEx.makeRegistry`, an atom registry with a 5 second idle grace period (`AtomEx.DEFAULT_IDLE_TTL`). Use it for any registry that hosts ECHO atoms, which no longer carry `keepAlive`. The plugin manager's registry uses it (`atomIdleTTL`).

  Breaking: app-graph's `Graph.nodeOrThrow` and `@dxos/graph`'s `Store.nodeOrThrow` atoms are removed. Use `getNodeOrThrow`, which now throws `GraphNode.NotFoundError`, or read `node` and handle `Option.none`.

- fd873d2: Graphs, menus and static trees keep atoms in the app's atom registry only for as long as the thing they belong to. A graph pins its nodes' atoms only while retained: the new `AppGraph.retain(graph)` pins every node, including ones added later, until the function it returns is called, and `release` unpins the nodes it drops. A graph builder retains its graph until `AppGraphBuilder.destroy`. `useMenuGraph` from `@dxos/react-ui-menu` builds a menu's graph and retains it from commit until it is replaced or unmounted, so a render React discards pins nothing. `AtomEx.makeOwned(owner, atom)` keeps an atom mounted while `owner` is alive and releases it once `owner` is garbage-collected; an owner implements `AtomEx.Owner`, exposing its atom registry and its class's static `FinalizationRegistry` under the `AtomEx.OwnerId` symbol; a graph model's version atom and a graph builder's extensions use it. Other graph atoms (edges, connections, actions) are views kept only while read: subscribe to them with `{ immediate: true }` or read them with `useAtomValue`.
- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process hook controller.

  - `@dxos/effect` gains a `Hook` module (`Hook.make`, `Hook.on`, `Hook.handler`, `Hook.subscribe`, `Hook.emit`, `Hook.Controller`, `Hook.makeController`, `Hook.controllerLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

- b1bb838: DevTools track entries are now off in production builds. `Performance.addTrackEntry` and the new imperative `Performance.trackEntry` put an entry on the performance timeline only under the dev server, or in a build made with `VITE_PERF_TRACK_ENTRIES=true`; the bundler folds the gate, so a gated site disappears from a build that has it off. Both bound what goes into `detail` with `Performance.summarizeDetail`, since `performance.measure` clones it in full and keeps every entry for the life of the realm.

  `@dxos/sql-sqlite` records its per-statement entry through that helper, with bound parameters reduced the same way its log line already reduces them, from both the in-process client and the MessagePort worker. Measured on a loaded Composer profile, the per-query entries were the largest allocating mechanism left in the tab.

### Patch Changes

- 472ca95: Errors from `EffectEx.runPromise` and `EffectEx.causeToError` include span frames again and drop Effect runtime frames. `SchemaEx.mapAst` keeps encoding checks on the nodes it rebuilds, and ECHO's JSON Schema output keeps the checks on optional properties.
- 882ac2a: The ECHO indexer now reports why it ran.

  Each pass is a single `EchoHost._runIndexPass` span carrying the histogram of requests that triggered it (`documents-saved`, `feed-blocks`, `batch-continuation`, …) plus what the pass did (`updated`, `done`, `invalidates`), and the two `IndexEngine.update` calls nest under it instead of each starting its own root trace.

  The trigger and outcome ride on the span rather than a log line: the only level the OTLP log sink exports is INFO, which is also a level the browser console shows, and at three passes a second that would bury the console it is meant to help.

  Supporting changes:

  - `EffectEx.withContext(ctx)` runs an Effect under a DXOS `Context`: the context's W3C trace identity becomes the effect's parent span, and disposing the context interrupts the fiber. Apply it before `RuntimeProvider.runPromise`/`provide`.
  - `@trace.span({ attributes })` accepts a function of the decorated call's own arguments, and a new `resultAttributes` derives attributes from the return value, attached when it resolves. A fault in either extractor costs the span its attributes and never fails the traced method.
  - `RemoteSpan.setAttributes` lets a backend attach attributes after a span started; buffered spans replay them.

- 6dadb41: Add `Yield.yieldOrContinue` to `@dxos/effect`, and move ECHO client update integration, link loading, query hydration, search matching and app-graph yields onto the `interactive`/`smooth`/`idle` yield strategies.
- Updated dependencies [967b130]
- Updated dependencies [ce194c0]
- Updated dependencies [9d2466a]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/context@0.11.1
- @dxos/invariant@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [3f1fc67]
  - @dxos/util@0.11.0
  - @dxos/context@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
