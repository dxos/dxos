# worker-plugins — Design

Composer's dedicated services worker becomes a plugin host: a small base worker that owns the
infrastructure, with everything specific to client services contributed by plugin modules — the
same unit of contribution a tab uses.

## Shape

- **Base worker** — `@dxos/app-framework/worker` (`PluginWorker.run`), on top of
  `@dxos/worker-framework/Worker`. It provides, and nothing else:
  - the hook bus: one `Hook.Controller` for the worker's life;
  - the RPC router: one `RpcRouter`, attached to every tab session's forward port;
  - `ConfigService` from the tab's `init` config;
  - a `PluginManager` running the worker plugins, and a `LayerStack` built from the
    `Capabilities.LayerSpec` they contribute.
- **Worker plugins** are ordinary `Plugin.define(...).pipe(Plugin.addModule(...), Plugin.make)`
  plugins. Their modules activate on `WorkerEvents.Startup` and reach the base through the
  `WorkerCapabilities.Host` capability (hooks, router, config, shutdown, stack teardown).
- **plugin-client** ships `@dxos/plugin-client/worker`: a worker plugin whose module contributes
  the client-services `LayerSpec`s (plus SQLite) and subscribes to the base's hooks for the
  client-specific wiring (stack open, WebRTC through the owner tab, delayed networking, reset).

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
  (`runtime.client.worker_plugins`, a new proto field); Composer produces them with `?module-url`
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
- **D5 — observability is a Composer worker plugin** (decision 4b), loaded by URL like the client
  plugin: log sink, observability init, echo-host WASM init before the stack builds, identity data
  provider on `StackReady`.

- **D6 — a module URL is a bundle of its own.** In a build, `?module-url` goes through Vite's
  worker bundler with the entry's exports kept, rather than emitting a chunk into the tab's build:
  shared chunks broke Composer's cycle-safe boot partition (a `boot-8 → chunk → boot-9` cycle left
  `trace` undefined) and could carry DOM code into the worker. The cost is that each plugin carries
  its own copy of module-level state. String-keyed identity (tags, capabilities, hooks) and
  `globalThis` singletons (`@dxos/log`) survive that; anything else must be set up in the bundle that
  uses it — so Composer's client plugin entry (`workers/client-plugin.ts`) initializes the slim
  automerge/subduction wasm itself before re-exporting `@dxos/plugin-client/worker`.

## Risks

- The base imports `LayerStack` from the `@dxos/compute-runtime` root barrel, which drags the AI
  SDKs into the worker graph (the old `worker-runtime.ts` did the same). A `LayerStack` subpath
  export would cut it; tracked in TASKS.

- Per-plugin bundles duplicate shared deps (app-framework, effect, client-services types) in bytes;
  see D6 for what must not be module-level state.
