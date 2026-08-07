---
'@dxos/app-framework': patch
---

Bundler-plugin entrypoints no longer publish a `source` export condition: `@dxos/app-framework/vite-plugin` and `@dxos/ui-theme/plugin`. These run in Node inside a `vite.config.ts` and reach `node:*`, so a `source` condition let an app's `source`-first resolver pull their Node-only sources into a browser bundle.

Default resolution is unchanged — both entrypoints already resolved to their built `dist` for ordinary consumers, with the same exports and runtime behaviour. Only resolution under `--conditions=source` changes: it now yields the built output, matching `@dxos/config`'s bundler-plugin entrypoints.
