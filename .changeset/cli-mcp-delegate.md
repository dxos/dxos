---
'@dxos/cli': minor
'@dxos/mcp-server': patch
---

`dx mcp delegate` takes over an MCP session an agent already holds: it prints a PKCE challenge for the server's `delegateToCli` tool and, with `--code`, stores a session with the same identity and spaces. `dx mcp tools` and `dx mcp call` also accept a `DX_API_TOKEN` (and `DX_MCP_URL`) in place of a stored session, so an agent can run queries and scripts from its shell and pipe the results to files.

The MCP server instructions tell a model to install `dx` and use it for bulk data.
