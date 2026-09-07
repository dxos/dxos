---
'@dxos/node-std': minor
---

Build every library package with vite; retire the `dx-compile` / `dx-build` tools.

The packages that still used the esbuild pipeline now build through the same
single-pass vite config as the rest of the workspace, so their bundles are laid
out flat (`dist/lib/<entry>.mjs`) rather than under a platform slug
(`dist/lib/{browser,node-esm,neutral}/…`). Their `exports` maps are updated to
match, and a deep import that names a build artifact directly must be updated;
subpath imports through `exports` are unaffected.

Also removed: `@dxos/ui-theme/plugin`'s output moves from
`dist/plugin/node-{esm,cjs}/plugins/ThemePlugin.{mjs,cjs}` to
`dist/plugin/ThemePlugin.{mjs,cjs}`, and `@dxos/shell/testing` no longer
publishes a CJS `require` condition (it named a file no build emitted).
