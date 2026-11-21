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
  - a `PluginManager` running the worker modules the tab sends, and a `LayerStack` built from the
    `Capabilities.LayerSpec` they contribute.
- **Worker modules** are modules of the app's ordinary plugins, declared with `Capability.workerModule`
  in the plugin's `dx.config.ts`. They activate on `WorkerEvents.Startup` and reach the base through the
  `WorkerCapabilities.Host` capability (hooks, router, config, shutdown, stack teardown).
- **plugin-client** adds a `WorkerServices` module to `ClientPlugin` itself — one plugin, with a
  module only the worker activates (its event, `WorkerEvents.Startup`, is never fired in a tab, and the
  tab's events are never fired in the worker). It contributes the client-services `LayerSpec`s (plus
  SQLite) and subscribes to the base's hooks for the client-specific wiring (stack open, WebRTC
  through the owner tab, delayed networking, reset).

## Lifecycle

1. `init` arrives: base builds `Config`, the hook controller and the router.
2. Base groups the entries in `runtime.client.workerModules` by plugin key, makes one plugin per key
   whose modules `import()` their body URL on activation, runs a `PluginManager` over them and fires
   `WorkerEvents.Startup`.
3. Base collects `Capabilities.LayerSpec` once (decision 3a: a snapshot, like both existing
   `LayerStack` consumers) and builds the stack with the ambient services
   `ConfigService | Hook.Controller | RpcRouter`, then `stack.init()` (eager specs register RPCs).
4. Base emits `WorkerEvents.StackReady` (serial) and only then admits sessions.
5. Per tab session: attach the router transport over the forward protocol, emit
   `WorkerEvents.SessionOpened` with the reverse protocol and the session scope; on close emit
   `SessionClosed`. The last session closing requests shutdown.

## Decisions

- **D1 — the tab sends module entries (supersedes "plugins by URL").** The plugin list exists only in
  the tab. The build records each plugin's worker modules on its lazy stub as data (id, body URL,
  requires/provides; `Plugin.getWorkerModules`), so reading them loads no plugin code. Composer builds its
  plugin list before its services, takes the plugins the app starts with (core, the enabled set
  `Hooks.readEnabled` reads from localStorage, and their dependencies: `Plugin.getStartupWorkerModules`) and
  sends their entries in `runtime.client.workerModules`. One message, no protocol change: the enabled set is
  synchronous, so the services handshake still overlaps plugin loading. A module that fails to load fails
  `init`: the worker cannot serve a tab without its services. A plugin enabled after startup reaches the
  worker on its next start. Plugin options never reach a worker module (a manifest cannot carry them); it
  reads what it needs from the config.
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
- **D6 — worker module bodies are chunks of the worker's own build.** `pluginConfigPlugin({ workerHost })`
  runs in both the page's build and the dedicated worker's (`worker.plugins`). In the worker's build it reads
  the `dx.config.ts` of each of the app's dependencies (from disk: Vite builds the worker while transforming
  `main.tsx`, before the page has loaded any config), and adds a dynamic `import()` of every `plugin-worker`
  body to the worker entry (on a global, so it survives tree-shaking), making it a chunk of that build with
  all its exports. Not an extra entry: Vite takes the build's first output chunk as the worker. The bodies
  share chunks with the worker entry, so the worker holds one instance of `effect`, `@dxos/rpc` and every
  other module they have in common. In the page's build each stub's entry URL is a placeholder the plugin
  rewrites to the chunk's path as the stub's chunk renders; in dev it is the body's `/@fs/` URL. A dependency
  whose plugin the app does not ship still gets its worker bodies built; they are never loaded. Rejected on
  the way:
  - chunks emitted into the tab's build broke Composer's cycle-safe boot partition (a
    `boot-8 → chunk → boot-9` cycle left `trace` undefined) and could carry DOM code into the worker;
  - self-contained bundles per URL duplicated module-level state, and the first RPC reply failed with
    `DataCloneError: Symbol() could not be cloned`;
  - a separate Vite build environment for the worker and its plugins: it took over worker bundling,
    needed every client plugin marked out of it, and once `ClientPlugin` joined it needed
    `strictExecutionOrder` and no per-chunk CSS, and still failed to start in production.
    A plugin built elsewhere still bundles its own copies: sharing with it needs a shared-module registry.

- **D7 — a worker-only module is decided at build time, by its environment.** `Capability.workerModule` is a
  `lazyModule` that activates on `WorkerEvents.Startup` in the `plugin-worker` environment alone. The page's
  manifests list only `browser` modules, so the page never contains it; the stub carries its entry as data.
  The plugin definition stays the one place the module is declared (per review: "same plugin, additional
  module"). Rejected: activation by event alone (worker-only by convention, and the page still built the
  module's chunk); a `#capabilities` package condition swapped in worker realms (needed a dev resolver that
  compiled every worker module twice, and a second worker plugin list in the app).

## Risks

- The base imports `LayerStack` from the `@dxos/compute-runtime` root barrel, which drags the AI
  SDKs into the worker graph (the old `worker-runtime.ts` did the same). A `LayerStack` subpath
  export would cut it; tracked in TASKS.

- D6 relies on Vite treating a worker build's first output chunk as the worker entry (true while it has
  one entry), copying every other output file into the tab's build, and building the worker before the
  page's chunks render.

- Rolldown's default splitting of the worker build can form chunk cycles. One ran `HubHttpClient`'s chunk
  before `BaseHttpClient`'s, so Composer keeps `edge-client` in one chunk group. One harmless cycle
  remains (no class crosses it); a new one surfaces as `Class extends value undefined` at worker start.
