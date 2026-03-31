---
name: logging
description: >-
  DXOS logging with @dxos/log (log, levels, dbg) and querying Composer NDJSON logs via
  scripts/query-logs.mjs. Use when adding or reviewing logs, debugging from app.log, or
  explaining log levels and vite-plugin-log output.
---

# DXOS logging (`@dxos/log`)

All application logging goes through **`@dxos/log`** (“dxlog”). Import: `import { log, dbg } from '@dxos/log';`

## Message shape

- **Static message first** (lowercase phrase, no template literals in the message string).
- **Structured context second** (object). Do not stuff dynamic data only into the message; put it in context.

```ts
log('received queue batch', { count: items.length, spaceKey });
log.warn('plugin failed to activate', { pluginId, cause: err.message });
```

## Levels

| API | Role |
|-----|------|
| `log('…', ctx)` / `log.debug('…', ctx)` | **DEBUG** — verbose diagnostics; often **not** shown on the default browser console but still captured when a log sink (e.g. vite-plugin-log file) is attached. |
| `log.trace('…', ctx)` | **TRACE** — finest granularity; usually filtered out everywhere except explicit trace filters. |
| `log.verbose('…', ctx)` | **VERBOSE** — between debug and info. |
| `log.info('…', ctx)` | **INFO** — user-visible / product-level events; **shown on console** with typical filters. |
| `log.warn('…', ctx)` | **WARN** — non-fatal issues. |
| `log.error('…', ctx)` | **ERROR** — hard failures. |
| `log.catch(err, ctx?, meta?)` | Log an **Error** at ERROR level (stack in processors). |

Rule of thumb: **`log.info` and above** are what operators and users normally see in the **console**; **`log()` / `log.debug`** are for deep diagnosis and file buffers.

## `dbg`

- `dbg(value)` (and related helpers from `@dxos/log`) are for **local debugging only**.
- **Remove or replace before committing** (or gate behind dev-only code paths).

## Composer dev: `app.log`

With **`@dxos/vite-plugin-log`** enabled in Composer, browser **`@dxos/log`** output is serialized to **NDJSON** and appended to:

`packages/apps/composer-app/app.log`

(from the repo root; path is relative to **process cwd** when the dev server runs, usually repo root → that file).

Truncate/restart behavior is owned by the plugin (file cleared on dev server start).

## Querying logs: `scripts/query-logs.mjs`

From repo root:

```bash
node scripts/query-logs.mjs <file> [-q <filter>]... [-g <regexp>]...
pnpm query-logs -- <file> ...
```

- **`-q`**: comma-separated filters in **`LOG_FILTER` style** (see `packages/common/log` `parseFilter` + `shouldLog`).
  - **Level only**: `debug`, `info`, `warn`, `error`, `trace`, `verbose`.
  - **Path substring + level**: `echo-db:debug` — file path in the log line must contain `echo-db`, level must be ≥ `debug`.
  - **Exclude**: `!substring` — drop lines whose file path contains `substring` (after `!`). Use `!rpc.ts` to drop noisy RPC files. Bare `!foo` is treated as exclude at trace threshold internally.
  - **Repeat `-q`**: **OR** between groups; inside one `-q`, filters work like runtime `shouldLog` (includes + excludes).
- **`-g`**: **RegExp** (JavaScript) run on the **raw JSON line**. Repeat **`-g`** for **AND**.

Output columns: `timestamp`, level letter, `file:line`, scope (`o`), message (`m`), context (`c`), error (`e`).

### Workflow

Run **narrow queries** and pipe to Unix tools:

```bash
# How many debug lines mention ProcessManager?
node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g ProcessManager | wc -l

# Echo DB query pipeline only, exclude rpc.ts noise, first 20 lines
node scripts/query-logs.mjs packages/apps/composer-app/app.log -q 'echo-db:debug,!rpc.ts' | head -20

# Automerge-related paths at debug
node scripts/query-logs.mjs packages/apps/composer-app/app.log -q automerge:debug | less

# Invalid RPC response ids (example message grep)
node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g 'invalid id' | head

# OR two path groups: client package OR space proxy, debug and above
node scripts/query-logs.mjs packages/apps/composer-app/app.log -q 'sdk/client/src:debug' -q 'space-proxy:debug' | wc -l
```

**Requires** `@dxos/log` built: `moon run log:build` (script imports `packages/common/log/dist/...`).

## Path fragments to try (Composer `f` field)

These substrings match **typical** `packages/...` paths in NDJSON. Counts vary per session.

| Area | Example `-q` fragment | Notes |
|------|------------------------|--------|
| Process / agent runtime | `ProcessManager` (use `-g`) or `functions-runtime:debug` | `functions-runtime/src/process/ProcessManager.ts` |
| ECHO queries | `echo-db:debug` or `echo/echo-db:debug` | `query-result`, graph, index |
| Automerge | `automerge:debug` | Lower volume than full echo-db |
| Client (DXOS Client) | `sdk/client/src:debug` or `client.ts:debug` | `packages/sdk/client/src/client/client.ts` |
| Space / ECHO proxy | `space-proxy:debug` | `packages/sdk/client/src/echo/space-proxy.ts` |
| Dedicated worker services | `dedicated-worker:debug` | `packages/sdk/client/src/services/dedicated/` |
| Mesh RPC (noisy) | `mesh/rpc:debug` | Very high volume; pair with `!rpc.ts` or `-g` |
| RPC tunnel / worker port | `rpc-tunnel:debug` | Worker transport |
| Plugins | `plugin-manager:debug` | `packages/sdk/app-framework/.../plugin-manager.ts` |
| Edge / status RPC | `edge` with `-g` or path under `client-services` | Responses often `QueryEdgeStatusResponse` |

Add more fragments by copying a path prefix from an **`app.log`** line (`f` field) and using it in `-q your-fragment:debug`.

## Related

- Log processors and filters: `packages/common/log/src/context.ts`, `packages/common/log/src/options.ts` (`parseFilter`).
- NDJSON capture shape: `packages/common/log/src/log-buffer.ts`.
- Composer wiring: `tools/vite-plugin-log`, `packages/apps/composer-app/vite.config.ts` (`vitePluginLog` in `sharedPlugins`).
