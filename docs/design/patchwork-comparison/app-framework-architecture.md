# Appendix: DXOS app-framework architecture report

> Generated from a source review of this repo (2026-07-24). Scope:
> `packages/sdk/app-framework` (the plugin kernel), `packages/sdk/app-toolkit`
> (Composer's opinionated layer on top of it), `packages/apps/composer-app`
> (assembly), and representative `packages/plugins/*` consumers.

## 0. Package topology (read this first)

There are **three layers**, not one:

1. **`@dxos/app-framework`** (`packages/sdk/app-framework`) — the plugin kernel. Defines `Plugin`, `PluginModule`, `ActivationEvent`, `Capability`, `CapabilityManager`, `PluginManager`, `Surface` (the React dispatch primitive), and a small set of framework-level capabilities (`ReactSurface`, `ReactRoot`, `PluginManager`, `Command`, `Layer`, operation/process-manager plumbing). It knows nothing about ECHO, graphs, navigation, or settings UI as domain concepts.
2. **`@dxos/app-toolkit`** (`packages/sdk/app-toolkit`) — "Composer-specific capabilities, plugin helpers" (per its own `package.json` description). Defines `AppCapabilities` (Layout, Translations, Settings, Schema, AppGraph, AppGraphBuilder, NavigationTargetResolver, ProgressRegistry, …), `AppActivationEvents` (SetupSettings, SetupAppGraph, SetupSchema, SetupTranslations, AppGraphReady, …), `AppPlugin` (builder sugar: `addSchemaModule`, `addSurfaceModule`, `addTranslationsModule`, `addAppGraphModule`, …), the `AppSurface` role-token library (Article, Section, Card, Dialog, Popover, Navigation, …), and ECHO-facing helpers (`AppNode`, `AppSpace`, `Query`, `TypeOptions`, `AppAnnotation`).
3. **`packages/plugins/*` + `packages/apps/composer-app`** — the ~100 actual plugins and the app that assembles them.

This split is itself the answer to "is app-framework a standalone kernel or an opinionated framework": **the kernel is standalone; the opinionated app model lives one layer up, in app-toolkit.**

## 1. Plugin model

**File:** `packages/sdk/app-framework/src/core/plugin.ts`

- `Plugin` (`plugin.ts:245`) is `{ [PluginTypeId]; meta: Readonly<Meta>; modules: ReadonlyArray<PluginModule> }`. `Meta` (`plugin.ts:188`) nests a `Profile` (wire `PluginProfileSchema` from `@dxos/protocols` + resolved `author`) and an optional `Release` — bundled (compile-time) plugins have no `release`; registry-installed plugins do.
- `PluginModule` (`plugin.ts:96`) is the real unit of activation:
  ```ts
  export interface PluginModule {
    id: string;
    activatesOn: ActivationEvent.Events;
    firesBeforeActivation?: ActivationEvent.ActivationEvent[];
    firesAfterActivation?: ActivationEvent.ActivationEvent[];
    activate: (
      props?: any,
    ) => Effect.Effect<Capability.ModuleReturn, Error, Capability.Service | Service | Scope.Scope | never>;
  }
  ```
  A module's id is auto-derived (`computeModuleId`, `plugin.ts:63`) from `pluginId + '.module.' + exportName` (the export name is read off the lazy-capability's `ModuleTag` symbol via `Capability.getModuleTag`), so authors rarely set `id` explicitly.
