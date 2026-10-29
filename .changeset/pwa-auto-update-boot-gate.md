---
'@dxos/plugin-pwa': minor
---

Add an "Update automatically" setting that holds the boot loader while the app checks for a newer build, shows its download progress, and reloads onto it. The `defaultAutoUpdate` option sets its default, and `serviceWorker: false` checks a build without a service worker by comparing its entry script with the server's.
