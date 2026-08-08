---
'@dxos/app-framework': patch
---

`useOptionalCapabilities` and `useOptionalCapability` now return no capabilities outside a `PluginManagerProvider` instead of throwing, so a component that reads an optional capability can still be rendered standalone.
