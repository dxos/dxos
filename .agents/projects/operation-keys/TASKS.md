# operation-keys — Tasks

Goal: one canonical shape for every `Operation.make` key — `org.dxos.operation.<domain>.<verb>` —
written as a full string literal so it is greppable, with the model-facing tool name derived from it.
Design: [DESIGN.md](./DESIGN.md)

## Phase 1 — normalize the keys (PR #12677)

- [x] Decide the shape: `<owning-root>.operation.<domain>.<verb>`; DXOS keys use `org.dxos`, example
      and third-party keys keep their own root (`com.example.operation.random`).
- [x] Remove the 50 per-plugin `makeKey` helpers; keys are inlined literals so a key can be found by
      searching for it.
- [x] Rewrite all 452 keys and every string reference to them (96 files).
- [x] Resolve the three key collisions the normalization surfaced:
      markdown `Create`/`CreateMarkdown` (the factory became `draft`), and two `McpServer.test.ts`
      test doubles that had invented real-looking `space.*` keys.
- [x] `TOOL_NAME_KEY_PREFIX` → `org.dxos.operation.`
- [x] Normalize domain segments to camelCase: `plugin-crm` → `crm`, `web-search` → `webSearch`,
      `stories-brain` → `storiesBrain`. No key carries a hyphen now, which also retires the
      `webSearch`/`web-search` collision hazard in practice.
- [x] Give `runInstructions` a domain (`org.dxos.operation.assistantToolkit.runInstructions`).
- [x] Operations defined in and local to a test, storybook or `testing/` use the `com.example` root,
      so a fixture never squats a real namespace. 54 keys moved.
- [x] AUDIT.md moved here, regenerated from a committed [scan.mjs](./scan.mjs), keyed on the DXN with
      the derived tool-name column REMOVED — it is a function of the key, and restating it invites drift.
- [ ] Update PLUGIN.mdl across all plugins — 71 reference operations; the codemod fixed the 5 with
      exact key matches, the rest name old namespaces as patterns or prose.
- [x] Domain is the PACKAGE (`@dxos/` and `plugin-` stripped, camelCased), verb-first, de-stuttered.
      90 keys renamed. `@dxos/plugin-assistant` keeps `assistant`; `@dxos/assistant-toolkit` becomes
      `assistantToolkit`, which is what resolves the two-packages-one-word case.
- [x] Lint rule `operation-key-shape` in `packages/common/eslint-plugin-rules`, registered as an
      ERROR in `.oxlintrc.json`, with a test per check. Enforces shape, domain-equals-package,
      no stutter, verb-first against a core verb list, no dangling preposition, literal-not-helper,
      and `com.example` for test-local files. A fixture is held to its root only — it names no
      package, so it owns no domain and its shape is not worth a failing build.
- [x] A verb must not end in a preposition — now a lint check. De-stuttering produced
      `tasks.convertTo` from `convertToTask`: verb-first, no stutter, and meaningless.
- [x] Regenerate memoized fixtures and [AUDIT.md](./AUDIT.md). 16 recordings re-cut in the two
      agent-runtime stores; every other store replayed unchanged, since its tools were not renamed.
- [ ] 33 keys are still off-shape — test and example definitions that omit the domain segment
      (`com.example.operation.fib`). The lint rule should land before these are cleaned up, so they
      fail rather than accumulate.

- [x] Merge `origin/main`: main's `plugin-native-filesystem` → `plugin-file-system` rename made the
      domain wrong (`nativeFilesystem`), and #12675 landed a copy of the superseded audit at
      `packages/core/compute/assistant/src/tool-runtime/AUDIT.md`. Domain retargeted to `fileSystem`,
      stale audit deleted — this project's [AUDIT.md](./AUDIT.md) is the only one.
- [x] The lint rule waved a `const KEY = '...'` indirection through in fixtures, which hid an
      `org.dxos.function.` key in `McpServer.test.ts`. It now resolves a module-scope const to its
      literal, so naming a key once is allowed but its value is still checked.
- [x] Fixed the last dangling key references: three evals pointed at `org.dxos.function.database.*`
      operations that had never existed under that name (now `space.addObject`/`updateObject`/
      `queryObjects`), and `plugin-sidekick` bound a non-existent `agent.get-context`.

## Phase 2 — deploy coordination

- [ ] EDGE stores `meta.key` beside the `functionId` it binds by, so deployed functions need a
      redeploy (or an EDGE-side key rewrite) in the same window as the rename. Coordinate with the
      edge repo's `mcp-operations` project.

- [x] `toggle` retired as an operation verb. Six operations became `set*` with a REQUIRED state, so a
      caller can no longer omit it and get a flip. Where the UI genuinely flips, the read moved to the
      call site, which is where the intent lives.

## Follow-up PR

- [ ] Rename each operation const to match its key's verb (`CreateMarkdown` -> `CreateDraft`,
      `TaskCreate` -> `Create`). 123 consts. ATTEMPTED AND REVERTED here: a test file defines
      `const op = Operation.make(...)`, so a package-scoped rename rewrote every bare `op` in
      @dxos/compute — 249 files. Redo it scoped to the defining file plus its actual importers, and
      skip identifiers that are short or not PascalCase.
- [ ] `markdown.createDraft` has no caller beyond its handler-set registration. Decide whether it
      earns its place now that MCP can invoke it by key, or should be deleted.

## Backlog

- [ ] 37 derived tool names still exceed 30 characters (max 48), from deep domain paths such as
      `app-framework.collaboration.*`. Decide whether the domain segment should be flattened.
- [ ] Four duplicate operation definitions across packages (`example.fib`/`reply`/`sleep` in both
      `compute` and `functions-testing`; `script.forexEffect` in both `functions-testing` and
      `plugin-script`). They collapse to one key each and should be deduplicated.
