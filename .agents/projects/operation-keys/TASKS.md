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
- [x] Give `runInstructions` a domain (`org.dxos.operation.assistant.runInstructions`).
- [x] AUDIT.md moved here, regenerated from a committed [scan.mjs](./scan.mjs), keyed on the DXN with
      the derived tool-name column REMOVED — it is a function of the key, and restating it invites drift.
- [ ] Update PLUGIN.mdl across all plugins — 71 reference operations; the codemod fixed the 5 with
      exact key matches, the rest name old namespaces as patterns or prose.
- [ ] Lint rule `operation-key-shape` in `packages/common/eslint-plugin-rules`: a key must be a
      literal matching `<root>.operation.<domain>.<camelVerb>`, never built by a helper.
- [ ] Regenerate memoized fixtures and [AUDIT.md](./AUDIT.md).
- [ ] 33 keys are still off-shape — test and example definitions that omit the domain segment
      (`com.example.operation.fib`). The lint rule should land before these are cleaned up, so they
      fail rather than accumulate.

## Phase 2 — deploy coordination

- [ ] EDGE stores `meta.key` beside the `functionId` it binds by, so deployed functions need a
      redeploy (or an EDGE-side key rewrite) in the same window as the rename. Coordinate with the
      edge repo's `mcp-operations` project.

## Backlog

- [ ] 37 derived tool names still exceed 30 characters (max 48), from deep domain paths such as
      `app-framework.collaboration.*`. Decide whether the domain segment should be flattened.
- [ ] Four duplicate operation definitions across packages (`example.fib`/`reply`/`sleep` in both
      `compute` and `functions-testing`; `script.forexEffect` in both `functions-testing` and
      `plugin-script`). They collapse to one key each and should be deduplicated.
