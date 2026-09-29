---
'@dxos/app-framework': patch
---

`composerPlugin` loads `dx.config.ts` with bun when the build runs under bun, including a `bun build --compile`
executable, so a plugin builds on a machine without node.
