---
'@dxos/plugin-space': patch
'@dxos/app-toolkit': patch
'@dxos/plugin-graph': patch
---

Add `space.resolveUrl` to the database skill, so an MCP agent can turn a pasted Composer URL into
`echo://` refs for the objects it names and read them with `getObjects`, no `spaceId` needed.
`UrlPath.readReferences` parses a pathname without the app graph, and `UrlPath.TAIL_SEPARATOR` is
now the separator the graph builder is configured with.
