---
'@dxos/plugin-file': patch
---

The File skill now opts into MCP projection (`mcpPrompt: true`), which makes `file.read`, `file.createFromSource` and `file.createFromUpload` reachable from an MCP host.

An operation is served over MCP only through a skill that both opts in and names it, and this skill named all three while never opting in — so none of them were projected and `queryOperations` returned nothing for them. That broke the direct-upload flow end to end: a host could mint an upload URL and the bytes would reach storage, but no reachable verb could turn them into a `File` object in a space.
