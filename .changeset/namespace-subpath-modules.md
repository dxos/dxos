---
'@dxos/app-framework': minor
'@dxos/plugin-space': minor
---

The roots of `@dxos/app-framework`, `@dxos/app-graph`, `@dxos/app-toolkit`, `@dxos/assistant-toolkit`, `@dxos/async`, `@dxos/compute`, `@dxos/effect`, `@dxos/graph`, `@dxos/observability` and every plugin now export namespaces only, and every namespace has its own subpath: import it with `import * as Hooks from '@dxos/app-framework/Hooks'` and call `Hooks.useOperationInvoker()`. A component exports itself as `Root` (`<Surface.Root>`), and errors live in the namespace that owns them (`Operation.NoHandlerError`, `Capability.NotFoundError`, `ConnectorSync.DatabaseMissingError`) or in a `<Domain>Error` module (`FunctionsAiError`, `ConnectorError`).

Breaking: names that were exported flat from a root moved into namespaces, e.g. `ProcessManagerPlugin.make()`, `PluginManager.Context`, `PluginManifest.DEV_SERVER_PORT`, `Progress.makeTraceSink`, `SpaceSurface.RENAME_POPOVER`, `Calendar.getRangeSelectionId`, `AgentSkill.Handlers`, `SlashCommand.resolveSlashCommand`, `SelectionModel.SelectionModel`, `HaloServices.layer`, `PluginStorage.loadPlugins`, `CorePlugins.make()`, `KvsStore.make` (formerly `createKvsStore`) and `OtelTracer.make`/`OtelTracer.layer` in `@dxos/effect`; a plugin's `meta` is `<Name>Plugin.meta`. Flat names nothing imported outside their package are no longer exported. `@dxos/compute/Errors` is removed, and `@dxos/app-solid` no longer re-exports `@dxos/app-framework`.
