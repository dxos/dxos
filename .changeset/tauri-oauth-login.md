---
'@dxos/app-toolkit': minor
---

Add `NativeOAuth`, a Tauri bridge that hosts a provider's OAuth authorization page in a window the app owns and relays the post-auth callback back to the running app. `window.open` returns null in WKWebView, so OAuth sign-in could not start at all in the native desktop app.
