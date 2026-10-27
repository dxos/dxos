---
'@dxos/app-framework': minor
'@dxos/plugin-client': minor
---

Add `@dxos/app-framework/PluginWorker`, a dedicated worker whose content is plugins loaded by URL (`runtime.client.workerPlugins`): it provides a hook bus, an RPC router shared by every tab, and a layer stack built from the `LayerSpec`s its plugins contribute. Its plugin modules activate on `WorkerEvents.Startup` and reach the worker through `WorkerCapabilities.Host`. `Capability.workerModule` declares such a module under the `plugin-worker` condition, which `dx-plugin gen` leaves out of every other capabilities slice, so the page never contains it. `ClientPlugin` gains one, `WorkerServices`, which hosts the client services there.
