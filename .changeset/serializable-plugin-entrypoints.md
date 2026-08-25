---
'@dxos/protocols': minor
'@dxos/app-framework': minor
'@dxos/plugin-markdown': patch
---

Plugin entrypoints can be declared as data. A plugin publishes a `dxplugin.jsonc` next to its
`package.json` carrying its metadata plus its module list — activation events, capability
requires/provides, and a relative URL per module file — and a host builds it with
`Plugin.fromManifest(await import('@dxos/plugin-x/dxplugin.jsonc'))`. The `dxPluginManifest()` vite
plugin resolves the descriptor, serving module sources from the dev server in development and
emitting each as a build entrypoint (rewritten to the built asset) in production.
