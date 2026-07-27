---
'@dxos/plugin-pwa': patch
---

Poll the service worker registration hourly so a deployed update is detected while the app stays open, instead of only on reload, and report the update download as a progress monitor.
