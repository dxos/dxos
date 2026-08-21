---
'@dxos/mcp-server': minor
'@dxos/plugin-space': minor
---

Project host discovery and space listing as operations: `queryPlugins` (plugin-registry, on a new Registry skill), `querySpaces` (plugin-space, on a new Space skill), and `queryTypes` now reports each type's version and covers the host registry as well as the space. Invoking an operation that needs no space no longer fails on a session with no spaces.
