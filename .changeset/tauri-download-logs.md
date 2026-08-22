---
'@dxos/util': patch
'@dxos/plugin-support': patch
---

Fix file downloads inside the Tauri webview, which silently dropped `<a download>` clicks — logs and other blobs are now saved through the native save dialog.
