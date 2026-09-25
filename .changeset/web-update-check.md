---
'@dxos/app-toolkit': minor
'@dxos/plugin-pwa': minor
'@dxos/plugin-native': patch
---

`@dxos/app-toolkit/AppUpdate` defines an update status and manager that the web and native apps
share, contributed through `AppCapabilities.UpdateManager`, and `useUpdateRow` renders it.
plugin-pwa now contributes a manager and a settings panel with a "Check for updates" row, so the web
app can check for, download and apply an update the way the desktop app can. plugin-native uses the
shared types; its `relaunch` action is now `apply`.
