---
'@dxos/app-framework': minor
'@dxos/plugin-sheet': minor
---

`composerPlugin` builds one bundle for every runtime: flat chunks, a `manifest.json` that lists each module with its `environments`, and `vendor/`, a `workerd` build of the shared packages with an import map. Breaking: a plugin package's `dx.config.ts` export no longer carries `workerd`, `node`, `tauri` or `browser` builds.
