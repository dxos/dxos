---
'@dxos/app-toolkit': minor
'@dxos/plugin-native': minor
---

`@dxos/app-toolkit/AppUpdate` defines an update status and manager that the web and native apps
share, contributed through `AppCapabilities.UpdateManager`, and `useUpdateRow` renders it.
plugin-pwa now contributes a manager and a settings panel with a "Check for updates" row, so the web
app can check for, download and apply an update the way the desktop app can.

**Breaking:** plugin-native's update manager renames `relaunch` to `apply`, and its `downloading`
status carries `progress: { completed, total, unit }` in place of `downloaded` / `contentLength`.
