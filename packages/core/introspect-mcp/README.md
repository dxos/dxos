# @dxos/introspect-mcp

MCP server that exposes [@dxos/introspect](../introspect) over stdio. Lets LLM tools (Claude Code, etc.) query the DXOS monorepo's package and symbol graph.

This package is **phase 1**: four tools wired to package and symbol queries. More tools will land as the core indexer grows (plugins, capabilities, schemas, idioms).

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

The server speaks JSON-RPC over stdio (default MCP transport). Configure your Claude Code (or other MCP client) to launch this command.

`--root` defaults to the nearest ancestor of `cwd` that contains `pnpm-workspace.yaml`. `--log-path` enables JSONL logging of every tool call to drive future tool design.

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

Boots the server with an in-memory transport, connects an MCP client, and round-trips every tool. See [`src/server.test.ts`](src/server.test.ts) — 10 tests, ~1s.

### 2. Interactive probe with MCP Inspector

The MCP SDK ships an interactive UI for talking to a stdio server. From the monorepo root:

```bash
npx @modelcontextprotocol/inspector \
  pnpm -F @dxos/introspect-mcp start -- --root "$PWD"
```

Open the URL it prints, click into **Tools**, and you can call `list_packages` / `get_package` / `find_symbol` / `get_symbol` against the live monorepo with form inputs and see raw responses.

### 3. Wire it into Claude Code

Add to `.mcp.json` (project-scoped) or `~/.claude.json` (user-scoped):

```jsonc
{
  "mcpServers": {
    "dxos-introspect": {
      "command": "pnpm",
      "args": [
        "-F", "@dxos/introspect-mcp", "start",
        "--", "--root", "/absolute/path/to/dxos"
      ]
    }
  }
}
```

In a fresh Claude Code session, `/mcp` shows the server connected with four tools (`mcp__dxos-introspect__list_packages` etc.). Ask something like *"which plugin owns the Markdown editor?"* and watch it call `find_symbol` followed by `get_symbol`.

### Quick sanity check

Verify the binary speaks JSON-RPC at all:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | pnpm -F @dxos/introspect-mcp start --root "$PWD"
```

Should print a response listing the four tools.

For development, option 2 is fastest — the Inspector gives you a clickable UI without restarting Claude Code. Once it works there it works everywhere.
