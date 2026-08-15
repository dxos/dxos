---
'@dxos/app-framework': minor
---

`Plugin.addModule` now accepts and skips `undefined`, so headless capability barrels can stub excluded modules and a single canonical plugin entry can serve browser, node, and workerd environments.
