---
'@dxos/app-framework': minor
'@dxos/plugin-registry': minor
---

A plugin builds one bundle for every runtime: `composerPlugin` emits flat chunks, lists every module with its `environments` in `manifest.json`, and writes `vendor/`, a `workerd` build of each shared package with an import map, so EDGE can load the same bundle the browser does. `dx registry publish` loads the built bundle in a local workerd and runs its `describe()` before uploading, and fails the publish when a module does not activate there. Breaking: a plugin package's `dx.config.ts` export no longer carries `workerd`, `node`, `tauri` or `browser` builds.
