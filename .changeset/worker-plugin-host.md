---
'@dxos/app-framework': minor
'@dxos/plugin-client': minor
---

Add `@dxos/app-framework/PluginWorker`, a dedicated worker whose content is plugin modules the tab sends (`runtime.client.workerModules`): it provides a hook bus, an RPC router shared by every tab, and a layer stack built from the `LayerSpec`s those modules contribute. `Capability.workerModule` declares such a module in a plugin's `dx.config.ts`, in the `plugin-worker` environment, so the page's manifest never lists it; the plugin's lazy stub carries its entry as data (`Plugin.getWorkerModules`, `Plugin.getStartupWorkerModules`). `pluginConfigPlugin({ workerHost })` builds those modules into the worker's own build. `Hooks.readEnabled` reads the plugins an app starts with before it renders. `ClientPlugin` gains a worker module, `WorkerServices`, which hosts the client services there, and accepts its host client as a getter.
