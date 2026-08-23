---
'@dxos/app-toolkit': minor
'@dxos/edge-client': patch
---

Run OAuth in the system browser on desktop, via a loopback callback server, so sign-in and integration flows work in the native app. Adds `NativeOAuth` to app-toolkit and a public `getAuthHeader()` to the EDGE HTTP clients.