- **Builder API**: `Plugin.define(meta)` → `PluginBuilder`, `.pipe(Plugin.addModule({...}), Plugin.make)`. `Plugin.make` (`plugin.ts:369`) validates that a plugin doesn't declare itself as its own `dependsOn` and returns a `PluginFactory<T> = (options: T) => Plugin`.
- **Ordering is event-based, not registration-order-based** — explicitly documented (`plugin.ts:84-95`): module B runs after module A by A declaring `firesAfterActivation: [E]` and B declaring `activatesOn: E`, or B declaring `firesBeforeActivation: [E]` where E is something A listens on.
- **Lazy plugins** (`Plugin.lazy`, `plugin.ts:430`): `Plugin.lazy(meta, () => import('./RealPlugin'))` returns a factory producing a stub `Plugin` with real `meta` but zero modules; `Plugin.resolveLazy` (`plugin.ts:479`) is invoked by the manager on first `enable()`, dynamic-imports the real module, and validates the returned plugin's `meta.profile.key` matches (`LazyPluginError` with reasons `load-failed | missing-default | invalid-plugin | meta-mismatch`).
- **`ActivationEvent`** (`packages/sdk/app-framework/src/core/activation-event.ts:13`): `{ id: DXN.DXN; specifier?: string }`, with combinators `oneOf`/`allOf` (`activation-event.ts:49-54`) producing `{ type: 'one-of' | 'all-of'; events: [...] }`. `ActivationEvent.make(nsid)` validates the NSID at compile time via `DXN.Name<T>`.
- **Well-known events** live in `common/activation-events.ts` (framework-level: `Startup`, `SetupReactSurface`, `SetupProcessManager`, `ProcessManagerReady`) and in app-toolkit's `AppActivationEvents.ts` (`SetupSettings`, `SetupConnectors`, `SetupAppGraph`, `SetupPluginAssets`, `SetupTranslations`, `SetupSchema`, `SetupArtifactDefinition`, `AppGraphReady`, `ProgressRegistryReady`, plus a factory `createStateEvent(specifier)` for per-capability "ready" events like `LayoutReady`).

## 2. Capability system

**Files:** `core/capability.ts`, `core/capability-manager.ts`, `common/capabilities.ts` (well-known), `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts` (Composer-level well-known).

- **`Capability.make<T>(nsidString)`** (`capability.ts:141`) defines an `InterfaceDef<T> = { [InterfaceDefTypeId]: T; identifier: string }` — a phantom-typed string handle, NSID-validated at compile time (same trick as `Role.make`/`ActivationEvent.make`).
- **`Capability.contributes(interfaceDef, implementation, deactivate?)`** (`capability.ts:179`) wraps an implementation for return from a module's `activate`. Return type is the **opaque** `Any` (not `Capability<T>`), deliberately — so declaration-file emit doesn't leak module-internal source paths (TS2883 workaround noted in the comment).
- **`Capability.makeModule(fn)`** (`capability.ts:298`) is a typing helper pinning the generic shape `(props: TProps) => Effect<TReturn, E, R | Scope.Scope>` for the common patterns: single capability, array, tuple of different capability types (normalized to an array at runtime).
- **`Capability.lazy(name, loader)`** (`capability.ts:217`) is the standard way to define a module's `activate`: `Capability.lazy('ReactSurface', () => import('./react-surface'))`. The `name` becomes the `ModuleTag` symbol read back by `Plugin`'s `resolveModule` to auto-compute the module id.
- **Retrieval** (all effectful, via `Capability.Service` — an `Effect.Context.Tag` bound to the live `CapabilityManager`): `Capability.get` (throws-if-absent), `getAll` (never fails, `T[]`), `getOption`, `waitFor` (resolves once contributed), `atom`/`atomByModule` (reactive `Atom.Atom<T[]>` / per-module record), `asLayer`/`layerWith` (bridge into Effect `Layer` composition).
- **React-side**: `useCapability`/`useCapabilities` in `ui/hooks/useCapabilities.ts`, backed by `useAtomValue` over `manager.capabilities.atom(...)`.
- **`CapabilityManagerImpl`** (`core/capability-manager.ts:78`) is an atom-family keyed by `interfaceDef.identifier`: per-id entry lists (`{moduleId, implementation}`), derived `_capabilities` and `_capabilitiesByModule` atoms. `contribute` dedupes by `(moduleId, implementation)` reference equality (`capability-manager.ts:127`); `get` throws via `invariant` with the full `listRegisteredIdentifiers()` in the log (a `_loadModule` catch block parses this exact error string via regex to extract `missingCapability` for diagnostics — `plugin-manager.ts:1607`).
- **Well-known kernel capabilities** (`common/capabilities.ts`): `Null`, `PluginManager`, `AtomRegistry`, `ReactContext`, `ReactRoot`, `ReactSurface` (`= Surface.Definition | readonly Surface.Definition[]`), `Command` (Effect CLI), `Layer`/`LayerSpec`, `TraceSink`, `RemoteTraceMonitor`, `ServiceResolver`, `ProcessMonitor`, `ProcessManagerRuntime`, `ManagedRuntime`, `OperationHandler`, `UndoMapping`, `OperationInvoker`, `UndoRegistry`, `HistoryTracker`.
- **Well-known Composer/app-toolkit capabilities** (`AppCapabilities.ts`): `Layout` (reactive shell state), `Translations`/`Translator`, `AppGraph` (`{ graph: ExpandableGraph; explore }`), `AppGraphBuilder` (`BuilderExtensions`), `Settings` (`{prefix, schema, atom}`), `Schema` (`ReadonlyArray<Type.AnyEntity>` — the object-type registration point), `Toolkit`/`SkillDefinition`/`AiModelResolver`, `PluginAsset`, `FileUploader`, `AnchorSort`/`AnchorResolver`/`TextContent`/`CommentConfig` (per-typename extension points), `NavigationTargetResolver`/`NavigationHandler`/`NavigationPathResolver`, `ProgressRegistry`, `StatsPanel`.

