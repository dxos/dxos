---
'@dxos/mcp-server': minor
'@dxos/plugin-space': minor
---

Project host discovery as operations: `queryPlugins` (plugin-registry, on a new Registry skill), and `queryTypes` now reports each type's version and covers the host registry as well as the space. Invoking an operation that needs no space no longer fails on a session with no spaces. **Breaking:** `invokeOperation` no longer falls back to the session's first space — a space comes only from the call's `spaceId`, an operation's own `spaceId` field, or a space-qualified reference in its arguments, and an operation that acts on a space is refused when the call names none. `McpServer.resolveSpaceId` takes a `{ required }` option accordingly.
