---
'@dxos/app-framework': minor
'@dxos/plugin-client': minor
---

Defer activation events dispatched while startup is running until the startup wave completes, so a module activating on one can rely on every startup capability being present. Keep the composed React context stable across renders so a capability change no longer remounts the application. Add a `client` option to the client plugin, letting a host construct and begin initializing the client before the activation pass reaches the plugin.