## 3. PluginManager / activation lifecycle

**File:** `core/plugin-manager.ts` (1720 lines — the heart of the system).

- **State** is all Effect-Atom (`Atom.Writable`, `Atom.keepAlive`): `plugins`, `core` (ids with `meta.profile.tags.includes('system')`, snapshotted once at construction — `plugin-manager.ts:347`), `enabled`, `modules`, `active`, `eventsFired`, `pendingReset`, `failed` (`PluginFailure[]`), `devPluginIds`.
- **`add(id)`** loads via the injected `pluginLoader` and registers without enabling; supports a **dev-plugin shadowing** mechanism (`_markDev`/`_unmarkDev`, `plugin-manager.ts:484-498`) — a dev-sourced plugin can temporarily displace a same-id builtin/registry plugin, restored on `remove()`.
- **`enable(id, { resolveDependencies })`** (`plugin-manager.ts:574`): walks the transitive `dependsOn` closure across both registered plugins and the (Edge) plugin-registry catalog (`_computeDependencyClosure`, `plugin-manager.ts:1069`, DFS with cycle detection), installs missing-but-cataloged deps via `add`, then enables in dependency-first topological order via the idempotent `_enableOne`.
- **`disable(id, { cascade })`** (`plugin-manager.ts:824`) cascades to enabled dependents (leaves-first) by default, and **fails** with `PluginDependencyError{reason:'core-dependent'}` rather than silently disabling a core plugin transitively required.
- **Activation** (`activate(event)`, `plugin-manager.ts:894`): waits on a constructor-launched `_initialization` Deferred, then `_activateEvent` → `_getModulesForActivation` (filters inactive modules matching `activatesOn`; for `allOf` events, requires every constituent event already fired or currently activating — `plugin-manager.ts:1394`) → `_activateModulesForEvent`, which:
  1. fires each module's `firesBeforeActivation` events first (recursively, unbounded concurrency),
  2. loads all matching modules' capabilities in parallel (`_loadCapabilitiesForModules` → `_loadModule`, per-module-semaphore-guarded and memoized in `_moduleMemoMap`),
  3. contributes all resulting capabilities **synchronously, one module at a time** — explicitly _not_ parallelized because inserting a yield between contributions races the `allOf` resolver (comment at `plugin-manager.ts:1502`),
  4. fires `firesAfterActivation` events.
- **Timeouts**: lazy-plugin dynamic import capped at `loadTimeout` (default 30s) and each module's `activate()` capped at `activationTimeout` (default 30s) via `Effect.timeoutFail`; both failures record a `PluginFailure` and trigger `_scheduleAutoDisable` (skipped in dev/HMR — `plugin-manager.ts:1190`).
- **Deactivation/reset**: `deactivate(id)` tears down every module of a plugin (removes contributed capabilities, runs each capability's `deactivate()`, closes the module's Effect `Scope`). `reset(event)` deactivates all active modules for that event then re-activates it — used when a module is added/removed after an event already fired (`_setPendingResetByModule` tracks which already-fired events a newly-added module needs to re-trigger).
- **`shutdown()`** deactivates all active modules in reverse order, interrupts in-flight fibers, clears memoization maps and scopes — leaves `plugins`/`core`/`enabled`/`modules` intact so the manager is reusable.
- **Error handling**: typed `BaseError` subclasses — `PluginInitializationError`, `PluginTimeoutError`, `LazyPluginError`, `PluginDependencyError` — each carrying a `context.reason` discriminant.

