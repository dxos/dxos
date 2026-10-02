---
'@dxos/app-framework': minor
'@dxos/plugin-space': minor
---

Every PascalCase subpath of `@dxos/app-framework`, `@dxos/app-toolkit` and the plugins is now a namespace module: import it with `import * as Hooks from '@dxos/app-framework/Hooks'` and call `Hooks.useOperationInvoker()`. A component exports itself as `Root` (`<Surface.Root>`). `@dxos/compute/Errors` is removed: each error is exported by the namespace that owns it (`Operation.NoHandlerError`, `ServiceResolver.ServiceNotAvailableError`), and the functions-AI errors by `@dxos/compute/FunctionsAiError`. `ProcessManagerPlugin` is a namespace (`ProcessManagerPlugin.make()`), and `Registry.EdgePluginProvider` is the EDGE registry provider.
