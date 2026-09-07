---
'@dxos/plugin-registry': minor
---

Add a `registry.disablePlugins` operation (dependents cascade, core plugins rejected) and a read-only `debug.snapshot` operation returning a JSON summary of the live UI state — layout, attention, open planks with their subjects and reachable actions, mounted surfaces, and plugin counts — for agent-driven introspection.
