# @dxos/introspect-mcp

MCP server that exposes [@dxos/introspect](../introspect) over stdio.
Lets LLM tools (Claude Code, etc.) query the DXOS monorepo's package and symbol graph.

This package is **phase 1**: five tools wired to package and symbol queries.
More tools will land as the core indexer grows (plugins, capabilities, schemas, idioms).

## Tools

| Tool | Purpose |
| --- | --- |
| `list_packages` | List packages, with optional `name` / `pathPrefix` / `privateOnly` filters. |
| `get_package` | Full record for one package: workspace + external deps, entry points. |
| `list_symbols` | Enumerate every exported symbol of a single package, optionally filtered by kind. |
| `find_symbol` | Locate an exported symbol by name (case-insensitive); ranks exact > prefix > substring. |
| `get_symbol` | Detail for one symbol by ref. Pass `include=["source"]` to expand the body. |

Tool descriptions are written for LLM trigger accuracy — they describe *when* to use a tool, not just what it does.

## Running it

You normally don't run this server directly — let Claude Code or the MCP Inspector spawn it for you (see sections below). For the rare case of a custom client or manual probing:

```bash
moon run introspect-mcp:serve
```

The server speaks JSON-RPC over stdio: it reads requests from stdin and writes responses to stdout, blocking until stdin closes. Configure your MCP client to spawn `npx tsx --conditions=source packages/core/introspect-mcp/src/cli.ts` from the repo root — this is exactly what `.mcp.json` does.

CLI flags:
- `--root <path>` — monorepo root (defaults to the nearest ancestor of cwd containing `pnpm-workspace.yaml`).
- `--log-path <path>` — append-only JSONL log of every tool call.

## Response shaping

- List responses cap at 30 items and include a `truncated` note when more exist.
- `get_symbol` returns signature + summary + location by default; full source/JSDoc require explicit `include`.
- Long source/JSDoc bodies are truncated with a marker — call again with a narrower question if needed.

## Use it from Claude Code

The repo ships a project-scoped [`.mcp.json`](../../../.mcp.json) at the repo root that registers `dxos-introspect`. **Claude Code spawns the server automatically** as a stdio subprocess on launch — you don't start it manually.

1. **Verify the config works** — runs the same spawn Claude Code will use, completes a real JSON-RPC `initialize` + `tools/list` + `tools/call list_packages`, and exits 0 on success:

```bash
moon run introspect-mcp:check
```

2. **Restart Claude Code** (Cmd+Q + relaunch). Type `/mcp` to confirm `dxos-introspect ✓ connected`.

3. Try it: ask Claude *"list every symbol in @dxos/echo-react"*.

## Use it from Composer (plugin-assistant)

Composer's `plugin-assistant` accepts MCP servers by URL (HTTP / SSE only — not stdio). To bridge, run the server in HTTP mode:

```bash
moon run introspect-mcp:serve-http
```

This binds to `http://localhost:39476/mcp` (Streamable HTTP transport, stateful sessions).

Then in Composer:

1. Open a chat → click the **chat options** icon → **MCP servers** tab → **Add MCP server**.
2. Fill in:
   - **Name**: `dxos-introspect`
   - **Server URL**: `http://localhost:39476/mcp`
   - **Protocol**: `http`
   - **API key**: leave empty (no auth — see below)
3. Save and toggle **enabled**. The five tools (`list_packages`, `get_package`, `list_symbols`, `find_symbol`, `get_symbol`) become available to the assistant.

**Auth:** by default the HTTP server accepts unauthenticated requests on localhost only. To require a bearer token (e.g. when running from a remote machine), pass `--api-key <token>` to `cli.ts` and put the same token in Composer's MCP server **API key** field.

```bash
pnpm exec tsx --conditions=source packages/core/introspect-mcp/src/cli.ts \
  --http 39476 --api-key sekret
```

## Test it from a browser (MCP Inspector)

Launches the official MCP Inspector UI against this server, with all paths pre-baked:

```bash
moon run introspect-mcp:inspect
```

The terminal prints a URL containing `?MCP_PROXY_AUTH_TOKEN=...`. **Open that exact URL** in your browser (the token is required; clicking through to plain `http://localhost:6274` will fail). The Inspector spawns the same `cli.ts` that Claude Code does.

In the UI: Transport must be `STDIO` (the form is pre-filled). Click **Connect** → **Tools** → **List Tools** → pick a tool → **Run Tool**.

### If "Connect" doesn't work

Most often a stale Inspector process is holding ports `6274` / `6277`, or your browser tab is pointed at an Inspector instance that's been killed (so the auth token is invalid).

Reset cleanly:

```bash
lsof -ti:6274,6277 | xargs kill -9
```
```bash
pkill -f "tsx.*introspect-mcp"
```
```bash
moon run introspect-mcp:check
```
```bash
moon run introspect-mcp:inspect
```

Open *only* the URL the new Inspector prints (with the auth token). Click Connect.

If `moon run introspect-mcp:check` fails, run `moon run introspect-mcp:sanity` for additional named-checkpoint diagnostics.

## Run the server standalone

For piping JSON-RPC by hand or wiring into a different MCP client:

```bash
moon run introspect-mcp:serve
```

Runs the server attached to your terminal stdio, blocking for input. Send JSON-RPC requests to its stdin; responses come on stdout. Useful only if you're testing with a custom client; for the normal case, let Claude Code or the Inspector spawn it.

## Other testing entry points

| Command | What it does |
| --- | --- |
| `moon run introspect-mcp:test` | Unit + integration tests (in-memory and real-stdio subprocess), ~3s |
| `moon run introspect-mcp:check` | End-to-end: spawns the server with the exact command from `.mcp.json` and round-trips a tool call. **Run before restarting Claude Code.** |
| `moon run introspect-mcp:inspect` | Launch the MCP Inspector (browser UI) against this server, with all paths absolutized. Cold cache may take ~80s; subsequent runs <1s. |
| `moon run introspect-mcp:sanity` | Inspector + proxy auth check — confirms the launcher succeeds and the proxy responds with a valid auth token. |
| `moon run introspect-mcp:serve` | Raw stdio server, for piping requests in by hand. |
| `moon run introspect-mcp:serve-http` | HTTP server on `localhost:39476/mcp`. Use this to wire the server into Composer's plugin-assistant or any other HTTP/SSE-only MCP client. |
| `moon run introspect:index` | Pre-build the on-disk symbol cache (`<root>/node_modules/.cache/dxos-introspect/`). The cache makes server startup near-instant. |

## Why `--conditions=source`?

The package.json `exports` field has a `source` condition pointing at `src/index.ts`. Without `--conditions=source`, `tsx` falls through to the `default` condition (`dist/lib/node/index.mjs`) which doesn't exist unless you've run a build. The flag lets the server boot from source with no build step — same behavior the rest of the DXOS toolchain relies on.

## Cache

The indexer stores extracted symbols at `<repo-root>/node_modules/.cache/dxos-introspect/cache.json` (~13 MB for 250 packages). Following the babel/swc/eslint convention so it's auto-gitignored and gets nuked by `pnpm clean`. Saves are atomic (write-temp-then-rename), so concurrent introspector processes can't corrupt each other.

To force a fresh re-index:

```bash
rm -rf node_modules/.cache/dxos-introspect
moon run introspect:index
```

The cache also auto-invalidates on any source-file mtime change, so manual deletion is rarely needed.
