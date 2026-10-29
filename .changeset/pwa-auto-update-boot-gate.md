---
'@dxos/app-toolkit': minor
'@dxos/plugin-pwa': minor
---

Add an "Update automatically" setting to the PWA and native plugins. While the app starts, it holds the boot loader, checks for a newer build, shows its download progress, and then reloads or relaunches onto it. The `defaultAutoUpdate` option sets the setting's default. `AppUpdate.makeBootGate` is the shared driver. In the PWA plugin, `serviceWorker: false` checks a build that has no service worker by comparing its entry script with the server's.
