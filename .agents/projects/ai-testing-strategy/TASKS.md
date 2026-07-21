# AI Testing Strategy — Tasks

Design: [`packages/core/compute/ai/TESTING.md`](../../../packages/core/compute/ai/TESTING.md).
PRs: [#12287](https://github.com/dxos/dxos/pull/12287) (design doc, MERGED);
[#12291](https://github.com/dxos/dxos/pull/12291) (Phase 1 steps 1-3 — de-gate G2/G3 + scripted
`LanguageModel` primitive + `AiRequest` loop (D) tests; CodeRabbit nits addressed
(`test`+context-`expect`, helpers below `describe`); Check GREEN, auto-merge enabled).

Goal: replace the memoized-LLM e2e strategy with a tier per conversation dimension —
deterministic unit tiers (C/D/E/F/G) gating CI, graded model-pinned evals (A/B/H via
`@dxos/assistant-evals`) out-of-band — and retire the current frozen-conversation replay
as primary coverage.

## Consumer groups (see TESTING.md "Consumer inventory")

- **G1** — pure agent e2e (`@dxos/assistant-e2e`): database, crm-mailbox, web-search, planning,
  markdown, smoke. Leaf package, redundant C/D signal, ~7.5 MB fixtures. **Revised: keep, gate
  behind `runMemoizedTests()` like G2/G3 (see Phase 1 below) — not deleted.** These stay available
  as opt-in live/eval-style tests and as design inspiration for later tiers.
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

- [x] De-gate G2/G3 memoized replay from the default `:test` path. **Mechanism chosen:** env-gated
      `describe.skip`. `runMemoizedTests()` (new `ai/src/testing/gate.ts`, re-exported from
      `@dxos/ai/testing` and `@dxos/agent-runtime/testing`) is false by default, so each memoized
      suite is `runMemoizedTests() ? describe : describe.skip`. Runs only when `DX_RUN_LLM_TESTS=1`
      or `ALLOW_LLM_GENERATION=1` (regeneration). Reversible, no deletion, per-suite (co-located
      non-LLM tests — planning `hasIncompleteTasks`, AssistantPlugin module-activation boot — keep
      running). Gated: 14 files (G2: run-instructions, {agent,database,memory,planning} skills,
      markdown create/update, magazine, AssistantPlugin ×3 tests, AiSummarizer; G3: functions,
      AgentService, request, xml-response). Left running: `memoization.test.ts` (tests the machinery
      itself), G1 `assistant-e2e` (own harness — deleted in a later step, not de-gated here).
- [x] **Revised plan (superseded "delete G1" below):** rather than deleting `assistant-e2e`,
      extended the same `runMemoizedTests()` gate to it — cheaper, reversible, and keeps the
      suites runnable locally as live/eval tests + design inspiration, per direct guidance. Gated
      all 6 behavioral files (crm-mailbox, database, markdown, planning, smoke, web-search) with
      `describeMemoized`. Also swept `ai/testing/memoization/memoization.test.ts`: the 5 tests that
      call through to a real model (generate a poem, tools, tools with encoding, provider-defined
      tool, works with tool calsl) are now gated per-test (`itMemoized`); the `dynamic value
      matching` describe block (pure canonicalization/matching logic, no model call) stays ungated
      — it was the one legitimate "tests the machinery, not behavior" exception. Removed all 21
      committed `.conversations.json` fixtures repo-wide (the loader falls back to an empty store
      when the file is missing, so this only affects tests actually run under the flag — they
      re-record fresh, uncommitted, when run locally with `ALLOW_LLM_GENERATION=1`). Verified: build
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

- [ ] Scorers: tool-match, schema-validity, DB-effect, LLM-judge; datasets for comprehension /
      tool-selection (former G1 scenarios).
- [ ] Pin model versions; pass-rate thresholds; scheduled (nightly/on-demand) run distinct from PR CI.
- [ ] Port highest-value former-G1 scenarios as H integration cases (real model, real ops), non-gating.

## Phase 3 — finish migration & reduce machinery

- [ ] Convert G3 (agent-runtime session) fixtures → scripted-model D tests; delete them.
- [ ] Reduce the memoization layer to the scripted-model primitive; drop prompt-matching /
      canonicalization / closest-match + the dynamic-value suite in memoization.test.ts.
      `TestAiService` stays the seam.

## Follow-ups (out of band)

- [ ] Delete the orphaned `.agent/` (singular) directory. Unreferenced by any code, config, or
      tooling (Cursor/VS Code use `.cursor/` → `.agents/` plural); origin PR #10381 example
      workflow/function fixtures, only kept current by mechanical repo-wide refactors. Verify no
      runtime dynamic path load globs it before removing. NOTE: separate concern from the testing
      strategy — do in its own PR.

## Deferred / open questions

- Exact de-gating mechanism (env flag vs moon tag vs skip) — decide in Phase 1 step 1.
- Whether plugin-markdown create/update (largest G2 fixtures) convert cleanly to mocked unit tests
  or need the scripted-model primitive too.
