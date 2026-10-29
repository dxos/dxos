---
'@dxos/app-framework': minor
'@dxos/plugin-markdown': minor
---

Every plugin is now defined in its package-root `dx.config.ts` with `Plugin.config`, whose module bodies are marked `import('./x.ts', { with: { type: 'module-url' } })`; an app built with `pluginConfigPlugin` boots from each plugin's metadata and loads its module manifest when the plugin is enabled. Breaking: a plugin's `./<X>Plugin` export now carries `{ meta, make }` (call `XPlugin.make()`), the `#plugin`/`#capabilities` imports, the `dx-plugin` CLI and the generated capability barrels are removed, and module `props` mappers and inline modules are rejected by the build.
