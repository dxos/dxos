---
'@dxos/react-ui': patch
---

`@dxos/react-ui` is now built with the React Compiler (oxc backend), which auto-memoizes component bodies and hook results — 200 memo-cache allocations in `index.mjs`, plus 6 in `testing.mjs`.

This raises the performance floor in deep component trees, where hand-written `memo` does not reach and where the repo has 34 `memo()` call sites across all of `packages/plugins` + `packages/ui` combined.

The emitted bundle now imports `react/compiler-runtime`. The package's `react` peer is `catalog:` (`~19.2.x`), which ships that entry point, so there is no new requirement on consumers.

`react-ui` is the first package on the compiler because its primitives take scalars and render props and it depends on no ECHO/client code — so the compiler's one real hazard, memoizing a component that lies about a reactive read, cannot arise. Other packages are unaffected: the compiler is opt-in per package via `reactCompiler` in `defineConfig`.
