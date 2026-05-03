# @dxos/introspect-mcp

MCP server that exposes [@dxos/introspect](../introspect) over stdio. 
Lets LLM tools (Claude Code, etc.) query the DXOS monorepo's package and symbol graph.

This package is **phase 1**: four tools wired to package and symbol queries. 
More tools will land as the core indexer grows (plugins, capabilities, schemas, idioms).

## Tools

| Tool | Purpose |
| --- | --- |
| `list_packages` | List packages, with optional `name` / `pathPrefix` / `privateOnly` filters. |
| `get_package` | Full record for one package: workspace + external deps, entry points. |
| `find_symbol` | Locate an exported symbol by name (case-insensitive); ranks exact > prefix > substring. |
| `get_symbol` | Detail for one symbol by ref. Pass `include=["source"]` to expand the body. |

Tool descriptions are written for LLM trigger accuracy — they describe *when* to use a tool, not just what it does.

## Running it

```bash
pnpm -F @dxos/introspect-mcp start
# or, if installed globally
dx-introspect-mcp [--root <path>] [--log-path <path>]
```

The server speaks JSON-RPC over stdio (default MCP transport). 
Configure your Claude Code (or other MCP client) to launch this command.

`--root` defaults to the nearest ancestor of `cwd` that contains `pnpm-workspace.yaml`. 
`--log-path` enables JSONL logging of every tool call to drive future tool design.

## Response shaping

- List responses cap at 30 items and include a `truncated` note when more exist.
- `get_symbol` returns signature + summary + location by default; full source/JSDoc require explicit `include`.
- Long source/JSDoc bodies are truncated with a marker — call again with a narrower question if needed.

## Testing

Three ways, in order of how close they are to "real":

### 1. Automated tests

```bash
moon run introspect-mcp:test
```

Boots the server with an in-memory transport, connects an MCP client, and round-trips every tool. 
See [`src/server.test.ts`](src/server.test.ts) — 10 tests, ~1s.

### 2. Interactive probe with MCP Inspector

The MCP SDK ships an interactive UI for talking to a stdio server. From the monorepo root:

```bash
npx @modelcontextprotocol/inspector \
  npx tsx packages/core/introspect-mcp/src/cli.ts --root "$PWD"
```

> ⚠️ **Don't launch via `pnpm start`.** pnpm's script-runner writes a header line (`> @dxos/introspect-mcp@x.y.z start`) to stdout, which corrupts the JSON-RPC stream and produces "Connection Error – Check if your MCP server is running and proxy token is correct." in the Inspector. 
  Invoke `tsx` (or the built binary) directly so the server owns stdout.

> 🔑 **Open the URL the Inspector prints**, not `http://localhost:6274` directly. 
  The printed URL contains a `?MCP_PROXY_AUTH_TOKEN=...` query string — without it the proxy rejects the WebSocket connection with the same "proxy token" error.

Once the URL is open, click **Tools**, and you can call `list_packages` / `get_package` / `find_symbol` / `get_symbol` against the live monorepo with form inputs and see raw responses.

### 3. Wire it into Claude Code

Add to `.mcp.json` (project-scoped) or `~/.claude.json` (user-scoped):

```jsonc
{
  "mcpServers": {
    "dxos-introspect": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/dxos/packages/core/introspect-mcp/src/cli.ts",
        "--root", "/absolute/path/to/dxos"
      ]
    }
  }
}
```

(Don't use `pnpm start` here either — same stdout-pollution issue as the Inspector.)

In a fresh Claude Code session, `/mcp` shows the server connected with four tools (`mcp__dxos-introspect__list_packages` etc.). 
Ask something like *"which plugin owns the Markdown editor?"* and watch it call `find_symbol` followed by `get_symbol`.

### Quick sanity check

Verify the binary speaks JSON-RPC at all:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | npx tsx packages/core/introspect-mcp/src/cli.ts --root "$PWD"
```

Should print two JSON-RPC responses — the second listing the four tools.

For development, option 2 is fastest — the Inspector gives you a clickable UI without restarting Claude Code. 
Once it works there it works everywhere.
