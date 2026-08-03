# Activation sequence

How a Composer-style app gets from an HTTP request to an interactive UI, and where each
activation wave fits. Read alongside [`registry-spec.md`](./registry-spec.md), which covers what a
plugin _is_; this covers _when_ its modules run.

## Vocabulary

- **Module** — the unit of activation. Declares `requires`/`provides` (capability tags) and
  `activatesOn` (its wave). Omitting `activatesOn` puts it in the **startup** wave.
- **Wave** — the set of modules sharing an activation event. Firing an event activates its wave,
  ordered topologically by the capability graph.
- **Pull** — a module in the running wave activating a provider it `requires`. Only providers
  whose own wave has already fired are pullable, so two providers of the same capability gated on
  mutually exclusive events can never both be candidates.
- **Fired events are monotonic** — once an event has fired it stays fired, so a module whose wave
  has passed remains eligible in every later round. That is what lets a consumer activate when a
  provider from some other wave finally lands.

## The four waves

| Wave                      | Fired by                                  | Carries                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `Startup`                 | `PluginManager.start()`                   | The boot path — client, layout, deck, space, graph                       |
| `Idle`                    | the host, once the app is ready           | Registration-only contributions — graph builders, handler sets, settings |
| `SurfacesRequested(role)` | a `Surface` for that role first rendering | Surface modules that declared `roles`                                    |
| `<plugin>.event.start`    | that plugin's first surface contributing  | The rest of that plugin's feature modules                                |

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant Boot as Boot loader
    participant App as useApp
    participant PM as PluginManager
    participant Cat as PluginCatalog
    participant Sch as ActivationScheduler
    participant ML as ModuleLoader
    participant Client as ECHO client

    User->>Browser: navigate
    Browser->>Boot: GET / → HTML + entry chunk
    Note over Boot: performance.mark('boot:html-parsed')
    Boot->>Boot: render skeleton (no plugin code yet)

    rect rgb(230, 240, 255)
    Note over App,ML: Startup wave — the critical path
    Boot->>App: mount
    App->>PM: make({ pluginLoader, plugins, enabled })
    App->>PM: start()
    PM->>Sch: activate(Startup)

    par Streaming registration
        Cat->>Cat: resolveLazy(stub) per plugin
        Cat->>PM: addModule() as each definition lands
        Note over Cat: modules join rounds as they register —<br/>no barrier waiting for the full set
    and Topological activation
        Sch->>Sch: runRound → select runnable → order into waves
        Sch->>ML: load(module) per wave, bounded concurrency
        ML->>ML: yieldToHost between chunks (scheduler.yield)
        ML-->>Sch: capabilities contributed
    end

    Sch->>Client: ClientPlugin activates
    Client-)Client: initialize() forked off the pass
    Note over Client: Startup completing no longer implies<br/>an initialized client — hooks suspend
    Sch-->>PM: Startup settled
    end

    PM-->>App: ready
    App->>Browser: render shell (first paint)

    rect rgb(235, 250, 235)
    Note over App,ML: Idle wave — after paint
    Sch-)Sch: whenIdle, then activate(Idle) — forked by start()
    Note over Sch: owned by the manager, not the host:<br/>no React effect, and headless hosts get it too
    Sch->>ML: load registration-only modules
    Note over ML: graph builders, handler sets, settings —<br/>contributions, not feature code
    end

    rect rgb(255, 245, 230)
    Note over User,ML: Demand waves — driven by what renders
    User->>Browser: opens an item
    Browser->>App: Surface role=article mounts
    App->>Sch: activate(SurfacesRequested('article'))
    Sch->>ML: load surface modules declaring that role
    ML->>ML: a module contributes ReactSurface
    ML-)Sch: activate(<plugin>.event.start) — forked
    Note over ML,Sch: forked, not awaited: capability atoms are<br/>reactive, so the surface renders as soon as<br/>its own contribution lands
    Sch->>ML: load the rest of that plugin's modules
    ML-->>Browser: re-render with full feature set
    end

    User->>Browser: interacts (invoke operation)
    Browser->>PM: operation dispatch
    Note over PM: handler sets registered at Idle are a<br/>definition→loader map; the BODY loads here,<br/>per invocation
```

## Why the split

The startup wave is the only one on the critical path, so everything that can leave it does.
Three mechanisms move work off it:

1. **Fork rather than await.** `client.initialize()` runs off the startup pass; consumers suspend
   on it instead of the whole app waiting.
2. **Register the definition, load the body later.** A keyed `OperationHandlerSet` is a
   definition→loader map with no implementations attached, so the operation registry is complete
   at boot while each handler's body loads per invocation. The deferral axis is the operation, not
   the module.
3. **Let rendering be the demand signal.** A surface module declaring `roles` loads when a
   `Surface` for one of those roles first renders; a plugin's remaining modules load when one of
   its surfaces contributes.

## Testing implications

Demand comes from the UI, so environments that render nothing produce none of it. A headless
harness mounts no surfaces and a story mounts exactly one, so both would otherwise sit at whatever
the startup pass activated. `activateDemandGatedModules` (in `./testing`) substitutes for that by
firing the idle wave and every plugin's start event unconditionally.

The cost is that **storybook cannot catch demand-gating regressions** — a module gated behind a
surface nobody renders still passes there. Only the runtime modules-at-ready budget covers that
case.
