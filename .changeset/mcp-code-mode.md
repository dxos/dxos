---
'@dxos/echo': minor
---

The MCP server can serve a `runScript` tool: an agent writes one Effect program (the body of an
`Effect.gen`) that calls `invoke`, `queryOperations` and `loadSkill` — through the same skill gate
and space rules as the tools, failing with the same typed `ToolFailure` — instead of one
`invokeOperation` round trip per object. The script presents the skill tokens it was given
(`skillTokens`) and those its own `loadSkill` returns. A host opts in with the `script` option of
`McpServer.layer`/`toolsLayer`, choosing an in-process sandbox or a Worker Loader isolate
(`isolateScriptSandbox`); `dx mcp serve --code-mode` turns it on locally.
