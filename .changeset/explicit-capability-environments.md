---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
---

`environments` now lists every runtime condition a capability module loads under, `browser` included. `dx-plugin gen` slices every condition by one rule and writes `#capabilities` without a `default`, so a runtime a plugin names no condition for fails to resolve. UI maker families default to `['browser', 'tauri']`, headless families to all four conditions.
