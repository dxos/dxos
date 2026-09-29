---
'@dxos/plugin-assistant': patch
'@dxos/plugin-debug': minor
---

The assistant can offer to load a plugin by URL. Once it has built and served a plugin, it emits a `plugin-url-prompt` showing the manifest URL, and the plugin loads and enables when the user clicks **Load plugin** (the new `RegistryOperation.LoadPlugin` in `@dxos/plugin-registry`, which the Load Plugin dialog now uses too). The agent never gets a tool that loads code itself.

A new sample space, Composer Plugin, sets this up as a project: four tasks that take a chat from an empty folder to a TypeScript plugin with its own sidebar page, built with `tsc` and `vite build` on the machine serving Composer and offered back through that prompt. The project binds the Computer skill, so it runs against a local Composer served by `vite preview`.

Also fixed:

- Choosing a chat from the companion's Chat History now shows that chat.
- `composerPlugin` (`@dxos/app-framework/vite-plugin`) reads `dx.config.ts` from the Vite root, so `vite build <dir>` emits `manifest.json`.
- The Load Plugin dialog shows why an import failed, e.g. `Invalid DXN` for a hyphenated plugin key.
