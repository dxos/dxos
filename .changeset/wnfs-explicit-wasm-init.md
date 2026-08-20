---
'@dxos/plugin-wnfs': patch
---

Load the wnfs wasm through the `wnfs/web` entrypoint with explicit initialization, removing top-level await from consumers' bundles (fixes plugin activation failures in WebKit).