## 4. Surfaces

**Files:** `common/Role.ts`, `ui/components/Surface/{types.ts,SurfaceManager.ts,SurfaceComponent.tsx,DESIGN.md}`.

- A **`Role<TData>`** (`Role.ts:18`) is `{ role: string; _phantom?: TData }` — a compile-time-validated NSID dispatch key with a phantom data type. Identity is structural (same `role` string ⇒ interchangeable).
- Providers register a **`Filter<TData>`** (`types.ts:26`, built by `Surface.makeFilter(token, guard?)`) — one or more `(role, guard)` bindings; omitting `guard` matches any data at that role. `Surface.create({ id, filter, component, position })` (`types.ts:251`) turns a filter into a `ReactDefinition`, contributed as the `Capabilities.ReactSurface` capability. `Surface.createWeb` does the same for Web Components (`tagName` instead of `component`).
- **Consumer side**: `<Surface type={Token} data={...} limit? />` (`SurfaceComponent.tsx:182`). Dispatch pipeline (`DESIGN.md`):
  1. `SurfaceManager` (`SurfaceManager.ts:48`) derives a per-manager `#index: Map<role, Definition[]>` from `Capabilities.ReactSurface` contributions, position-sorted (`Position.compare`) once per contribution change.
  2. A `<Surface>` subscribes only to its own role's candidate atom (`SurfaceManager.candidatesAtom(role)`, `Atom.family`) — contributions to _other_ roles produce structurally-equal results and are dropped, so unrelated surfaces never re-render (quantified 5× reduction in `DESIGN.md`).
  3. Per-render, candidates are filtered through their **data guard** (`matchCandidates`, `SurfaceComponent.tsx:269`) — intentionally _not_ memoized so a Surface re-dispatches when reactive `data` changes.
  4. `limit` truncates the candidate list; each surviving candidate renders inside its own `ErrorBoundary` (`resetKeys=[data]`) + `SurfaceContext.Provider`, under one shared `Suspense`.
- **No `ref`**: a Surface may resolve to 0, 1, or N components, so it deliberately accepts no forwarded ref (`SurfaceComponent.tsx:178`). `useIsSurfaceAvailable` runs match logic without mounting.
- **Composer's role vocabulary** is defined one layer up in `packages/sdk/app-toolkit/src/ui/components/app-surface.ts` as the `AppSurface` namespace: `Article` (main/plank content, carries `attendableId`, `subject`, `variant`, `path`, `companionTo`), `Section`, `Tabpanel`, `Related`, `CardContent`, `Dialog`/`Popover` (dispatch by `component: string` id), `Navigation`, `MenuFooter`, `NavbarEnd`, `DocumentTitle`, `StatusIndicator`, `FormInput`, `ObjectProperties`, `NavtreeItemEnd`, `SearchInput`, `DevtoolsOverview`, and a parametrized `deckCompanion(variant)` factory. `AppSurface` also supplies **combinators** over the framework's raw `Filter`: `object(token, schema, predicate?)` (ECHO-instance-typed subject), `literal`, `subject`, `snapshot`, `companion`, `settings(token, prefix?)`, plus `oneOf`/`allOf`. Matching is **role (string NSID) + a boolean guard over the `data` payload**, with `AppSurface` helpers doing ECHO-schema `instanceOf` checks as the common guard shape.
- **Composer's shell composition**: `plugin-deck` (the layout plugin unless mobile/popover) builds `main`/`article` regions from `AppSurface.Article`-role planks, a complementary sidebar, dialogs/popovers dispatching on `AppSurface.Dialog`/`Popover` + `component` id, and navigation/status chrome. Settings panels are `Article`-role planks whose subject is an `AppCapabilities.Settings` entry.

## 5. Operations

