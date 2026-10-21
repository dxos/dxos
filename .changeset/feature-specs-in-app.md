---
'@dxos/plugin-projects': minor
'@dxos/plugin-registry': minor
---

A feature's spec path that names a plugin's bundled spec (`packages/plugins/<plugin>/PLUGIN.mdl`) opens that spec rendered in Composer instead of linking to GitHub; other paths keep their GitHub link, and a spec imported into the space still wins. plugin-projects now bundles its own `PLUGIN.mdl`, and plugin-registry exports its graph paths as `@dxos/plugin-registry/RegistryPaths`.
