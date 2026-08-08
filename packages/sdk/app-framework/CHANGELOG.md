# @dxos/app-framework

## 1.0.0

### Minor Changes

- 0280a6a: Omitting `activatesOn` on a plugin module now puts it in the **idle** wave rather than the startup wave. A module that must run at boot has to declare `activatesOn: ActivationEvents.Startup` explicitly.

  This is a behaviour change for out-of-repo plugin authors: an un-annotated module that previously ran during startup now runs at host idle. Un-annotated modules remain pullable as providers, so one that a startup module `requires` is still activated ahead of its own wave — the change is only visible for modules nothing on the boot path depends on.

  The `@dxos/app-toolkit` maker families that back the app shell — `settings`, `operationHandler`, `reactContext`, `reactRoot`, `navigationResolver` and `navigationHandler` — now state `Startup` explicitly, so modules built with them are unaffected. `appGraphBuilder` (idle) and `skillDefinition` (assistant start) were already explicit.

- 34a8433: Order module activation by capability dependencies instead of hand-wired events.
  A module declares the capabilities it `requires` and `provides` (or a runtime
  `activatesOn` event) and the plugin manager topologically orders activation from
  that graph. Capabilities are yieldable Effect services, so accessing an undeclared
  capability or omitting a declared one is now a type error, and missing providers,
  dependency cycles, and duplicate providers fail fast with tagged errors instead of
  runtime assertions. Plugins compose as a flat chain of `Plugin.addModule` over
  module bodies authored with `Capability.lazyModule` (code-split) or
  `Capability.inlineModule` (eager), or with a per-capability maker from the new
  `AppCapability` namespace (`surface`, `settings`, `appGraphBuilder`, `translations`,
  `schema`, ...) that bakes in the module name and default provides. A module is an
  opaque `Capability.Module<Options>`, parameterized only by its options type, so a
  module export never leaks a foreign capability's type into declaration emit.

  Every plugin in the repository is migrated to this API. The plugins gain no
  behaviour of their own from the change, but any plugin defined outside the
  repository must be migrated too — the legacy API is removed, not deprecated.

  Breaking: the legacy event-wiring API is removed — `AppPlugin` and its
  `addXModule` helpers, `firesBeforeActivation`/`firesAfterActivation`, `compatFires`,
  and the ordering-only `Setup*`/`*Ready` activation events (genuine runtime events
  remain). `Capability.provide`/`provideAll` are renamed to
  `Capability.contribute`/`contributeAll`, and the untyped raw builder
  `Capability.contributes` is removed. Multi is now the default capability arity:
  `Capability.make` defines a multi (registry) capability and
  `Capability.makeSingleton` the single-provider case, both curried
  (`make<T>()(nsid)`) so the NSID literal brands the identifier. The
  `withPluginManager` `capabilities` test option now accepts `Contribution[]`.

### Patch Changes

- 4a0b78b: Bundler-plugin entrypoints no longer publish a `source` export condition: `@dxos/app-framework/vite-plugin` and `@dxos/ui-theme/plugin`. These run in Node inside a `vite.config.ts` and reach `node:*`, so a `source` condition let an app's `source`-first resolver pull their Node-only sources into a browser bundle.

  Default resolution is unchanged — both entrypoints already resolved to their built `dist` for ordinary consumers, with the same exports and runtime behaviour. Only resolution under `--conditions=source` changes: it now yields the built output, matching `@dxos/config`'s bundler-plugin entrypoints.

- Updated dependencies [557e243]
- Updated dependencies [557e243]
- Updated dependencies [7c426d4]
  - @dxos/react-ui@1.0.0
  - @dxos/compute@1.0.0
  - @dxos/compute-runtime@1.0.0
  - @dxos/operation@1.0.0
  - @dxos/edge-client@1.0.0
  - @dxos/async@1.0.0
  - @dxos/context@1.0.0
  - @dxos/debug@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/errors@1.0.0
  - @dxos/graph@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/protocols@1.0.0
  - @dxos/react-error-boundary@1.0.0
  - @dxos/react-hooks@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/util@1.0.0
  - @dxos/web-context@1.0.0
  - @dxos/web-context-react@1.0.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/operation@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-error-boundary@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/storybook-addon-logger@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/util@0.11.1
- @dxos/web-context@0.11.1
- @dxos/web-context-react@0.11.1

## 0.11.0

### Minor Changes

- 2048cb3: Replace `Surface.isAvailable` with `Surface.useIsAvailable`, a hook returning a stable, memoized function. Surfaces and graph extensions with an invalid (non-camelCase) local id are now dropped with a warning instead of throwing and crashing plugin activation.
- ed992c2: `Surface.create` accepts an optional `props` mapper, so a container can be registered directly
  instead of being wrapped in an adapter that unpacks the surface's `data` envelope:

  ```ts
  Surface.create({
    id: 'defaultPluginSettings',
    filter: AppSurface.settings(AppSurface.Article),
    component: DefaultSettings,
    props: ({ data: { subject } }) => ({ subject }),
  });
  ```

  The mapper's input type derives from the same `filter` that defines the surface's data shape, so the
  unpacking is type-checked rather than restated by hand, and is exported as `Surface.ComponentProps`
  for components that consume the whole envelope. `component` accepts any `ComponentType`, so a
  container re-exported through a `lazy()` barrel needs no cast. Additive: definitions without `props`
  receive the full surface props exactly as before.

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [1a9bca1]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [c727a43]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [f7d7735]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/async@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/react-error-boundary@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/storybook-addon-logger@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/web-context@0.11.0
  - @dxos/web-context-react@0.11.0
