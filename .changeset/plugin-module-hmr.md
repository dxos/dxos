---
'@dxos/app-framework': minor
---

Plugin modules are now hot-replaceable in the Vite dev server. Add `hotModulesPlugin()` from `@dxos/app-framework/vite-plugin`. Editing a module body (the file a `Capability.lazyModule` loader imports), or a file only it imports, re-runs that module in the running app instead of reloading the page. Active modules that require a singleton capability it provides re-run too. The new `PluginManager.reload(moduleIds)` does the re-run and is usable on its own.
