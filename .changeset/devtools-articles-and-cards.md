---
'@dxos/devtools': minor
'@dxos/plugin-debug': patch
---

Devtools panels are article containers (`*Article`, exported from `containers/panels`) and the stats panel is a stack of `StatCard` cards, each contributed as a surface on `AppSurface.DevtoolsOverview`; the `Panel` accordion and `*Panel` exports are gone, and the duplicate `logs` deck companion is removed in favour of the debug panel's Logs page.
