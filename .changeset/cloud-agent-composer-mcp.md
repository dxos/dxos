---
'@dxos/plugin-code': patch
---

Claude Code (cloud) can now read and write the user's spaces through the Composer MCP server. Each turn lends EDGE a short-lived API token for the signed-in identity as `COMPOSER_MCP_TOKEN`, and EDGE connects the agent's session to its environment's Composer MCP server with it.
