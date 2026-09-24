---
'@dxos/echo': patch
---

`JsonSchema.toJsonSchema` emits a named schema reached through several properties as one `$defs` entry instead of one copy per occurrence (`node`, `node_1`, ...), which shrinks generated operation and tool schemas.
