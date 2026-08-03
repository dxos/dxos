---
'@dxos/edge-compute': patch
---

Fix the function bundler's `resolveDir` in the built `@dxos/edge-compute/native` entry. It was computed with `new URL('.', import.meta.url).pathname`, which Vite's library-mode build treats as an asset reference and base64-inlines as a `data:video/mp2t;base64,…` data URL. In `dist` that left `resolveDir` pointing at garbage, so the bundler could not resolve `@dxos/compute-runtime` / `@dxos/functions-runtime-cloudflare` and function bundling failed. The directory is now derived via `dirname(fileURLToPath(import.meta.url))`, which the bundler leaves untouched.
