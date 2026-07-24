# @dxos/edge-compute

## 0.11.0

### Patch Changes

- d79482a: Fix the function bundler's `resolveDir` in the built `@dxos/edge-compute/native` entry. It was computed with `new URL('.', import.meta.url).pathname`, which Vite's library-mode build treats as an asset reference and base64-inlines as a `data:video/mp2t;base64,…` data URL. In `dist` that left `resolveDir` pointing at garbage, so the bundler could not resolve `@dxos/compute-runtime` / `@dxos/functions-runtime-cloudflare` and function bundling failed. The directory is now derived via `dirname(fileURLToPath(import.meta.url))`, which the bundler leaves untouched.
- Updated dependencies [4e64123]
- Updated dependencies [46ec569]
- Updated dependencies [eec72c5]
- Updated dependencies [1a9bca1]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [410a019]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/functions-runtime-cloudflare@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
