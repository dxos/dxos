# worker-plugins — Design

Composer's dedicated services worker becomes a plugin host: a small base worker that owns the
infrastructure, with everything specific to client services contributed by plugin modules — the
same unit of contribution a tab uses.

## Shape

- **Base worker** — `@dxos/app-framework/PluginWorker` (`PluginWorker.run`; events and the host capability are `./WorkerEvents` and `./WorkerCapabilities`), on top of
  `@dxos/worker-framework/Worker`. It provides, and nothing else:
  - the hook bus: one `Hook.Controller` for the worker's life;
  - the RPC router: one `RpcRouter`, attached to every tab session's forward port;
  - `ConfigService` from the tab's `init` config;
  - a `PluginManager` running the worker plugins, and a `LayerStack` built from the
    `Capabilities.LayerSpec` they contribute.
- **Worker plugins** are ordinary `Plugin.define(...).pipe(Plugin.addModule(...), Plugin.make)`
  plugins. Their modules activate on `WorkerEvents.Startup` and reach the base through the
  `WorkerCapabilities.Host` capability (hooks, router, config, shutdown, stack teardown).
- **plugin-client** adds a `WorkerServices` module to `ClientPlugin` itself — one plugin, with a
  module only the worker activates (its event, `WorkerEvents.Startup`, is never fired in a tab, and the
  tab's events are never fired in the worker). It contributes the client-services `LayerSpec`s (plus
  SQLite) and subscribes to the base's hooks for the client-specific wiring (stack open, WebRTC
  through the owner tab, delayed networking, reset). Composer's worker plugin URL is
  `ClientPlugin.make({})`.

## Lifecycle

1. `init` arrives: base builds `Config`, the hook controller and the router.
2. Base `import()`s every URL in `runtime.client.workerPlugins`; each module's default export is a
   plugin factory. It runs a `PluginManager` over them and fires `WorkerEvents.Startup`.
3. Base collects `Capabilities.LayerSpec` once (decision 3a: a snapshot, like both existing
   `LayerStack` consumers) and builds the stack with the ambient services
   `ConfigService | Hook.Controller | RpcRouter`, then `stack.init()` (eager specs register RPCs).
4. Base emits `WorkerEvents.StackReady` (serial) and only then admits sessions.
5. Per tab session: attach the router transport over the forward protocol, emit
   `WorkerEvents.SessionOpened` with the reverse protocol and the session scope; on close emit
   `SessionClosed`. The last session closing requests shutdown.

## Decisions

- **D1 — plugins by URL (2b).** The tab lists worker plugin URLs in config
  (proto field `runtime.client.worker_plugins`, generated JS name `runtime.client.workerPlugins`); Composer produces them with `?module-url`
  (`@dxos/vite-plugin-module-url`). A plugin that fails to load fails `init`: the worker cannot
  serve a tab without its services.
- **D2 — base lives in app-framework.** It needs `PluginManager`; app-framework may depend on
  worker-framework/rpc/config without a cycle. Worker code imports subpaths only, never the root
  barrel (React/UI).
- **D3 — the router is ambient.** `clientServiceSpecs({ externalRouter: true })` omits
  `RpcRouterSpec`, so service registrations land on the base router the sessions attach to. HOST
  mode keeps its own router.
- **D4 — storage mode rides config.** `runtime.client.storage.persistent === false` selects
  in-memory SQLite in the worker (replaces Composer's `VITE_DX_STORAGE=memory` worker option; the
  tab sets the flag).
- **D5 — observability stays in the worker entry.** The log sink is installed at module load, telemetry
  starts in `PluginWorker.run`'s `onBeforeStart` (with the tab's config, before any plugin loads) and the
  identity data provider is added in `onStart` (after every `StackReady` subscriber, so the stack is
  open). A plugin would add a failure mode, and the log sink must predate plugin loading anyway.
  (Supersedes decision 4b's observability plugin, per review.)
- **D6 — worker plugins are entries of the worker's own build.** Composer's `ModuleUrlPlugin` is told
  `workers: { 'src/workers/dedicated-worker.ts': ['src/workers/client-plugin.ts'] }`: in the dedicated
  worker's build (the one Vite runs for its `new Worker(new URL(...))`), the plugin emits each listed module
  as an extra entry chunk with its exports kept. They share chunks with the worker entry, so the worker
  holds one instance of `effect`, `@dxos/rpc` and every other module they have in common. Vite copies the
  worker build's files into the tab's; the tab's `?module-url` import resolves to a placeholder that the
  plugin rewrites to the chunk's path as the importing chunk renders. Rejected on the way:
  - chunks emitted into the tab's build broke Composer's cycle-safe boot partition (a
    `boot-8 → chunk → boot-9` cycle left `trace` undefined) and could carry DOM code into the worker;
  - self-contained bundles per URL duplicated module-level state, and the first RPC reply failed with
    `DataCloneError: Symbol() could not be cloned`;
  - a separate Vite build environment for the worker and its plugins: it took over worker bundling,
    needed every client plugin marked out of it, and once `ClientPlugin` joined it needed
    `strictExecutionOrder` and no per-chunk CSS, and still failed to start in production.
    A plugin built elsewhere still bundles its own copies: sharing with it needs a shared-module registry.

## Risks

- The base imports `LayerStack` from the `@dxos/compute-runtime` root barrel, which drags the AI
  SDKs into the worker graph (the old `worker-runtime.ts` did the same). A `LayerStack` subpath
  export would cut it; tracked in TASKS.

- D6 relies on Vite treating a worker build's first output chunk as the worker entry and copying every
  other output file into the tab's build; `vite-plugin-module-url`'s test covers both.
