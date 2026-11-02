---
'@dxos/app-framework': minor
'@dxos/plugin-registry': minor
'@dxos/protocols': minor
'@dxos/edge-compute': minor
---

Composer plugins run on EDGE. `@dxos/protocols` gains `PluginProtocol`, the typed contract between EDGE and a plugin's Dynamic Worker, and `@dxos/edge-compute/plugin-loader` turns one plugin bundle into the modules that worker loads; each plugin runs alone, with no other plugin's bundle beside it. `dx registry publish` checks the bundle with `@dxos/plugin-builder`'s `check-bundle` when the plugin installs it, and gains `--channel` and `--upload-only`. `@dxos/app-framework/vite-plugin/config` loads a `dx.config.ts` without pulling in Vite.
