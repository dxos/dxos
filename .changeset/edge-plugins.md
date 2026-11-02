---
'@dxos/app-framework': minor
'@dxos/plugin-registry': minor
---

Composer plugins build once and run on EDGE. `composerPlugin` emits one bundle for every runtime — flat chunks, a `manifest.json` that lists every module with its `environments`, and `vendor/`, a `workerd` build of the shared packages with an import map — and Composer, the `dx` CLI and EDGE all build a plugin from that manifest, importing each module body when it activates rather than through `index.mjs`. `dx registry publish` runs the bundle's `describe()` on a local workerd before uploading and fails when a module does not activate. `@dxos/protocols` gains `PluginProtocol`, the typed contract between EDGE and a plugin's Dynamic Worker, and `@dxos/edge-compute/plugin-loader` turns a bundle and its dependencies into the modules that worker loads. Breaking: a plugin package's `dx.config.ts` export no longer carries `workerd`, `node`, `tauri` or `browser` builds.
