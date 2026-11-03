---
'@dxos/app-framework': minor
---

An app built with `pluginConfigPlugin` now ships each plugin's manifest as a JSON file, `plugins/<key>/manifest.json`, instead of a `dx.config-<hash>.js` chunk; the dev server serves the same JSON from `/@dx-plugins/<key>/manifest.json`. `Plugin.fetchManifest` and `Plugin.fromManifestUrl` load a plugin from such a file, and `ManifestSchema` describes it. Library builds keep their JS entry.