**Files:** `packages/core/compute/compute/src/{Operation.ts,OperationHandlerSet.ts,OperationRegistry.ts}`, `packages/core/compute/operation/src/{OperationInvoker.ts,scheduler.ts}`, app-framework's `plugin-process-manager/process-manager-capability.ts`, app-toolkit's `operations/*.ts`.

- **No lingering "Intent" system** — zero references to `IntentPlugin`/`resolveIntent`/`dispatchPromise` in app-framework/app-toolkit. Operations are the sole action-dispatch mechanism (a completed migration from the older `FunctionDefinition`/`defineFunction` API).
- **Definition**: `Operation.make({ meta: {key, name, description}, input: Schema, output: Schema, executionMode?, services?, types? })` — pure, serializable, no runtime logic (see `LayoutOperation.ts:23-43`: `UpdateSidebar`, `UpdateDialog`, `Open`, `Close`, `Select`).
- **Handler attachment**: `Definition.pipe(Operation.withHandler(Effect.fn(...)))` in a separate file. `OperationHandlerSet.lazy(() => import('./handler-a'), ...)` groups handler modules for dynamic import on first invocation; contributed via `Capabilities.OperationHandler`.
- **Invocation pipeline**: `ProcessManagerPlugin`'s capability module (`process-manager-capability.ts:50`) collects every plugin's `Capabilities.LayerSpec` into a `LayerStack` (→ `ServiceResolver`), builds a reactive `OperationHandlerSet` from contributions, composes a `ManagedRuntime`, and contributes `Capabilities.OperationInvoker`/`ProcessManagerRuntime`/`ServiceResolver`/`ProcessMonitor`. Each invocation spawns a monitored **process** with its own lifecycle, visible in the `ProcessMonitor` process tree.
- **Call sites**: `Operation.invoke(Def, input)` inside Effect gen, or `Operation.schedule(Def, input)` for fire-and-forget.
- **Undo**: `Capabilities.UndoMapping` (per-plugin) + `Capabilities.UndoRegistry`/`HistoryTracker` (provided by `ProcessManagerPlugin`) — operations opt into undo by contributing a mapping.
- **Serialization**: `Operation.SerializedInvocation` makes operations shippable as data (e.g. `LayoutOperation` `NotifyOverride.action` toast buttons surviving the process-failure boundary; per the operations skill, serializable to ECHO or over the wire).

## 6. App graph

Two distinct things:

- `@dxos/app-graph` (`packages/sdk/app-graph`) — the generic reactive graph data structure + `GraphBuilder` extension mechanism, framework-agnostic.
- `@dxos/plugin-graph` — a Composer **system** plugin owning the singleton `AppGraph` instance.

Mechanics:

- **`GraphBuilder`** (`graph-builder.ts:107`) holds an `ExpandableGraph` plus registered `BuilderExtension`s (`resolver?`, `connector?`, `relation?`, `position?`).
- Plugins author extensions with **`createExtension({ id, match, connector?, actions?, actionGroups?, resolver?, ... })`** (`graph-builder.ts:737`) — an Effect so callbacks get services through the ambient context. `match: (node, get) => Option<TMatched>` filters which nodes the extension attaches to (`NodeMatcher.whenRoot`, `NodeMatcher.whenEchoType(schema)`).
- Contribution pattern: `Capability.contributes(AppCapabilities.AppGraphBuilder, extensions)` (e.g. `packages/plugins/plugin-navtree/src/capabilities/app-graph-builder.ts:14-42`). `GraphPlugin` fires `SetupAppGraph` before and `AppGraphReady` after its activation — the fan-in point for all extensions.
- **`AppNode.makeObject`** (`packages/sdk/app-toolkit/src/app-graph/AppNode.ts:182`) is the canonical ECHO-object node builder — label from `Obj.labelAtom`, icon from schema `IconAnnotation` (with `IconFromRefAnnotation` delegation), drag/drop via `CollectionItemAnnotation`, plus `makeCompanion`/`makeSection`/`makeGroup`/`makeToolbarAction` helpers.
- **NavTree** (`plugin-navtree`) renders the graph and dispatches actions found via `graph.actions(nodeId)`.

## 7. Settings, translations, metadata

