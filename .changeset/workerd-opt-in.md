---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
---

`workerd` is now opt-in for plugin modules: no `AppCapability` maker family defaults to it, and a module with no `environments` list no longer loads under `workerd` (`Capability.runsIn`). The plugins EDGE loads name `workerd` on the modules its operations need, so their `workerd` builds stop bundling app-graph builders, editor extensions, CLI commands and other UI state. A plugin that runs a module on EDGE must now list `'workerd'` in that module's `environments`.
