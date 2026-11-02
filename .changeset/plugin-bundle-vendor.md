---
'@dxos/app-framework': minor
'@dxos/plugin-sheet': minor
---

`composerPlugin` builds one bundle for every runtime: flat chunks, a `manifest.json` that lists each module with its `environments`, and `vendor/`, a `workerd` build of the shared packages with an import map. The per-runtime `dx.config.ts` builds stay for consumers that resolve a plugin by its `workerd` or `node` export condition.
