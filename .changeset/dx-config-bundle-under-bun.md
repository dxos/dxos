---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Bundle `dx.config.ts` before importing it under bun, so the compiled CLI can read a plugin's config.
