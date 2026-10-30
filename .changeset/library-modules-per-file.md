---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Packages now ship one module per source file instead of one bundled file per entry point, so a bundler can drop the modules an app never imports: bundling `PublicKey` from `@dxos/keys` takes 18 KiB instead of 199 KiB. Every `package.json` export path is unchanged. `@dxos/util` and `@dxos/context` install the `Symbol.dispose` polyfill from their entry modules, which they declare as having side effects, so it survives tree-shaking in browsers without native support.
