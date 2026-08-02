---
name: debugging
description: Use when instrumenting code with runtime logs to test a hypothesis — @dxos/log debug lines captured to app.log (browser), test.log (node tests), or test-browser.log (browser tests/storybook), and querying them with query-logs.mjs. Reference for the log-exfiltration pipeline and instrumentation mechanics, not a debugging workflow.
---

# Debugging instrumentation (@dxos/log pipeline)

Mechanics for hypothesis-testing with runtime logs. The debugging _process_ —
hypotheses, isolation, verification, user interaction — is owned by the calling
skill (`debugging-ui` for UI bugs) or workflow; this skill is only how to get
signals out of running code cleanly.

## The pipeline — how log exfiltration works here

This repo already ships the full pipeline; do not reinvent it.

- `@dxos/vite-plugin-log` is wired into `composer-app/vite.config.ts` and intercepts every browser-side `@dxos/log` call via a `LogProcessor`.
- Entries are serialized as **NDJSON** and POSTed to the plugin's dev-server sink (`/@dxos-plugin-log/sink`, not the HMR WebSocket), which appends them to **`packages/apps/composer-app/app.log`**. The file is truncated when the dev server starts.
- Third-party plugin code hosted inside Composer imports `@dxos/log` from the host, so its logs land in the same `app.log`.
- Query the log with `node scripts/query-logs.mjs packages/apps/composer-app/app.log -q <filter> -g <regex>`. See the `logging` skill for the full filter syntax (levels, `path:level`, `!exclude`, `-q` OR / `-g` AND).
- Node-side code (tests, CLI, server): `@dxos/log` works identically; set `LOG_FILTER=debug` for stdout capture in vitest runs. Node vitest also writes an NDJSON file sink at **`<package>/test.log`** (path is printed at run start).
- **Browser tests** (vitest browser mode, `*.browser.test.ts`, storybook) have no filesystem, so `@dxos/log` entries are POSTed to the `DxosLogPlugin` dev-server sink and appended to **`<package>/test-browser.log`** (NDJSON, same shape as `app.log`/`test.log`). Both the page realm and worker realms are covered. Filter defaults to `debug`; override with `DX_TEST_LOG_FILTER` (or `LOG_FILTER`). Query it the same way: `node scripts/query-logs.mjs <package>/test-browser.log -q debug -g '\[DEBUG H'`. This is the primary window into worker-side behavior for worker-framework browser tests.
- Composer runs client services in a **dedicated worker per tab** (a coordinator handles cross-tab exclusivity; there is no long-lived SharedWorker hosting services — `DX_SHARED_WORKER` is an opt-in exception). A plain page reload therefore picks up newly instrumented worker-side code; do NOT ask the user to close all tabs first. Worker-side logs land in the same `app.log` (the log plugin handles `?worker_file` / `?sharedworker_file` entries).

## Instrumentation rules

### Use `@dxos/log`, not `console.log` or `print`

```ts
// #region DEBUG
import { log } from '@dxos/log';
log('[DEBUG H1] frobbed check', { frobbed, ts: Date.now() });
// #endregion DEBUG
```

- **Static message first** (lowercase phrase, hypothesis tag included). No template-literal interpolation in the message string.
- **Structured context second** — dynamic values go in the object, never only in the message.
- Tag each line with `[DEBUG H<n>]` (n = hypothesis number) so instrumentation is greppable and distinct from framework logs.
- If the file does not already import `@dxos/log`, add the import inside the `#region DEBUG` block so it removes cleanly.
- **Never use `console.log`, `print`, stdout, or stderr.** All debug output goes through `@dxos/log`.

### Region markers

ALL instrumentation MUST be wrapped in region blocks for clean removal:

```text
// #region DEBUG       (JS/TS/Java/C#/Go/Rust/C/C++)
# #region DEBUG        (Python/Ruby/Shell/YAML)
<!-- #region DEBUG --> (HTML/Vue/Svelte)
-- #region DEBUG       (Lua)

...instrumentation...

// #endregion DEBUG    (matching closer)
```

### Be minimal

Log only what confirms or rules out the hypothesis — variable states, execution
paths, timing, decision points. Prune aggressively; `app.log` is noisy with
existing framework logs.

## Capture cycle

1. **Rotate the sink before each reproduction** — `app.log` only self-truncates on dev-server restart, so clear it between iterations, but move the previous capture aside rather than destroying it (the run you are about to overwrite may hold the only evidence of an intermittent failure):

   ```bash
   mv packages/apps/composer-app/app.log packages/apps/composer-app/app.log.prev && : > packages/apps/composer-app/app.log
   ```

   The dev server keeps appending to the same path, so the new file starts empty and `app.log.prev` stays queryable with the same tooling. For tests, rotate `<package>/test.log` (node) or `<package>/test-browser.log` (browser) the same way, and re-run the test yourself between iterations. The log is shared with whoever else is attached to that dev server — never delete a sink you did not create, and if a capture predates your session, keep it.

2. Reproduce (yourself via browser tools whenever possible — see `debugging-ui`).

3. **Check size first** (`wc -l`), then extract only your lines:

   ```bash
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g '\[DEBUG H'
   ```

   Narrow further as needed:

   ```bash
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g '\[DEBUG H2'
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q 'debug,!rpc.ts' -g '\[DEBUG H'
   ```

   Output columns: `timestamp`, level letter, `file:line`, scope, message, context, error. The `f`/`n` NDJSON fields give file:line; `c` carries structured context; `o` carries scope.

## Cleanup

- **Never remove instrumentation before the fix is verified** in the reporting environment.
- Once verified: remove all `#region DEBUG` blocks and their contents (Grep for `#region DEBUG` across touched files). Do not delete `app.log` itself — it's the standard dev log.

## Related skills

- `debugging-ui` — the UI debugging process (isolation ladder, verification contract, interaction budget) that decides _when_ to instrument.
- `logging` — full `@dxos/log` reference (levels, `dbg`, NDJSON shape) and `query-logs.mjs` filter syntax.

Workflow inspiration: [doraemonkeys/claude-code-debug-mode](https://github.com/doraemonkeys/claude-code-debug-mode) (generic HTTP-endpoint version). This repo's adaptation uses the existing `@dxos/log` → `app.log` pipeline instead of a bespoke endpoint.
