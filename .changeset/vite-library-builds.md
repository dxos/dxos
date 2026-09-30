---
'@dxos/node-std': minor
---

Build every library package with vite; retire the `dx-compile` / `dx-build` tools.

The packages that still used the esbuild pipeline now build through the same
single-pass vite config as the rest of the workspace, so their bundles are laid
out flat (`dist/lib/<entry>.mjs`) rather than under a platform slug
(`dist/lib/{browser,node-esm,neutral}/…`). A deep import that names a build
artifact directly must be updated; subpath imports through `exports` are
unaffected, and every rewritten entry resolves under the `default` condition
rather than `import`, so a `require()` of one now resolves too.

Two output moves worth naming: `@dxos/ui-theme/plugin` ships from
`dist/plugin/ThemePlugin.{mjs,cjs}` instead of
`dist/plugin/node-{esm,cjs}/plugins/…`, and `@dxos/shell/testing` no longer
publishes a CJS `require` condition, which named a file no build emitted.

A bundled CommonJS dependency's `require()` of an external is now hoisted to a
real ESM import. Rolldown leaves those calls inside its `__commonJSMin`
wrappers, where they throw in any realm without `require` — so a browser
consumer of `@dxos/random-access-storage` or the vendored hypercore bundle
previously died on the first such call.
