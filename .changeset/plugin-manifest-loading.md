---
'@dxos/app-framework': minor
'@dxos/plugin-registry': minor
---

A plugin built with `Plugin.config` loads from its `manifest.json`: Composer, the `dx` CLI and EDGE build the plugin from the modules the manifest lists and import each module body when it activates, so no host imports the bundle's `index.mjs`. A manifest that lists modules no longer needs `index.mjs` in `assets`; a plugin built from `src/plugin.tsx` still loads through its entry.
