---
'@dxos/protocols': minor
---

`PluginProtocol.Catalog` gains an optional `hooks` list of `HookRecord`s: the end-request hooks a plugin bundle's plugin contributes, each naming one of the catalog's operations. EDGE reads hooks only from catalogs, so a plugin's hooks keep firing after it is served from its bundle. A catalog without `hooks` has none.
