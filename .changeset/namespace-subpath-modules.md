---
'@dxos/app-framework': minor
'@dxos/app-solid': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
---

Every PascalCase subpath of `@dxos/app-framework`, `@dxos/app-toolkit` and the plugins is now a namespace module: import it with `import * as Hooks from '@dxos/app-framework/Hooks'` and call `Hooks.useOperationInvoker()`. A component exports itself as `Root` (`<Surface.Root>`). `@dxos/compute/Errors` is removed: each error is exported by the namespace that owns it (`Operation.NoHandlerError`, `ServiceResolver.ServiceNotAvailableError`), and the functions-AI errors by `@dxos/compute/FunctionsAiError`. `ProcessManagerPlugin` is a namespace (`ProcessManagerPlugin.make()`), and `Registry.EdgePluginProvider` is the EDGE registry provider.

The roots of `@dxos/app-framework` and `@dxos/app-toolkit` re-export every subpath, React components included, so import from the subpaths instead. Names that were only on the roots moved into namespaces:

- `CapabilityNotFoundError` → `Capability.NotFoundError`; the activation errors (`DependencyCycleError`, `MissingProviderError`, ...) → `PluginManager.*`; `EmptyHistoryError` and `HistoryEntry` → `HistoryTracker.*`.
- `PluginManagerContext` → `PluginManager.Context`; `PLUGIN_DEV_SERVER_PORT` → `PluginManifest.DEV_SERVER_PORT`; `processStorageLayer` → `ProcessManagerPlugin.storageLayer`.
- `Label` → `@dxos/app-framework/Translations`; `setupDevtools` and the devtools types → `@dxos/app-framework/Devtools` (`Devtools.setup`).
- `SyncDatabaseMissingError` → `ConnectorSync.DatabaseMissingError`.
- The progress helpers → `@dxos/app-toolkit/Progress`: `Progress.STATUS_COMPLETE`, `Progress.makeTraceSink`, `Progress.makeRegistry`, ...
- `RENAME_POPOVER` → `SpaceSurface.RENAME_POPOVER`.

`@dxos/app-solid` no longer re-exports `@dxos/app-framework`.
