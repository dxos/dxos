---
'@dxos/plugin-code': patch
'@dxos/plugin-file-system': patch
---

`@dxos/plugin-file-system` now builds its `./FileSystem` export, and `@dxos/plugin-code` loads on EDGE: its workerd handler set leaves out `BuildProject` and `RunBuild`, which need the TypeScript compiler.
