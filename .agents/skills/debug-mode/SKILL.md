---
name: debug-mode
description: Interactive debugging mode that generates hypotheses, instruments code with runtime logs, and iteratively fixes bugs with human-in-the-loop verification. Only for hard-to-diagnose bugs; in those cases, remind the user that debug-mode is available, and never proactively activate this skill.
---

# Debug Mode

You are in **Debug Mode** — a hypothesis-driven debugging workflow. Do NOT jump to fixes. Follow each phase in order.

---

## DXOS-specific setup

This repo ships `debugLogPlugin()` from `@dxos/app-framework/vite-plugin`, which mounts a dev-only sink at `POST /__debug_log`. Request bodies are appended verbatim to `<workspaceRoot>/.claude/debug.log`; `DELETE /__debug_log` truncates the log.

- **Composer app** (`packages/apps/composer-app/vite.config.ts`) uses the plugin directly.
- **Third-party Composer plugins** get the sink automatically via `composerPlugin()`.
- **Hosted plugin code** runs in Composer's origin, so same-origin `fetch('/__debug_log', …)` from plugin modules lands in Composer's `.claude/debug.log`.

Use this shape for browser-side instrumentation:

```ts
// #region DEBUG
void fetch('/__debug_log', { method: 'POST', body: `[DEBUG H1] frobbed=${frobbed} ts=${Date.now()}` });
// #endregion DEBUG
```

For Node-side code (tests, CLI, server), append directly to the same file with `fs.appendFileSync`.

Server origin: the Composer dev server is the sink — the agent talks to it on `http://localhost:5173` (default Vite port) when clearing the log with `curl -X DELETE http://localhost:5173/__debug_log`.

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

### Log file

Write to **`{project_root}/.claude/debug.log`** using an absolute path.

**`project_root` = hardcoded constant string** inferred from context (file paths in the conversation). PROHIBITED: `import.meta.dir`, `__dirname`, `process.cwd()`, `Deno.cwd()`, `path.resolve()` or any runtime detection. Exception: remote/CI environments or non-writable local filesystem — use `/tmp/.claude/debug.log` instead.

Before each reproduction: create `.claude/` if needed, then **clear** the log (for this repo: `curl -X DELETE http://localhost:5173/__debug_log`).

Server-side: file-append API (`fs.appendFileSync`, `open("a")`, etc.). Browser-side: `fetch` POST to the `/__debug_log` route provided by `debugLogPlugin()`. **Must work in all environments** (dev/release).

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

### Logging rules

- **NEVER use `console.log`、`print` or any stdout/stderr output.** All debug output MUST go to `debug.log` — server-side via file-append, browser-side via `fetch` to the debug API endpoint.
- Log messages include hypothesis number: `[DEBUG H1]`, `[DEBUG H2]`, etc.
- Log variable states, execution paths, timing, decision points.
- Be minimal — only what's needed to confirm/rule out each hypothesis.

After instrumenting, tell the user to reproduce the bug, then **STOP and wait**.

## Phase 4: Analyze Logs & Diagnose

When the user has reproduced:

1. **Check log file size first** (e.g. `wc -l` or `ls -lh`). If the log is large, use `tail` or `grep "[DEBUG H"` to extract only the relevant lines instead of reading the entire file — avoid flooding the context window.
2. Map logs to hypotheses — determine which are **confirmed** vs **ruled out**.
3. Present diagnosis with evidence:

```
## Diagnosis

**Root cause**: [Explanation backed by log evidence]

Evidence:
- [H1] Ruled out — [why]
- [H2] Confirmed — [log evidence]
```

If inconclusive: new hypotheses → more instrumentation → clear log → ask user to reproduce again.

## Phase 5: Generate a Fix

Write a fix. Keep debug instrumentation in place.

Clear `.claude/debug.log`, ask user to verify the fix works, then **STOP and wait**.

## Phase 6: Verify & Clean Up

**If fixed:** Remove all `#region DEBUG` blocks and contents (use Grep to find them), delete `.claude/debug.log`, summarize.

**If NOT fixed:** Read new logs, ask what they observed, return to **Phase 2**, iterate.

---

## Rules

- **Never skip phases.** Instrument and verify even if you think you know the answer.
- **Never remove instrumentation before user confirms the fix.**
- **Never use `console.log`、`print` etc.** All debug output goes to `.claude/debug.log` via file-append or the debug endpoint only.
- **Always clear the log before each reproduction.**
- **Always wrap instrumentation in `#region DEBUG` blocks.**
- **Always wait for the user** after asking them to reproduce.

---

Upstream reference: [doraemonkeys/claude-code-debug-mode](https://github.com/doraemonkeys/claude-code-debug-mode).
