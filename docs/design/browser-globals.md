# Browser globals

Audit of everything DXOS attaches to `globalThis` in a browser page, what owns each entry, and
which of them are a supported surface rather than an implementation detail.

Measured against a `composer-app` dev build with 89 plugins registered, by enumerating
`Object.getOwnPropertyNames(globalThis)` in the live page — not by grepping for assignments, so
entries added at runtime by whichever plugins happened to activate are included.

## Two namespaces, split by layer

The split is the thing to keep straight: **`dxos` is the client and ECHO; `composer` is the app
and its plugins.** They are populated by different packages at different times and neither can
see the other's types.

### `__DXOS__` (aliased as `dxos`)

Set by `mountDevtoolsHooks` (`@dxos/client`, `src/devtools/devtools.ts`). `__DXOS__` is the plain
object; `dxos` is a `defineProperty` getter that logs a one-time warning that it is undocumented
and may change without notice. Typed as `DevtoolsHook`.

| Group       | Members                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| Client      | `client`, `host`, `halo`, `spaces`, `feeds`, `get`                                      |
| Diagnostics | `tracing`, `listDiagnostics`, `fetchDiagnostics`, `downloadDiagnostics`                 |
| Profile     | `exportProfile`, `importProfile`, `reset`                                               |
| Tooling     | `debugPort`, `openClientRpcServer`, `openDevtoolsApp`, `importModule`, `joinTables`     |
| Builders    | `DXN`, `Type`, `Obj`, `Relation`, `Ref`, `Query`, `Filter`, `Schema`, `Feed`, `getMeta` |

`spaces` and `feeds` are accessors: a bare call returns everything, a `PublicKey` or a string
(id, key prefix, or space name) returns one. On `/recovery.html` the page additionally attaches
`dxos.recovery` (`RecoveryHelpers`) — see the `composer-forensics` skill.

`importModule` resolves only modules registered through `exposeModule` (currently
`@automerge/automerge`); other specifiers throw.

### `composer`

The app-layer namespace. Unlike `__DXOS__` it has **no single owner** — five sites `??=` their
own members onto it as they activate:

| Member                                       | Set by                                |
| -------------------------------------------- | ------------------------------------- |
| `profiler`, `otel`                           | `composer-app/src/main.tsx`           |
| `manager`, `plugins`, `operations`, `invoke` | `@dxos/app-framework` `setupDevtools` |
| `graph`                                      | `plugin-graph`                        |
| `attention`                                  | `plugin-attention`                    |
| `editorView`                                 | `plugin-markdown`                     |
| `changeStorageVersionInMetadata`             | `plugin-devtools`                     |

Because membership follows which plugins activated, `Object.keys(composer)` is authoritative at
any moment and a hard-coded list is not. The introspection API:

```js
composer.plugins()              // id, name, description, core, enabled, active, moduleIds
composer.operations(pluginId?)  // key, name, description, pluginId, moduleId
composer.invoke(key, input)     // accepts the DXN-form key or the bare NSID
composer.manager                // PluginManager: getPlugins/getEnabled/getActive/getModules
```

`operations()` enumerates via each handler set's `definitions()`, which resolves keys **without**
importing any lazily-loaded handler module — `getHandlers()` would import all of them as a side
effect of asking what exists. Plugin attribution comes from the contributing module id, not the
operation key, because the two disagree: `dxn:org.dxos.operation.layout.select` is
contributed by `plugin-attention`.

## Everything else

| Global                                            | Owner                                | Purpose                                                                     |
| ------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `__DX__`                                          | `@dxos/app-framework` `SurfaceDebug` | `{ surfaces(component?) }` — mounted `<dx-surface>` nodes. Dev builds only. |
| `DX_LOG`                                          | `@dxos/log`                          | The `log` singleton, shared across duplicated copies of the package.        |
| `DX_LOG_FILES`                                    | `@dxos/log`                          | File registry the log transform registers call sites into.                  |
| `downloadLogs`                                    | `composer-app/src/main.tsx`          | Saves the buffered log, same as the Reset dialog.                           |
| `__DXOS_CONFIG__`                                 | `@dxos/config` vite plugin           | Build-time config (`publicUrl`, `dynamic`).                                 |
| `__DXOS_VITE_PLUGIN_LOG_FILTER__` / `…_RUNTIME__` | `vite-plugin-log`                    | Active filter and runtime hooks.                                            |
| `__DX_DEV_SERVER_BOOT_ID__`                       | dev server                           | Identifies a dev-server boot across reloads.                                |
| `scheduler`                                       | polyfill                             | `Scheduler` where the platform lacks it.                                    |

Conditional — declared in source but **absent from the measured page**, so probe rather than
assume:

| Global                                                           | Owner                       | Present when                                                                           |
| ---------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `__bootLoader`, `__bootLoaderSnapshot`, `__BOOT_LOADER_CONFIG__` | `app-framework` boot loader | Only until React replaces `#root`; gone once the app has mounted.                      |
| `__longTasks`                                                    | startup e2e spec            | Only when that spec installs its observer.                                             |
| `__ERROR_BOUNDARY_ERRORS__`                                      | error boundary              | Only after a boundary has caught something.                                            |
| `__SUBDUCTION_DEBUG`                                             | `echo-host`                 | Never assigned by DXOS — it is _read_ to opt into verbose WASM logging, so you set it. |

Non-DXOS entries also present in a dev page (React Refresh `__$RefreshReg$`, tslib `__spread*`,
`__tabsterInstance`, `__zod_globalRegistry`) are third-party and out of scope.

## Typing

`__DXOS__` is typed by `DevtoolsHook`. `composer` is typed by `ComposerDevtools` in
`@dxos/app-framework/src/devtools.ts` via `declare global`; every member is optional, because the
namespace fills in as the app boots, so the declaration buys type-checking at call sites and not
a presence guarantee.

Four `(globalThis as any)` casts remain, in the plugins that attach `graph`, `attention`,
`editorView` and `changeStorageVersionInMetadata`. They predate the declaration and can now drop
the cast.

## Stability

None of this is public API. `dxos` says so out loud, and both namespaces exist for debugging,
instrumentation and end-to-end tests. Two consequences worth respecting:

1. **Do not build product behaviour on them.** A plugin that needs the graph should take it as a
   capability, not read `composer.graph`.
2. **Do not assume presence.** `composer` is absent on `/recovery.html` and until React mounts;
   `__DXOS__` is absent until the client mounts its hooks; `__DX__` is dev-only. Probe first.

## Related

- `.agents/skills/composer-debug/SKILL.md` — driving these from an agent via the debug port.
- `.agents/skills/composer-forensics/SKILL.md` — the safe-mode (`/recovery.html`) surface.
- `agents/superpowers/specs/2026-08-08-agent-debug-channel-design.md` — why the debug port exists.
