# @dxos/app-framework

## 0.12.0

### Minor Changes

- 0280a6a: Omitting `activatesOn` on a plugin module now puts it in the **idle** wave rather than the startup wave. A module that must run at boot has to declare `activatesOn: ActivationEvents.Startup` explicitly.

  This is a behaviour change for out-of-repo plugin authors: an un-annotated module that previously ran during startup now runs at host idle. Un-annotated modules remain pullable as providers, so one that a startup module `requires` is still activated ahead of its own wave — the change is only visible for modules nothing on the boot path depends on.

  The `@dxos/app-toolkit` maker families that back the app shell — `settings`, `operationHandler`, `reactContext`, `reactRoot`, `navigationResolver` and `navigationHandler` — now state `Startup` explicitly, so modules built with them are unaffected. `appGraphBuilder` (idle) and `skillDefinition` (assistant start) were already explicit.

- 6d52561: The boot loader now shows plugin activation as a row of icons rather than a scrolling text log.

  `window.__bootLoader` gains two methods: `plugins(entries)` registers the icon of every plugin that could activate (drawing nothing on its own), and `activated(id)` adds that plugin's icon to the row. Icons come from each plugin's own `meta.profile.icon` and resolve against the host's static sprite (`/icons.svg` by default; `bootLoaderPlugin({ spritePath })` overrides it). Arrivals queue and drain one at a time, spaced 200–400ms, since activation lands in bursts of a dozen inside a couple of frames.

  The per-module `Activating …` status lines are gone by default — a boot emitted hundreds of them. `useApp({ verboseStatus: true })` brings them back, collapsed to one line per plugin; `composer-app` exposes that as `VITE_DX_BOOT_VERBOSE=true` or `?boot-verbose`.

  `StartupProgress` gains `pluginName` and `pluginSlug`, identifying the plugin owning the in-flight module, so a host can render or filter transitions per plugin without parsing module ids.

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

- 2c06e2e: Fix two packaging defects that only appear outside the monorepo, where a package resolves through its published manifest instead of workspace links.

  A `#alias` declared in a package's `imports` map as a plain string answered every condition with the same target, and that target was TypeScript source. Because the alias survives into the emitted `.d.ts` and `.mjs`, a consumer installing the package resolved it into `node_modules/@dxos/<pkg>/src/`: tsc typechecked SDK source as if it were the consumer's own code (`skipLibCheck` does not apply, these are `.ts` files, not `.d.ts`), and Node failed outright on a specifier such as `#meta` with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. All 33 affected packages now declare `source`, `types` and `default`, so the alias resolves to `dist/` everywhere but the monorepo.

  `@dxos/app-framework/testing` imported `@dxos/storybook-addon-logger/download`, which was only a devDependency, so importing that entrypoint from an installed copy threw `Cannot find package`. `StorybookErrorFallback` now lives in `@dxos/storybook-addon-logger`, which owns the download channel it calls. Stories keep the "Download logs" action: the shared storybook preview installs it through the new `setStoryErrorFallback` export. Anyone importing `StorybookErrorFallback` from `@dxos/app-framework/testing` should import it from `@dxos/storybook-addon-logger/StorybookErrorFallback` instead.

