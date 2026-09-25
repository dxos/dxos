---
'@dxos/echo': minor
---

Expose plugin and operation introspection on `globalThis.composer`: `plugins()` lists registered plugins with core/enabled/active state, `operations(pluginId?)` enumerates operations without loading their handlers, and `invoke(key, input)` runs one. Also types the `composer` namespace, replacing the untyped global.
