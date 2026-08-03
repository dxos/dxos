---
'@dxos/cli-util': minor
'@dxos/plugin-space': minor
---

Make CLI commands importable from a browser bundle. `@dxos/cli-util` no longer re-exports the OAuth callback server from its root entry — it moved to `@dxos/cli-util/oauth`, keeping `@effect/platform-bun` out of the default import graph — and `copyToClipboard`/`openBrowser` now resolve to a web implementation outside Node instead of shelling out via `node:child_process`. `@dxos/plugin-space` gains a `./commands` export so its command tree can be mounted without loading the plugin.
