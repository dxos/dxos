---
'@dxos/app-framework': minor
'@dxos/plugin-client': minor
---

Add `@dxos/app-framework/worker`, a dedicated worker whose content is plugins loaded by URL (`runtime.client.workerPlugins`): it provides a hook bus, an RPC router shared by every tab, and a layer stack built from the `LayerSpec`s its plugins contribute. `@dxos/plugin-client/worker` is the plugin that hosts the client services in it.
