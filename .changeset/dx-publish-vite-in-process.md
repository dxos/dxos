---
'@dxos/plugin-registry': minor
---

`dx registry publish` now builds a plugin by running the Vite the project installs inside the `dx` process — the compiled binary included — whenever `publish.buildCommand` is unset or `vite build`, so a plain Vite project no longer needs a `buildCommand` or a separate Vite process; any other command still runs in a shell. A new `--dry-run` flag builds and checks the bundle without uploading it, and a bundle built under bun no longer imports `ws` or `undici` from workerd as `node:` builtins.
