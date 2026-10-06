---
'@dxos/agent-runtime': patch
'@dxos/plugin-code': patch
---

`@dxos/plugin-code/AcpAgent` and `@dxos/plugin-code/ComposerMcp` export the ACP turn engine and Composer's MCP surface, so a host other than the desktop app can run Claude Code with Composer's tools. Operations run under `AssistantTestLayer` can now use `Hypergraph.Service`, as they can in the app.
