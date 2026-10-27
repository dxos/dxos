---
'@dxos/app-framework': minor
---

Plugins are now hot-replaceable in the Vite dev server: add `hotModulesPlugin()` from `@dxos/app-framework/vite-plugin`. Editing a capability module (the file a `Capability.lazyModule` loader imports), or a file only it imports, re-runs that module in the running app instead of reloading the page; active modules that require a singleton capability it provides re-run too. Editing a plugin's definition (the file `Plugin.lazy` loads), or its module specs, re-creates that plugin in place. `PluginManager.reload(moduleIds)` and `PluginManager.reloadPlugin(id)` do the work and are usable on their own.
