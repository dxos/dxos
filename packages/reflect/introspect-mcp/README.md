# @dxos/introspect-mcp

MCP server that exposes [@dxos/introspect](../introspect) over stdio.
Lets LLM tools (Claude Code, etc.) query the DXOS monorepo's package, symbol, and plugin graph.

Coverage so far:
- **Phase 1** — packages and symbols.
- **Phase 2** — plugins, surfaces, capabilities, operations (extracted statically from `Plugin.define` / `Surface.create` / `Capability.contributes` / `Operation.make`).
- **Phase 3** — ECHO-registered schemas (`Type.makeObject` / `Type.Obj`).

Idioms, composition queries, and UI components are next (see [SPEC.md](../introspect/SPEC.md#build-order)).

## Tools

### Packages & symbols

| Tool | Purpose |
| --- | --- |
| `list_packages` | List packages, with optional `name` / `pathPrefix` / `privateOnly` filters. |
| `get_package` | Full record for one package: workspace + external deps, entry points. |
| `list_symbols` | Enumerate every exported symbol of a single package, optionally filtered by kind. |
| `find_symbol` | Locate an exported symbol by name (case-insensitive); ranks exact > prefix > substring. |
| `get_symbol` | Detail for one symbol by ref. Pass `include=["source"]` to expand the body. |

### Plugin ecosystem

| Tool | Purpose |
| --- | --- |
| `list_plugins` | List detected plugins (any package with a `Plugin.define(meta)` call + `meta.ts`). |
| `get_plugin` | Full record for one plugin by id: meta, modules wired via `.pipe(...)`, and the surfaces / capabilities / operations it contributes. |
| `list_surfaces` | Aggregate every `Surface.create({ id, role, ... })` contribution. Filter by `pluginId`. |
| `list_capabilities` | Aggregate every `Capability.contributes(<key>, ...)` call. Filter by `pluginId`. |
| `list_operations` | Aggregate every `Operation.make({ meta: { key, name, description } })` definition. Filter by `pluginId`. |

### Schemas (ECHO-registered types)

| Tool | Purpose |
| --- | --- |
| `list_schemas` | List every ECHO-registered type — `Schema.Struct(...).pipe(Type.makeObject({ typename, version }))` and the lowercase `Type.Obj(...)` variant used inside `@dxos/echo` internals. Filter by `pluginId` (most common — narrows to a single plugin's schemas) or `package`. |
| `get_schema` | Detail for one schema by typename: full field list, version, owning package, source location. |
| `find_schema_usage` | Every line in the monorepo that mentions a typename — references, JSDoc, plugin wiring. The defining `Type.makeObject` line is excluded. |

Tool descriptions are written for LLM trigger accuracy — they describe *when* to use a tool, not just what it does.

## Try it (browser UI)

Quickest hands-on path — launches the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) against this server, with all paths pre-baked:

```bash
moon run introspect-mcp:inspect
```

The terminal prints a URL containing `?MCP_PROXY_AUTH_TOKEN=...`. Open *that exact URL* in your browser, click **Connect** → **Tools** → **List Tools** → pick a tool → **Run Tool**.

See [Test it from a browser (MCP Inspector)](#test-it-from-a-browser-mcp-inspector) below for troubleshooting.

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
3. Save and toggle **enabled**. Every tool listed in the [Tools](#tools) section above becomes available to the assistant — packages and symbols, plugin ecosystem (plugins / surfaces / capabilities / operations), and ECHO-registered schemas.

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
| `moon run introspect-mcp:test`        | Unit + integration tests (in-memory and real-stdio subprocess), ~3s |
| `moon run introspect-mcp:check`       | End-to-end: spawns the server with the exact command from `.mcp.json` and round-trips a tool call. **Run before restarting Claude Code.** |
| `moon run introspect-mcp:inspect`     | Launch the MCP Inspector (browser UI) against this server, with all paths absolutized. Cold cache may take ~80s; subsequent runs <1s. |
| `moon run introspect-mcp:sanity`      | Inspector + proxy auth check — confirms the launcher succeeds and the proxy responds with a valid auth token. |
| `moon run introspect-mcp:serve`       | Raw stdio server, for piping requests in by hand. |
| `moon run introspect-mcp:serve-http`  | HTTP server on `localhost:39476/mcp`. Use this to wire the server into Composer's plugin-assistant or any other HTTP/SSE-only MCP client. |
| `moon run introspect:index`           | Pre-build the on-disk symbol cache (`<root>/node_modules/.cache/dxos-introspect/`). The cache makes server startup near-instant. |
| `moon run introspect-mcp:fetch-cache` | Download the prebuilt cache from the latest CI run on main and install it locally. Skips the ~80s cold-start parse for ~95% of packages on a clean main checkout. Requires `gh` CLI authenticated (`gh auth login`). |

## Why `--conditions=source`?

The package.json `exports` field has a `source` condition pointing at `src/index.ts`. Without `--conditions=source`, `tsx` falls through to the `default` condition (`dist/lib/node/index.mjs`) which doesn't exist unless you've run a build. The flag lets the server boot from source with no build step — same behavior the rest of the DXOS toolchain relies on.

## Cache

The indexer writes two files under `<repo-root>/node_modules/.cache/dxos-introspect/`:

- `core.json` — symbol cache (~13 MB for 250 packages), reused across runs and invalidated per-package by git tree SHA.
- `plugins.json` — plugin metadata sidecar (~200 KB), regenerated every run since plugin extraction is cheap.

Following the babel/swc/eslint convention so the directory is auto-gitignored and gets nuked by `pnpm clean`. Saves are atomic (write-temp-then-rename), so concurrent introspector processes can't corrupt each other.

### Invalidation

Each entry records:

- the **git tree SHA** of `<package>/src` at HEAD when the entry was written, and
- the most-recent **mtime** under `<package>/src`.

On load, an entry is reused if the live tree SHA matches the cached one (portable across machines — same git ref → same SHA), and falls back to mtime equality otherwise (covers uncommitted local edits before they're committed). Anything that doesn't match is dropped and re-extracted on demand.

A package with uncommitted changes under its `src/` is treated as not-in-git for tree-SHA purposes — its srcTreeSha is empty in both the live probe and any saved entry, so it always falls through to the mtime path. This means dirty work-in-progress edits never falsely match a CI-built cache.

### Prebuilt cache from CI

The [`Introspect Cache`](../../../.github/workflows/introspect-cache.yml) workflow runs on every commit to main and uploads the cache as a GitHub Actions artifact. To install it locally instead of building from scratch:

```bash
moon run introspect-mcp:fetch-cache
```

This calls `gh run download` against the most recent successful workflow run on main and drops the cache at the canonical path. Per-package validity is decided by tree SHA, so any package whose `src/` is unchanged from that commit is reused; the rest re-extract on demand. On a clean main checkout you typically get >95% reuse; first MCP server start drops from ~80s to a few seconds.

### Force a fresh build

```bash
rm -rf node_modules/.cache/dxos-introspect
moon run introspect:index
```

Otherwise the cache auto-invalidates per package whenever `src/` changes (tree SHA on commit, mtime in between).
