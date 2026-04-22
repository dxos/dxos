---
name: debug-mode
description: Interactive debugging mode that generates hypotheses, instruments code with @dxos/log runtime logs captured into app.log, and iteratively fixes bugs with human-in-the-loop verification. Only for hard-to-diagnose bugs; in those cases, remind the user that debug-mode is available, and never proactively activate this skill.
---

# Debug Mode

You are in **Debug Mode** — a hypothesis-driven debugging workflow. Do NOT jump to fixes. Follow each phase in order.

---

## DXOS setup — how log exfiltration works here

This repo already ships the full pipeline; do not reinvent it.

- `@dxos/vite-plugin-log` is wired into `composer-app/vite.config.ts` and intercepts every browser-side `@dxos/log` call via a `LogProcessor`.
- Entries are serialized as **NDJSON** and streamed over the Vite HMR WebSocket to the dev server, which appends them to **`packages/apps/composer-app/app.log`**. The file is truncated when the dev server starts.
- Third-party plugin code hosted inside Composer imports `@dxos/log` from the host, so its logs land in the same `app.log`.
- Query the log with `node scripts/query-logs.mjs packages/apps/composer-app/app.log -q <filter> -g <regex>`. See the `logging` skill for the full filter syntax (levels, `path:level`, `!exclude`, `-q` OR / `-g` AND).
- Node-side code (tests, CLI, server): `@dxos/log` works identically; set `LOG_FILTER=debug` for stdout capture in vitest runs.

You instrument by adding `log('[DEBUG H1] …', { ctx })` calls inside `#region DEBUG` markers, ask the user to reproduce, then grep for `[DEBUG H` in `app.log`. The `f`/`n` fields in each NDJSON record give you file:line; the `c` field carries structured context; `o` carries scope.

---

## Phase 1: Understand the Bug

Ask the user (if not already provided): expected vs actual behavior, reproduction steps, error messages.

Read the relevant source code. Understand the call chain and data flow.

## Phase 2: Generate Hypotheses

Generate **testable hypotheses** as a numbered list:

```
Based on my analysis, here are my hypotheses:

1. **[Title]** — [What might be wrong and why]
2. **[Title]** — [Explanation]
3. **[Title]** — [Explanation]
```

Include both obvious and non-obvious causes (race conditions, off-by-one, stale closures, type coercion, etc.).

## Phase 3: Instrument the Code

### Use `@dxos/log`, not `console.log` or `print`

Every instrumentation call MUST use `@dxos/log`:

```ts
// #region DEBUG
import { log } from '@dxos/log';
log('[DEBUG H1] frobbed check', { frobbed, ts: Date.now() });
// #endregion DEBUG
```

- **Static message first** (lowercase phrase, hypothesis tag included). No template-literal interpolation in the message string.
- **Structured context second** — dynamic values go in the object, never only in the message.
- Tag each line with `[DEBUG H<n>]` so you can grep for only your instrumentation.

If the file you are instrumenting does not already import `@dxos/log`, add the import inside the `#region DEBUG` block so it removes cleanly:

```ts
// #region DEBUG
import { log } from '@dxos/log';
// #endregion DEBUG
```

**Never use `console.log`, `print`, stdout, or stderr.** All debug output goes through `@dxos/log` → `app.log`.

### Region markers

ALL instrumentation MUST be wrapped in region blocks for clean removal:

```
// #region DEBUG       (JS/TS/Java/C#/Go/Rust/C/C++)
# #region DEBUG        (Python/Ruby/Shell/YAML)
<!-- #region DEBUG --> (HTML/Vue/Svelte)
-- #region DEBUG       (Lua)

...instrumentation...

// #endregion DEBUG    (matching closer)
```

### Clearing the log before each reproduction

`app.log` only self-truncates when the dev server restarts. Before each reproduction, truncate it explicitly:

```bash
: > packages/apps/composer-app/app.log
```

(Equivalently `truncate -s 0 packages/apps/composer-app/app.log`.)

### Be minimal

Log only what's needed to confirm or rule out each hypothesis — variable states, execution paths, timing, decision points. Prune aggressively; `app.log` is noisy with existing framework logs.

After instrumenting, tell the user to reproduce the bug, then **STOP and wait**.

## Phase 4: Analyze Logs & Diagnose

When the user has reproduced:

1. **Check size first** (`wc -l packages/apps/composer-app/app.log`). If large, query with a tight filter rather than reading the whole file — `app.log` will contain thousands of framework log lines you did not write.
2. Extract your instrumentation:

   ```bash
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g '\[DEBUG H'
   ```

   Narrow further as needed:

   ```bash
   # Only H2 lines in a specific file
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q debug -g '\[DEBUG H2'

   # Drop noisy RPC file lines
   node scripts/query-logs.mjs packages/apps/composer-app/app.log -q 'debug,!rpc.ts' -g '\[DEBUG H'
   ```

   Output columns: `timestamp`, level letter, `file:line`, scope, message, context, error — everything you need to map back to the hypothesis.

3. Map logs to hypotheses — confirmed vs ruled out.
4. Present diagnosis with evidence:

```
## Diagnosis

**Root cause**: [Explanation backed by log evidence]

Evidence:
- [H1] Ruled out — [why]
- [H2] Confirmed — [log evidence, including file:line from the `f`/`n` fields]
```

If inconclusive: new hypotheses → more instrumentation → truncate `app.log` → ask user to reproduce again.

## Phase 5: Generate a Fix

Write a fix. Keep debug instrumentation in place.

Truncate `app.log`, ask user to verify the fix works, then **STOP and wait**.

## Phase 6: Verify & Clean Up

**If fixed:** Remove all `#region DEBUG` blocks and contents (use Grep to find them across the touched files), summarize the root cause and fix. Do not delete `app.log` itself — it's the standard dev log and the user may rely on it.

**If NOT fixed:** Read new logs, ask what they observed, return to **Phase 2**, iterate.

---

## Rules

- **Never skip phases.** Instrument and verify even if you think you know the answer.
- **Never remove instrumentation before user confirms the fix.**
- **Never use `console.log`, `print`, or any stdout/stderr output.** All debug output goes through `@dxos/log`.
- **Always tag with `[DEBUG H<n>]`** so instrumentation is greppable and distinct from existing framework logs.
- **Always truncate `app.log` before each reproduction.**
- **Always wrap instrumentation in `#region DEBUG` blocks.**
- **Always wait for the user** after asking them to reproduce.

---

## Related skills

- `logging` — full reference for `@dxos/log` (levels, `dbg`, NDJSON shape) and the `query-logs.mjs` filter syntax. Consult when you need more than the grep examples above.

Workflow inspiration: [doraemonkeys/claude-code-debug-mode](https://github.com/doraemonkeys/claude-code-debug-mode) (generic HTTP-endpoint version). This repo's adaptation uses the existing `@dxos/log` → `app.log` pipeline instead of a bespoke endpoint.