- 61fe676: Defer activation events dispatched while startup is running until the startup wave completes, so a module activating on one can rely on every startup capability being present. Keep the composed React context stable across renders so a capability change no longer remounts the application. Add a `client` option to the client plugin, letting a host construct and begin initializing the client before the activation pass reaches the plugin.
- 63e500b: Space object CRUD is now projected from operations, and space operations no longer reach for app
  plugins to do it.

  `addObject`, `getObject`, `updateObject`, `removeObjects` and `queryObjects` are MCP-projected
  operations, so a remote agent reads and writes space objects through the same verbs the app uses.
  `addObject` takes one `object` field that is a union of a live entity and a `{ "@type", ...props }`
  description, so the schema itself admits exactly one form rather than two optional fields policed by
  a handler check; `removeObjects` accepts references alongside live entities,
  and space operations no longer require a capability manager they never use — both so a host without
  the app's UI capabilities can still invoke them.

  Observability events are registered rather than emitted. A plugin contributes an
  `ObservabilityMapping` — the operation, the event name, and how to derive the event's properties
  from the invocation's input and output — through the new `Capabilities.ObservabilityMapping`, and
  plugin-observability listens to the operation invocation stream and sends the event, exactly as undo
  derives an inverse from an `UndoMapping`. `Create`, `Share`, `Migrate`, `AddObject` and `AddType`
  no longer invoke `ObservabilityOperation.SendEvent` themselves, `SpacePlugin`'s `observability`
  option now decides whether the mappings are registered, and `SpaceOperationConfig.observability` is
  removed as a result.

  Skills move to the plugins that own their subject. `@dxos/plugin-connector` now owns the
  `connectors` skill (import `ConnectorsSkill` from it; enabling ConnectorPlugin contributes it), and
  `@dxos/plugin-space` owns the **Database** skill — object CRUD over the projected verbs, exported as
  `DatabaseSkill` from `@dxos/plugin-space/DatabaseSkill`.

  `@dxos/assistant-toolkit`'s own database skill is now chat-context binding alone
  (`contextAdd`/`contextRemove`), so it is renamed: `ChatContextSkill`, keyed `org.dxos.skill.chatContext`,
  exporting `ChatContextHandlers` and `ChatContextOperations`. The `org.dxos.skill.database` key goes
  with the verbs to plugin-space's Database skill, so a chat already bound to it keeps reading and
  writing objects. Everything else either moved to
  plugin-space or was retired as a duplicate: `objectCreate`, `objectDelete`, `objectUpdate`, `query`
  and `load` are covered by the projected verbs; `relationDelete` by `removeObjects`, which already
  accepts relations; `tagAdd`, `tagRemove` and `schemaList` moved as the annotated `addTag`,
  `removeTag` and `queryTypes`; and `relationCreate` and `schemaAdd` merged into plugin-space's
  existing `addRelation` and `addType`, each gaining the described form (a typename, references, or a
  JSON Schema) beside the live one, so the same verb serves an in-process and a remote caller.

  `Capability.getAllAvailable` and `Plugin.activateIfAvailable` are new: they read the app's
  contributions where they exist and return nothing where they do not, declaring no requirement. This
  is what lets `addType` fire `SpaceEvents.TypeAdded` and its `OnTypeAdded` callbacks in the app while
  still running on a host that has neither. Two
  capabilities moved onto the plugin-space verbs with the operations: `queryObjects` gained `in` (scope
  results to objects reachable from the given ones — how queue-backed mail is addressed), and
  `getObject` became `getObjects`, taking an array so a batch of references resolves in one call.

  The `discord` and `linear` skills are removed. Both advertised a tool whose handler set was
  registered nowhere, so invoking either failed at runtime; plugin-discord and plugin-linear already
  own connector-based sync for those services.

  Skill definitions are the atomic unit of MCP projection. A skill's `tools` list decides which
  operations project as MCP tools, and the load-the-skill-first pointer in each tool's description
  derives from that membership (the SEP-2640 shape). **`Operation.mcpTool` is removed** — with
  inclusion decided by skills and safety carried by `Operation.mutation`, nothing was left that the
  operation's own meta could not say: a tool's name is the key's final segment and its description is
  the operation's `description`. The three surviving overrides moved into meta, and
  `ProjectOperation.Create`'s key becomes `projectCreate` (its final segment was a too-generic
  `create`, and the key is now what names the tool). Folding those descriptions into meta also puts
  them in front of the in-app assistant, which never saw the MCP-only text.
  `DatabaseSkill` and `CodeProjectSkill` opt in with `mcpPrompt: true` and list their verbs
  (`CodeProjectSkill` now exports `operations`, spanning the project, task, milestone and outline
  verbs).

  Safety generalized into operation meta: the new `Operation.mutation('none' | 'write' |
'destructive')` annotation classifies an operation's effect on state — side-effect free, mutating
  but recoverable, or irreversible — as a fact about the operation rather than MCP projection
  config. The MCP server maps it to `readOnlyHint`/`destructiveHint` exactly as `safety` did, and
  now also maps the existing `Operation.idempotent` annotation to `idempotentHint`. An unclassified
  operation emits no hints, which clients treat as possibly-destructive.

  The space operations are one namespace: `SpaceObjectOperation`'s verbs (`getObjects`,
  `queryObjects`, `queryTypes`, `updateObject`, `addTag`, `removeTag`) move into `SpaceOperation`, and
  the `@dxos/plugin-space/SpaceObjectOperation` subpath is removed — import them from
  `@dxos/plugin-space/SpaceOperation`. `addType` and `addRelation` also drop their `db` input: the
  database comes from `Database.Service`, which callers key with `{ spaceId }` in the invoke options.

  `addObject`, `addRelation` and `addType` now declare `Database.Service` as a required service, and
  the MCP projection keys the ambient `spaceId` tool parameter off that declaration — only
  space-addressed tools advertise it (`removeObjects` takes its space from the entities or
  space-qualified refs it is given, so it declares nothing and carries no parameter). Resolution is
  strict: the service materializes only from `InvokeOptions.spaceId` (or the parent process's
  environment for nested invocations), so every call site that needs the database passes
  `{ spaceId: db.spaceId }` in options — the create-object entries across the plugins included.

  `@dxos/app-toolkit` gains `NavigationResolver.forType(type, { getPath, getLabel?, position?, pages? })`
  — the whole body of the common custom-section navigation resolver (load the queried object, check it
  is an instance of the type, answer the section's path for it), so contributing one is a one-call
  module. Sections built with `TypeSection.createTypeSectionExtension` still need no resolver at all:
  their url binding ends in the typename, which plugin-space's generic lookup already reads.
  plugin-studio and plugin-inbox now use the helper, and the custom-shaped sections that were missing
  a resolver gained one through it — plugin-blogger (Publication), plugin-code (CodeProject) and
  plugin-commerce (Provider) — so their objects resolve to their sections instead of only the generic
  database path.

  Each plugin exposes one operation handler set, on the subpath convention. `@dxos/plugin-space`'s
  `./operations` subpath is replaced by `./SpaceOperationHandlerSet`, whose single `handlers` set
  carries every space operation — the separate curated "serializable" subset is gone, because the
  constraint that forced it is: the new `Operation.serializable(operations)` serializes a handler
  list tolerantly, dropping (with a warning) the few operations whose input schemas cannot render as
  JSON, so a registry can be fed the full set without an `ImportSpace`-style schema failing the whole
  registration.

  `@dxos/mcp-server`'s two namespaces are renamed. `Gateway` becomes **`McpRegistry`** — "gateway"
  reads as an MCP proxy fronting other servers, which is the opposite of what it is: the host's link
  to its operation registry, which a host implements (`/McpRegistry`). `Server` becomes `McpServer`,
  and it absorbs the skill-backed surface: `McpServer.fromSkills({ skills })` yields the projected MCP surface (prompts, tools,
  `skillLoad`) requiring only `Operation.Service`, beside `McpServer.layer` for a host reading a
  registry through `Gateway`. The name deliberately shadows effect's `McpServer` because it wraps
  it — `toolkit` and `layerStdio` are re-exported, so a host needs one import rather than two under
  different names. The package exports `/Gateway` and `/McpServer`, each with a build entry so the
  published package can resolve them. `Gateway.SkillRecord` carries `tools`.

  Fixed in `@dxos/echo` along the way: a struct with an open rest signature (`Schema.StructWithRest`)
  now survives the JSON Schema round-trip. Effect 4 omits `additionalProperties` when the rest
  signature's value type is unconstrained, and the serializer only restored it for bare records — so
  the decoder rebuilt the struct closed and `addObject`'s draft silently dropped every field beyond
  `@type`. The restore now applies whenever the key is absent, which is unambiguous: a closed struct
  always carries `additionalProperties: false` explicitly.

  `addObject` persists a described object rather than only referencing it. A draft is instantiated detached and `CollectionModel.add` files it by pushing a ref — on the branch that mints a root collection for a space that has none, nothing added the object to the database, so the ref dangled: the call returned an id whose object could not be read back, and nothing replicated. Only the remote path was reachable, since in-process callers pass a live object that is already in a database.

  A database is no longer an operation input. `SpaceOperation.AddObject` and `InboxOperation.AddMailbox` take `target` as an optional _collection_ — absent means the space root — and resolve the database from the invocation's space id instead. A database is an in-process handle that cannot cross an RPC boundary, so accepting one in an input schema only ever worked for in-process callers; naming the space is the form that works for both. Call sites that passed `target: db` drop it (most already passed the matching `spaceId`), and the handlers lose the `Effect.provide(Database.layer(db))` they needed to reconcile an input database against the declared service.

- 1ab4bb8: Single-entry plugin authoring: `Plugin.addModule` skips `undefined` (headless barrels stub excluded modules), module specs and makers accept an `environments` annotation, and `@dxos/app-framework` ships a `dx-plugin` bin that generates the per-environment `#capabilities` barrels (`src/capabilities/gen/`) and syncs the package.json condition map from those annotations.

  Every `@dxos/plugin-*` package now authors a single canonical `plugin.ts(x)` and `capabilities/index.ts` on this pattern, instead of hand-maintained `plugin.node.ts`/`plugin.workerd.ts`/`capabilities/{node,workerd}.ts` variants. This migration also fixed two real drift bugs the hand-maintained variants had introduced: `plugin-client` and `plugin-routine`'s node-environment `OperationHandler` now activates on the `Startup` wave, matching browser and workerd, instead of silently defaulting to `Idle`.

  `@dxos/react-ui-assistant` gains a `./translations` export so consumers can take its translation resources without pulling the React root barrel.

- 886453b: Report where startup and the worker connection failed instead of only that they timed out. Failures raise typed errors (`StartupTimeoutError`, `WorkerError`, `WorkerConnectionError`) carrying their diagnostics in `BaseError.context`, so error tracking names the failure instead of showing a bare `Error` and `Effect.catchTag` can discriminate on it. `useApp` reports the modules still in flight and dispatches `STARTUP_FAILED_EVENT` on a module activation error as well as on the deadline, and `Connection` reports the leader and connect phase it reached, whether it holds the leader lock, and its retry counters. `@dxos/log` lifts an error's `context` onto the entry whether the error arrives as the entry's error, as the call's context, or as a value inside it, so callers no longer hand-lift it, and the PostHog log processor forwards structured context rather than dropping every value that is not a string, number, or boolean. `withContext` in `@dxos/errors` replaces the ad-hoc probes that read that field.
- 4a10672: New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

  `useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: the optimistic-overlay layer is removed entirely — `useOptimisticOperation`, `OptimisticBinding`, `useOptimisticQuery`, and the `@dxos/app-framework/Optimistic` module. Local-first sync writes need no overlay; a query view is a memoized `Atom.make` over `query.atom` read with `useAtomValue`.

  New `Ref.peek()` / `Database.peek(ref)` — the target when already materialized: the pinned target or a side-effect-free working-set lookup; never throws, never triggers loading. `Ref.target` is deprecated in its favor (it loads and registers a resolution callback as side effects, and can throw). Compose `Database.peek(ref) ?? (yield* Database.load(ref))` for a sync-when-materialized read with an async fallback — an effect built only from materialized refs runs under `Effect.runSync`. `Database.load` itself is unchanged — its async resolution also settles a just-added object into its own document, which flows like branching depend on. `TaskSet.resolveParentTask` uses that composition, and its cycle check walks the candidate's `parentTask` ancestor chain (equivalent to the old subtree collection, and it sees cross-set descendants) instead of querying.

  BREAKING: `TaskOperation.MoveTask`'s input requires a `taskSet` ref alongside the task and its handler needs no services. With loaded refs the whole operation completes without an async boundary — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay — while unloaded refs (e.g. an agent caller) load asynchronously through the same path.

- ee180f6: `useOperation(operation, map, options?)` in `@dxos/app-framework/ui`: binds an operation to a UI callback in one step — `map` turns the component's callback arguments into the operation input, and the returned handler keeps a stable identity across renders (the mapper and options are read through refs). `Optimistic.make(source)` in `@dxos/app-framework` overlays ordered optimistic entries on a reactive row-source atom (apply entries retire on the first source emission after the operation settles and auto-revert on failure; retain entries pin rows evicted from a filtered source through a grace window), and `useOptimisticOperation` binds an operation dispatch to such an overlay. `TaskSet.reorderItems` in `@dxos/types` generalizes `TaskSet.reorder` over any keyed list so optimistic transforms share the handler's ordering.

### Patch Changes

- 4a0b78b: Bundler-plugin entrypoints no longer publish a `source` export condition: `@dxos/app-framework/vite-plugin` and `@dxos/ui-theme/plugin`. These run in Node inside a `vite.config.ts` and reach `node:*`, so a `source` condition let an app's `source`-first resolver pull their Node-only sources into a browser bundle.

  Default resolution is unchanged — both entrypoints already resolved to their built `dist` for ordinary consumers, with the same exports and runtime behaviour. Only resolution under `--conditions=source` changes: it now yields the built output, matching `@dxos/config`'s bundler-plugin entrypoints.

- 5305365: Plugin body imports resolve concurrently instead of one at a time, so core plugins activate first and startup drops ~500 ms.
- 9c86066: Resolve trace sinks per write instead of snapshotting them when the process-manager runtime is built. A sink contributed by an on-demand module (plugin-progress contributes its progress adapter that way) landed after the snapshot and was silently dropped, so every operation's `status.update` reached the durable sink while the progress meters stayed empty.
- e26af7e: Count the startup deadline in observed execution time instead of wall clock, so a boot overlapping process suspension (a hidden native-app webview, App Nap, system sleep) no longer raises the fatal startup-timeout dialog. The native app also disables WKWebView background throttling, which suspended every JS realm for hours once the window sat hidden.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- Updated dependencies [9477170]
- Updated dependencies [96f94c2]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [b8762ef]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [a3d45c4]
- Updated dependencies [7575cb6]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [dde6714]
- Updated dependencies [b02fe16]
- Updated dependencies [e56276b]
- Updated dependencies [813069c]
- Updated dependencies [5ceaf9c]
- Updated dependencies [098a0bb]
- Updated dependencies [5180720]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [a09e18e]
- Updated dependencies [fc8c80c]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [1d6f730]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [f8bfba0]
- Updated dependencies [32584c9]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [85e6347]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
  - @dxos/compute-runtime@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/util@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/operation@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-error-boundary@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/web-context@0.12.0
  - @dxos/web-context-react@0.12.0

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
