---
'@dxos/app-framework': patch
---

The boot-loader Vite plugin no longer fails every `index.html` request for the rest of a dev-server session after one esbuild spawn error (such as `spawn EBADF`); it retries on the next request, and compiles the loader when the server starts.
