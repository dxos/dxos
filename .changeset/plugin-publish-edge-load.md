---
'@dxos/echo': minor
---

`EdgeHttpClient.uploadPluginBundle` returns what the EDGE index made of the upload, including how long EDGE took to load and describe the bundle and the JavaScript and WebAssembly bytes it loads; `formatPluginBundleLoad` prints that, and `dx registry publish` and `publish-edge-release` show it after each upload.
