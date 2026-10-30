---
'@dxos/echo': patch
---

Packages now ship one module per source file instead of one bundled file per entry point, so a bundler can drop the modules an app never imports: bundling `PublicKey` from `@dxos/keys` takes 18 KiB instead of 199 KiB, and EDGE's operation-service bundle shrinks from 25.4 MiB to 23.2 MiB. Every `package.json` export path is unchanged.
