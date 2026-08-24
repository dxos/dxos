---
'@dxos/util': patch
'@dxos/plugin-support': patch
---

Fix logs in the native app, where both halves failed silently: downloads went through `<a download>`, which the Tauri webview drops, and are now saved via the native save dialog; feedback log uploads posted to a relative path that does not exist on the app's own origin, and can now be pointed at an absolute endpoint.
