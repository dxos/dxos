---
'@dxos/plugin-markdown': patch
---

Give the `node` plugin variants of the chess, kanban, map, review, table, and transcription plugins a
React-free `#capabilities` barrel, so node and bun consumers no longer pull the plugins' React
surfaces — and, through them, `@dxos/react-ui-geo`'s country geometry.
