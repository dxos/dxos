---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Import `dx.config.ts` directly instead of transpiling it, so `dx registry publish` can read a plugin config from the compiled CLI.
