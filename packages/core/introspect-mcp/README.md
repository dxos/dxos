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