- **Settings**: `AppCapabilities.Settings = { prefix, schema, atom }` (`AppCapabilities.ts:153-176`), contributed via `AppPlugin.addSettingsModule` (activates on `SetupSettings`); e.g. `plugin-markdown/src/capabilities/settings.ts:14-37` builds a `createKvsStore`-backed atom and contributes both a plugin-internal capability and the generic one. Settings render as `Article`-role Surfaces via the `AppSurface.settings` filter.
- **Translations**: `AppCapabilities.Translations`, contributed via `addTranslationsModule` (event `SetupTranslations`). A framework-agnostic `Translator` capability + `TranslatorService` Effect layer lets non-React code translate. `Translations.Label` (plain string or `[key, {ns, count?, defaultValue?}]`) is the shared translatable-text type for graph/action/toast labels.
- **Metadata / object types**: `AppCapabilities.Schema = ReadonlyArray<Type.AnyEntity>` contributed via `addSchemaModule` (event `SetupSchema`). There is **no separate metadata registry** — icon/label/graph-behavior metadata lives as Effect-Schema **annotations on the type itself** (`IconAnnotation`, `CollectionItemAnnotation`, app-toolkit's `AppAnnotation.{GraphPropsAnnotation, SkillsAnnotation, SectionOrderAnnotation, HomeVisibilityAnnotation}`), read back by `AppNode.makeObject` at node-construction time.

## 8. Registering a new data type end-to-end

1. Define the ECHO schema (`Markdown.Document`), annotate it (icon, label, collection-item eligibility).
2. `AppPlugin.addSchemaModule({ schema: [Markdown.Document] })` → contributes `AppCapabilities.Schema` (visible to type pickers and the DB registry).
3. `AppPlugin.addCreateObjectModule(...)` → contributes `SpaceCapabilities.CreateObjectEntry { id: typename, createObject }` — powers "create new [Document]"; internally `Operation.invoke(SpaceOperation.AddObject, ...)`.
4. `AppPlugin.addSurfaceModule(...)` → contributes `ReactSurface` definitions matching `AppSurface.Article`/`Card`/`Section` filtered by `AppSurface.object(token, Markdown.Document)` — the actual rendering.
5. Optionally: `addCommentConfigModule`, `addTextContentModule`, `AnchorSort`/`AnchorResolver` for cross-cutting features.
6. A `GraphBuilder.createTypeExtension` (or manual extension with `NodeMatcher.whenEchoType`) contributes actions/children for instances.

No central "type registry" object exists; the registry _is_ the sum of capability contributions keyed by typename.

## 9. Composer assembly

**Files:** `packages/apps/composer-app/src/{main.tsx, plugin-defs.tsx, plugin-defs.core.tsx}`.

- **Core plugins** (`plugin-defs.core.tsx:55-111`): Attention, Client (ECHO bootstrap), Graph, one of Deck/Spotlight/SimpleLayout as layout, NavTree, Observability, Onboarding, ProcessManager, Registry, Routine, Settings, Space, StatusBar, Theme — all `tags: ['system']` (force-enabled, non-toggleable, `disable()` refuses to cascade through them).
- **Optional/content plugins** (`plugin-defs.tsx:146-229`): ~90 plugins, each `Plugin.lazy`-wrapped so `getPlugins()` is synchronous and cheap (real modules are separate Rollup chunks fetched on first `enable`).
- **`getDefaults(conf)`** (`plugin-defs.tsx:90-141`): which registered plugins are enabled by default, plus dev/local/labs additions gated by environment flags.
- **Dynamic/remote loading is real**: `main.tsx:433-457` combines compile-time `builtinPlugins` with `remotePlugins` fetched via `UrlLoader.preload(...)` (persisted URL list in `localStorage`, dynamic `import()`, validated/cached through a per-platform `PluginAssetCache` — Tauri filesystem / service-worker / no-op). `EdgeRegistryPluginProvider` (`core/edge-registry-plugin-provider.ts`) implements `Registry.PluginProvider` against Edge `/registry` HTTP endpoints — the dependency-closure logic treats the catalog as a peer source, so a `dependsOn` on a registry-only plugin auto-installs it. Dev-plugin shadowing lets a local Vite dev-server plugin displace a same-id builtin for the session.
- **Net effect**: plugins load from three sources simultaneously — compile-time bundled (lazy chunks), remote URL-installed (persisted, offline-cached), and Edge-registry-resolved — unified by the same `PluginManager.enable`/`add` API.

## 10. Coupling analysis

**`packages/sdk/app-framework/package.json` runtime deps**: `@dxos/async`, `@dxos/compute`, `@dxos/compute-runtime`, `@dxos/context`, `@dxos/debug`, `@dxos/edge-client`, `@dxos/effect`, `@dxos/errors`, `@dxos/invariant`, `@dxos/keys`, `@dxos/log`, `@dxos/operation`, `@dxos/protocols`, `@dxos/react-error-boundary`, `@dxos/react-hooks`, `@dxos/react-ui`, `@dxos/react-ui-list`, `@dxos/util`, `@dxos/web-context(-react)`, `effect`, `react`/`react-dom` (peer). **Notably absent: `@dxos/echo`, `@dxos/client`, `@dxos/react-client`.** Greps for these across `src/` match only inside `src/vite-plugin/*` build-time bookkeeping, never a runtime import. **The kernel has zero ECHO/client coupling.**

What app-framework _is_ coupled to:

- **`@dxos/compute`/`compute-runtime`/`operation`** — the operation/process-manager subsystem is baked into the kernel package (`plugin-process-manager/*`), not factored out. This is the biggest "not actually a pure kernel" data point.
- **React and `@dxos/react-ui*`** — `Surface`, `ReactRoot`/`ReactContext`, the whole `ui/` subtree (though `Surface` supports Web Components as a first-class alternative).
- **`@dxos/edge-client`, `@dxos/protocols`** — the remote-registry subsystem is baked in.

**Pure kernel** (would survive in a non-Composer, non-React host): `Plugin`/`PluginModule`/`ActivationEvent`/`Capability`/`CapabilityManager`/`PluginManager` (`core/*.ts` minus process-manager), `Role`, the dependency-resolution algorithm.

**Opinionated layers cleanly separated by package boundary**: AppGraph, Settings/Translations as domain concepts, the entire `AppSurface` role vocabulary, and ECHO-object-to-graph-node mapping all live in `@dxos/app-toolkit` (which _does_ depend on `@dxos/echo`, `@dxos/client`, `@dxos/app-graph`, `@dxos/ai`, `@dxos/compute`). A non-ECHO application could use `app-framework` directly and skip `app-toolkit` entirely.

Net assessment: app-framework is **mostly** a standalone plugin kernel, but not UI- or runtime-agnostic — it hard-codes React as the primary UI binding and Effect/Compute as the execution model, and bundles the operations/process-manager and remote-registry subsystems directly rather than as opt-in packages.

## 11. Maturity / direction signals

- Most app-framework core files carry 2025 copyright headers; `plugin-process-manager/history/*` and `process-manager-capability.ts` are 2026 — the operations/undo/process subsystem is the newest, still-hardening part.
- The Intents→Operations migration is complete (zero remnants); the operations skill documents it as the stable canonical pattern.
- Explicit deprecations in flight (app-toolkit): `TypeSection` ("moving away from the generic type-section pattern"), `AppNode.makeSettingsPanel` → `makeSection`, old space-tagging convention → `tags: [PERSONAL_SPACE_TAG]`.
- Standing kernel TODOs: typed errors for `Capability.get` (`capability.ts:36`); `// TODO(burdon): Convert to ECHO schema` on the `Plugin` interface (`plugin.ts:244`) — plugins-as-data is on the horizon; capability-contribution parallelization blocked by a documented race with the `allOf` resolver (`plugin-manager.ts:1502`).
- Performance/observability investment is recent and active: the Surface per-role-atom dispatch rewrite (quantified 5× re-render reduction with a dedicated `DESIGN.md`), extensive `performance.mark` instrumentation, startup-summary telemetry.
- Remote/dynamic plugin loading is production infrastructure, not scaffolding: timeouts, auto-disable, dev shadowing with restore, per-platform offline asset cache, Edge registry with author/provenance (`handle`/`did`).
