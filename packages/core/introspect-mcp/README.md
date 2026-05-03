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

## Use it from Claude Code

The repo ships a project-scoped [`.mcp.json`](../../../.mcp.json) at the repo root that registers `dxos-introspect`. Claude Code picks it up automatically when launched anywhere under the repo.

1. **Verify the config works** — runs the same spawn Claude Code will use, completes a real JSON-RPC `initialize` + `tools/list` + `tools/call list_packages`, and exits 0 on success:

   ```bash
   moon run introspect-mcp:check
   ```

2. **Restart Claude Code** (Cmd+Q + relaunch). Type `/mcp` to confirm `dxos-introspect ✓ connected`.

3. Try it: ask Claude *"list every symbol in @dxos/echo-react"*.

## Other testing entry points

| Command | What it does |
| --- | --- |
| `moon run introspect-mcp:test` | Unit + integration tests (in-memory and real-stdio subprocess), ~3s |
| `moon run introspect-mcp:check` | End-to-end: spawns the server with the exact command from your `~/.claude/settings.json` and round-trips a tool call. **Run before restarting Claude Code.** |
| `moon run introspect-mcp:inspect` | Launch the MCP Inspector (browser UI) against this server, with all paths absolutized. Cold cache may take ~80s; subsequent runs <1s. |
| `moon run introspect-mcp:sanity` | Inspector + proxy auth check — confirms the launcher succeeds and the proxy responds with a valid auth token. |
| `moon run introspect-mcp:serve` | Raw stdio server, for piping requests in by hand. |
| `moon run introspect:index` | Pre-build the on-disk symbol cache. The cache makes server startup near-instant. |

## Why `--conditions=source`?

The package.json `exports` field has a `source` condition pointing at `src/index.ts`. Without `--conditions=source`, `tsx` falls through to the `default` condition (`dist/lib/node/index.mjs`) which doesn't exist unless you've run a build. The flag lets the server boot from source with no build step — same behavior the rest of the DXOS toolchain relies on.
