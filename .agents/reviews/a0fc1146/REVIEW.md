---
branch: dm/nifty-planck-5j3mfk
commit: a0fc1146a862adbef1d553748d39afd18a798873
base: f3c02b30ea43d85615186056e033adb200e25259
mode: pr-only
createdAt: 2026-09-29T13:51:16.448Z
isFinalized: true
groups: 63
rules: [diff-scoped-to-pr-purpose, dont-leak-internal-api-through-public-surface, name-for-general-behavior, reuse-existing-mechanism]
reviewId: a0fc1146
---

_0 error(s), 4 warning(s)._

# WARN a0fc1146-1 diff-scoped-to-pr-purpose `packages/apps/composer-app/vite.config.ts:198:1`

The new `PLUGIN_SHARED_PACKAGES` constant and `pluginToolchain` helper were inserted between the existing `/** https://vitejs.dev/config */` JSDoc and `export default defineConfig(...)`, detaching that comment from the config it documents and leaving it attached to the new constant. Move the new block above the `/** https://vitejs.dev/config */` comment so it stays directly above `defineConfig` (diff-scoped-to-pr-purpose).

# WARN a0fc1146-2 reuse-existing-mechanism `packages/plugins/plugin-computer/src/templates/composer-plugin.ts:24`

`GUIDE` (the publishing-plugins guide path) is redefined here although this change moved the template machinery into `plugin-projects/src/templates/composer-plugin.ts`, which already declares the identical constant. Export `GUIDE` from plugin-projects' `templates` barrel and import it here so the path has one definition (rule `reuse-existing-mechanism`).

# WARN a0fc1146-3 name-for-general-behavior `packages/plugins/plugin-projects/src/templates/composer-plugin.ts:22`

`SANDBOX_NAME` reads as a general sandbox-name constant, but its value is the World Clock plugin run's sandbox. Per `name-for-general-behavior`, name it for what it is (for example `WORLD_CLOCK_SANDBOX_NAME`), or inline it, since nothing outside this module uses it.

# WARN a0fc1146-4 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-projects/src/templates/index.ts:11`

`export * from './composer-plugin.ts'` publishes every export of that module through the `@dxos/plugin-projects/templates` entry point, but only `IDS`, `PARENT_INSTRUCTIONS`, `Variant`, `makeComposerPlugin`, `readGuide` and `writePlugin` have an outside caller (plugin-computer). `SANDBOX_NAME`, `PluginToolchain`, `packageJson`, `desktopVariant` and `TaskSeed` are used only inside plugin-projects, so they leak internals. Replace the star with a named re-export of just the symbols plugin-computer needs (and un-export the rest).
