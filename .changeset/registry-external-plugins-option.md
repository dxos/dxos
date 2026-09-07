---
'@dxos/plugin-registry': minor
---

`RegistryPlugin.make` takes an `externalPlugins` option (default `true`). With it off, the plugin lists only what the build bundled: no public catalog category, no load-by-URL action or dialog, no dev-server plugin loader, and no registry settings panel.

Registry categories with no members are no longer rendered. Which categories have members depends on the plugin set — a curated build ships no labs plugins, for instance — so the labs and catalog sections now disappear instead of showing an empty list.
