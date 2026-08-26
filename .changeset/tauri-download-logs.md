---
'@dxos/util': patch
'@dxos/plugin-support': patch
---

Fix logs and file exports in the native app, where both halves failed silently: downloads went through `<a download>`, which the Tauri webview drops, and are now saved via the native save dialog, falling back to the anchor where the dialog is unreachable; feedback log uploads posted to a relative path that does not exist on the app's own origin, and now take a configurable absolute endpoint.
