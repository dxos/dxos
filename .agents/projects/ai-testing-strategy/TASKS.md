# AI Testing Strategy — Tasks

_Resume: **first live-scored `database.eval.ts` result obtained: 100%.** PR #12307 is now
functionally verified end-to-end — next is to mark it ready for review (holding only in case more
polish is wanted) and continue Phase 2 (port `web-search.test.ts`). Uncommitted: none, pushed to
`claude/ai-testing-strategy-9ctzjt` through commit `8d0f95d`, CI running. Last: two blocking bugs
found and fixed in this session — (1) the evalite-specific `plugin-routine` registry-sync race
(config fix, see Follow-ups), and (2) `createEvalRunner` defaulted `skills` to `[]` instead of
`getDefaultSkills()` like `harness.ts`'s `agentTest()`, so the agent had no database tools at all
("No tools available to complete the task") — fixed by extracting `getDefaultSkills` into a shared
`src/skills.ts` and defaulting to it in `runner.ts`. With both fixed and a real
`DX_ANTHROPIC_API_KEY` (via `op run --account braneframe --env-file=.config/.env.1password`),
`database.eval.ts` scores 100%. Verified: assistant-evals build/lint/test green, `oxfmt --check`
clean._

Design: [`packages/core/compute/ai/TESTING.md`](../../../packages/core/compute/ai/TESTING.md).
PRs: [#12287](https://github.com/dxos/dxos/pull/12287) (design doc, MERGED);
[#12291](https://github.com/dxos/dxos/pull/12291) (Phase 1 steps 1-3 — de-gate G2/G3 + scripted
`LanguageModel` primitive + `AiRequest` loop (D) tests; CodeRabbit nits addressed
(`test`+context-`expect`, helpers below `describe`); MERGED);
[#12297](https://github.com/dxos/dxos/pull/12297) (revised plan — gate G1 in place instead of
deleting it, remove all committed conversation fixtures, switch the gating mechanism to native
`describe.skipIf`/`it.effect.skipIf`/`test.skipIf`; MERGED);
[#12305](https://github.com/dxos/dxos/pull/12305) (leaner package-level `AiRequest.test.ts`
D-tier tests + `operationServiceLayerNoop`; MERGED);
[#12307](https://github.com/dxos/dxos/pull/12307) (Phase 2 start — DB-effect assertion helper +
first ported eval, `database.eval.ts`; merges `@dxos/assistant-e2e` into `@dxos/assistant-evals`
(composition-scoped package layout); draft).

Goal: replace the memoized-LLM e2e strategy with a tier per conversation dimension —
deterministic unit tiers (C/D/E/F/G) gating CI, graded model-pinned evals (A/B/H via
`@dxos/assistant-evals`) out-of-band — and retire the current frozen-conversation replay
as primary coverage.

## Consumer groups (see TESTING.md "Consumer inventory")

- **G1** — pure agent e2e, now living in `@dxos/assistant-evals` (merged from `@dxos/assistant-e2e`
  in #12307 — see TESTING.md "Where evals live"): database, crm-mailbox, web-search, planning,
  markdown, smoke. Redundant C/D signal, ~7.5 MB fixtures. **Revised: keep, gate behind
  `runMemoizedTests()` like G2/G3 (see Phase 1 below) — not deleted.** These stay available as
  opt-in live/eval-style tests and as design inspiration for later tiers.
- **G2** — per-operation / skill: plugin-markdown create/update, plugin-magazine, plugin-assistant,
  assistant-toolkit run-instructions + database/memory/planning/agent skills, AiSummarizer.
  **Convert to mocked C unit tests before deleting.**
- **G3** — agent-runtime session: functions, AgentService, request, xml-response.
  **Convert to scripted-model D tests before deleting.**

## Done

- [x] Rewrite `packages/core/compute/ai/DESIGN.md` → `TESTING.md`: dimensions A-H, current
      approach (achieves vs misses), tiered target, prioritized plan.
- [x] Add consumer inventory + removal blast-radius (G1/G2/G3), correct the "coverage would drop to
      zero" framing (behavioral ~0 already; only deterministic C/D must be preserved).
- [x] Drop dangling `See DESIGN.md` comment pointers in MemoizedLanguageModel.ts + memoization.test.ts.
- [x] PR #12287 opened (draft), committed + pushed.

## Phase 1 — stop the bleeding + recover deterministic coverage

- [x] De-gate G2/G3 memoized replay from the default `:test` path. `runMemoizedTests()` (new
      `ai/src/testing/gate.ts`, re-exported from `@dxos/ai/testing` and `@dxos/agent-runtime/testing`)
      is false by default, true only under `DX_RUN_LLM_TESTS=1` or `ALLOW_LLM_GENERATION=1`
      (regeneration). Reversible, no deletion, per-suite (co-located non-LLM tests — planning
      `hasIncompleteTasks`, AssistantPlugin module-activation boot — keep running). Gated: 14 files
      (G2: run-instructions, {agent,database,memory,planning} skills, markdown create/update,
      magazine, AssistantPlugin ×3 tests, AiSummarizer; G3: functions, AgentService, request,
      xml-response). Left running: `memoization.test.ts` (tests the machinery itself), G1
      `assistant-e2e` (own harness — deleted in a later step, not de-gated here).
- [x] **PR #12305 (MERGED):** added a leaner, package-level companion to the harness (D) tests below
      — `assistant/src/request/AiRequest.test.ts` drives `AiRequest.Request.run` directly (no
      `AssistantTestLayer`/`ProcessManager`/`AgentServiceRuntime`/`AiService` model-resolution),
      using `ScriptedLanguageModel.scriptedLanguageModelLayer` as `LanguageModel.LanguageModel`
      directly + only the services `RunRequirements` is typed to need, most of which are noop/
      in-memory (`TestDatabaseLayer`, `registryLayerNoop`, new `operationServiceLayerNoop` in
      `@dxos/compute/testing` mirroring `registryLayerNoop`, `ToolExecutionService.layerEmpty`,
      `ToolResolverService.layerEmpty`) since `run()` never yields them on this path (no bound
      objects/skills; tool calls go through the passed-in toolkit, not the operation resolver).
      **Not a replacement** for `scripted-loop.test.ts` — that one additionally exercises the
      `AiService` model-resolution indirection and the full `ProcessManager`/`AgentServiceRuntime`/
      `ServiceResolver` composition boot (closest thing left to G1's unique "full composition
      boots" coverage); this one isolates the loop itself for a faster, narrower-blast-radius
      failure signal. Keep both. Verified: `assistant:build`/`lint` green, `assistant:test` 39
      passed/5 skipped incl. the 3 new tests. Tool-error / malformed-output branches still
      deferred (same gap as the agent-runtime version — do in one place, not both).
      **CodeRabbit review round (after marked ready):** 1 actionable comment, fixed —
      `operationServiceLayerNoop`'s `invokePromise` was rejecting instead of resolving the
      declared `{ data?: O; error?: Error }` shape; fixed to resolve `{ error }`, and (per the
      same comment) the `as unknown as Operation.OperationService` cast turned out to be
      removable after all — a directly-typed stub compiles cleanly, so the earlier
      `Template.test.ts`-style cast wasn't actually needed here. One doc-wording nitpick on the
      SKILL.md audit line adopted (softer framing, not "you skimmed"). One nitpick on
      `AiRequest.test.ts`'s top-level `expect` import skipped — the suggestion doesn't match
      `it.effect`'s actual usage in this codebase (`scripted-loop.test.ts` and
      `memoization.test.ts` both import `expect` at module scope for `it.effect`; the
      context-`expect` convention applies to plain vitest `test()`, not `it.effect`).
      Re-verified build/lint/test green after the fix. Per direct feedback, also moved
      `operationServiceLayerNoop` out of `testing/index.ts` into its own
      `testing/operation.ts` (mirrors `registry.ts` in `@dxos/echo/testing`), re-exported via
      `export * from './operation'`. NEXT: G2→C mocked unit conversions (below).
- [x] **Revised plan (superseded "delete G1" below), PR #12297:** rather than deleting
      `assistant-e2e`, extended the same gate to it — cheaper, reversible, and keeps the suites
      runnable locally as live/eval tests + design inspiration, per direct guidance. Gated all 6
      behavioral files (crm-mailbox, database, markdown, planning, smoke, web-search). Also swept
      `ai/testing/memoization/memoization.test.ts`: the 5 tests that call through to a real model
      (generate a poem, tools, tools with encoding, provider-defined tool, works with tool calls)
      are now gated per-test; the `dynamic value matching` describe block (pure
      canonicalization/matching logic, no model call) stays ungated — it was the one legitimate
      "tests the machinery, not behavior" exception. Removed all 21 committed `.conversations.json`
      fixtures repo-wide (the loader falls back to an empty store when the file is missing, so this
      only affects tests actually run under the flag — they re-record fresh, uncommitted, when run
      locally with `ALLOW_LLM_GENERATION=1`). **Mechanism revised again mid-review:** replaced the
      ad hoc `const describeMemoized = runMemoizedTests() ? describe : describe.skip` helper
      (and its `it`/`test` analogues) across all 20 gated files with the native
      `describe.skipIf(!runMemoizedTests())(...)` / `it.effect.skipIf(!runMemoizedTests())(...)` /
      `test.skipIf(!runMemoizedTests())(...)` — `@effect/vitest`'s `it.effect` and vitest's `test`
      both support `.skipIf` directly, so the custom helper was pure duplication. Verified: build
      green (`assistant-e2e`, `ai`, `plugin-assistant` + deps, 187 tasks), tests green (assistant-e2e
      13/13 skipped as expected; ai 82 passed/29 skipped incl. memoization.test.ts 9 passed/5
      skipped; plugin-assistant 127 passed/10 skipped once run under the pinned Node 24.11.1 — a
      stray system-Node/better-sqlite3 ABI mismatch in this sandbox, not a real regression).
- [x] Extract a scripted `LanguageModel` primitive from `MemoizedLanguageModel`:
      `ai/src/testing/ScriptedLanguageModel.ts` (`@import-as-namespace`, PascalCase like
      `MemoizedLanguageModel.ts`), re-exported from `@dxos/ai/testing` as `ScriptedLanguageModel`.
      `scriptedAiService(turns)` / `scriptedLanguageModelLayer(turns)` + `text()` / `toolCall()`
      builders; turns replay sequentially (Nth call → Nth turn), exhaustion fails loudly; supports
      streamText (deltas) + generateText (aggregated) + a `{ fail }` turn for provider-error branches.
      No prompt-matching, no file I/O, no casts. Own unit tests (encoders + sequential/exhaustion).
- [x] Harness (D) tests on the scripted model — `agent-runtime/.../scripted-loop.test.ts` drives the
      real `AiRequest` loop via `AssistantTestLayer({ aiService })` + a fake Echo toolkit: clean stop
      (no tool calls), tool-call→result→continue→stop, multi-iteration (result fed back each turn +
      `toolCalls` count). NOTE: `AiRequest.run` has **no max-iterations cap** in code — not tested
      (would be testing a nonexistent feature). Tool-error / malformed-output branches deferred.
- [x] ~~Delete G1 (`@dxos/assistant-e2e`) + fixtures; replace with one scripted-model boot-smoke~~
      **Superseded** — see the revised-plan entry above; G1 is gated in place, not deleted.
- [ ] Convert G2 → deterministic mocked C unit tests; golden-args fixture convention; delete each
      G2 fixture once its unit test lands.
- [ ] Context-assembly (E) + schema round-trip (F) tests. E: snapshot the assembled prompt
      (system + skill instructions + bound objects + tool descriptions) from `formatSystemPrompt` /
      `AiPreprocessor.preprocessPrompt` — pure function of inputs, no model; catches skill/instruction
      wiring regressions as a prompt diff. F: assert tool JSON-schema gen + arg/result encode↔decode
      per toolkit.
- [ ] Code-side oracle (G): shared, deterministic DB-state / tool-invocation assertion helpers.
      Verdict is always code, never an LLM output — deterministic wherever its inputs are: a
      reproducible pass/fail over the C/D scripted tiers, reused as graded scorers (pass-rate ≥
      threshold) over the A/B/H eval tier. See TESTING.md "Deterministic tiers".

## Phase 2 — grow `@dxos/assistant-evals` (A, B, H)

- [x] **PR #12307 (draft):** first DB-effect scorer + first ported G1 scenario:
      `assistant-evals/src/assertions.ts` (`objectExists(type, predicate)` — dimension-G
      deterministic assertion helper, queries the DB directly rather than trusting the agent's
      `completedCriteria` self-report) and `assistant-evals/src/evals/database.eval.ts` (ported
      from the gated `Database > create and query` scenario). `runner.ts`'s `createEvalRunner`
      gained an optional `dbQuery` hook (overloaded: omit it and the task returns the bare agent
      output unchanged, as before; pass it and the task returns `{ agentOutput, dbQuery }` so a
      scorer can grade the DB effect). Manual-run only for now (`DX_ANTHROPIC_API_KEY` +
      `moon run assistant-evals:evals`) — no CI/schedule yet.
      **Also merged `@dxos/assistant-e2e` into `@dxos/assistant-evals`** (composition-scoped
      package layout — see TESTING.md "Where evals live"): moved `harness.ts` +
      `src/testing/*.test.ts` (the 9 gated e2e files) into `assistant-evals`, deleted the
      `assistant-e2e` package, split the vitest config (`vitest.config.ts` stays flat for
      evalite's hardcoded `.eval.ts` discovery; `vitest.e2e.config.ts` — the former
      `assistant-e2e` config — used explicitly by a hand-written `moon.yml` `:test` task for the
      gated e2e suite), updated `.changeset/config.json`, `tsconfig.all.json`, the
      `agent-e2e-tests`/`regenerate-memoized-llm` skills, and `RELEASE-SPEC.md`'s package table.
      Verified: `moon run assistant-evals:build assistant-evals:lint assistant-evals:test --force`
      green (9 gated e2e files, all correctly skipped without `DX_RUN_LLM_TESTS=1`);
      `evalite run src/evals` and `evalite run src/evals/database.eval.ts` correctly discover
      files. **Two blocking bugs found and fixed, first live scored result obtained:**
      (1) the evalite registry-sync race (see Follow-ups); (2) `createEvalRunner` defaulted
      `skills` to `[]` instead of `getDefaultSkills()` (harness.ts's `agentTest()` convention),
      so the agent had no database tools and failed with "No tools available to complete the
      task" — fixed by extracting `getDefaultSkills` into a shared `src/skills.ts`. With a real
      `DX_ANTHROPIC_API_KEY` (`op run --account braneframe --env-file=.config/.env.1password --
    npx evalite run src/evals/database.eval.ts`), `database.eval.ts` now scores **100%**.
      PR #12307 is functionally verified end-to-end; still draft pending a final ready-for-review
      pass.
- [ ] Port `web-search.test.ts` next as the first tool-match scorer case (checks only the
      `web-search` tool fired), reusing the same `dbQuery`-style hook pattern generalized to
      tool-invocation records rather than DB queries.
- [ ] More scorers: schema-validity, LLM-judge; datasets for comprehension / tool-selection.
- [ ] Pin model versions; pass-rate thresholds; scheduled (nightly/on-demand) run distinct from PR CI.
- [ ] Port remaining highest-value former-G1 scenarios (crm-mailbox, planning, markdown) as H
      integration cases (real model, real ops), non-gating.

## Phase 3 — finish migration & reduce machinery

- [ ] Convert G3 (agent-runtime session) fixtures → scripted-model D tests; delete them.
- [ ] Reduce the memoization layer to the scripted-model primitive; drop prompt-matching /
      canonicalization / closest-match + the dynamic-value suite in memoization.test.ts.
      `TestAiService` stays the seam.

## Follow-ups (out of band)

- [x] **Blocking evals — FIXED:** root-caused the evalite-specific `plugin-routine` registry-sync
      race (`registry-sync.ts:74`, `handler.meta` read before population). Reproduced
      deterministically on a fresh worktree/machine (not sandbox-specific), then bisected the cause
      by toggling config: `assistant-evals/vitest.config.ts` (evalite's hardcoded, flat config) calls
      `PluginImportSource()` with the **default** `include: ['@dxos/**']`, which does not match
      Node subpath imports (`#capabilities`, `#meta`, `#operations`, `#types`, …) — confirmed via
      `IMPORT_SOURCE_DEBUG=1` (`#capabilities -> excluded`, etc.). Those resolve through the plain
      `package.json` "imports" map instead, landing on the compiled `dist/` bundle rather than
      `src/`. `vitest.e2e.config.ts`'s `createNodeProject` (in `vite.base.config.ts`) already passes
      `include: ['@dxos/**', '#*']` — the two configs silently diverged. Plugin-routine's
      `#capabilities` entry bundles five independently-lazy capability modules
      (`app-graph-builder`, `operation-handler`, `registry-sync`, `templates`,
      `trigger-runtime-controller`) into one file via esbuild; under `dist/`, they evaluate eagerly
      together instead of via source's separate `Capability.lazy(() => import(...))` boundaries,
      reordering operation-handler registration relative to registry-sync's atom subscriber and
      producing the `handler.meta` undefined race. **Fix:** added `'#*'` to `vitest.config.ts`'s
      `PluginImportSource` include list, matching `createNodeProject`. Verified by toggling the
      config back and forth — crash reappears without the fix, gone with it, on both
      `database.eval.ts` and `basic.eval.ts`; each now progresses past registration to a real
      `POST https://api.anthropic.com/v1/messages` call, failing only on 401 (no
      `DX_ANTHROPIC_API_KEY` in this sandbox) instead of crashing pre-model-call. `assistant-evals`
      build/lint/test green; `oxfmt --check` clean.
- [ ] Delete the orphaned `.agent/` (singular) directory. Unreferenced by any code, config, or
      tooling (Cursor/VS Code use `.cursor/` → `.agents/` plural); origin PR #10381 example
      workflow/function fixtures, only kept current by mechanical repo-wide refactors. Verify no
      runtime dynamic path load globs it before removing. NOTE: separate concern from the testing
      strategy — do in its own PR.

## Deferred / open questions

- Whether plugin-markdown create/update (largest G2 fixtures) convert cleanly to mocked unit tests
  or need the scripted-model primitive too.
