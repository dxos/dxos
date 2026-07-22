# AI Testing Strategy — Tasks

_Resume: **the G1 migration is now fully complete** — all 6 scenarios ported to scored evals (all
passing live at 100%, planning's haiku-quality criterion backed by a real LLM-judge), and the 6
corresponding `src/testing/*.test.ts` files are **deleted** (their memoized-replay fixtures were
already gone, so keeping them was pure duplication of a strictly weaker self-reported check). PR
#12307 is functionally verified end-to-end — next is to mark it ready for review. Uncommitted:
none, pushed to `claude/ai-testing-strategy-9ctzjt` through commit `f476c5097a`, CI green. Last:
deleted the 6 redundant test files; added `TODO(wittjosiah): migrate to an eval` to the 3 files
that remain (`inbox-enable` — blocked on a real inbox-skill registry bug; `local-ai` — needs an
`inferenceProvider` option on `createEvalRunner`; `sandbox` — needs `randomEntityIds`/`sandbox`/
`clientTypes` options, plus a live external service); updated `TESTING.md`'s G1 sections and the
package `README.md` to reflect the migration as done rather than planned. Earlier this session:
built `src/judge.ts` (native LLM-judge via `@dxos/ai`'s `LanguageModel.generateObject`, not
autoevals' OpenAI-coupled classifiers), wired into `planning.eval.ts` with a demonstrated failure
case; confirmed by direct experiment that the two-vitest-config split can't be collapsed into one
`projects`-based config (silently drops root-level `plugins`/`testTimeout`, reopening the
registry-sync race); renamed the `agent-e2e-tests` skill to `agent-eval-tests`, refocused on the
eval-writing pattern with a "Legacy" section for the (now much smaller) gated-test surface._

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

- **G1** — pure agent e2e, formerly `@dxos/assistant-e2e`, merged into `@dxos/assistant-evals` in
  #12307 (see TESTING.md "Where evals live"): database, crm-mailbox, web-search, planning, markdown,
  smoke. Redundant C/D signal, ~7.5 MB fixtures. **Revised twice, now done for real:** #12297 kept
  it gated in place instead of deleting it; once every scenario had a scored eval covering the same
  ground (this session), the gated `src/testing/*.test.ts` files were finally deleted — their
  memoized-replay fixtures were already gone, so they'd degraded to pure duplication of a weaker
  (self-reported) check.
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
      `DX_ANTHROPIC_API_KEY` (pulled from the CI Vault via 1Password's `op run`),
      `database.eval.ts` now scores **100%**. PR #12307 is functionally verified end-to-end,
      still draft pending a final ready-for-review pass.
- [x] **Ported the remaining 5 G1 scenarios, easiest → hardest, each verified live and committed
      individually:**
  - [x] `smoke.eval.ts` — trivial (no DB, no skills); needed one new `createEvalRunner` option,
        `expect: 'failure'` (`Effect.runPromiseExit` instead of `runAndForwardErrors`, resolving
        `{ failed: boolean }` so a scorer can grade an intentional failure as a pass — previously
        any failure just threw out of the eval task before a scorer ran). Also hit an evalite
        storage bug: with no output requested, `completeJob` resolves `agentOutput` to `undefined`,
        and evalite's SQLite storage rejects storing an undefined/null task result — coerced to
        `{}` in the eval file rather than widening runner.ts's general contract. Both scored 100%.
  - [x] `markdown.eval.ts` — pure DB-state (doc exists; exact final content after an Update-op
        append), same `dbQuery`/`objectExists` pattern as `database.eval.ts`. Added `findObject`
        (same query, returns the match instead of a boolean) to `assertions.ts` to load the found
        doc's `content` ref. "draft a document"'s free-form title/content narrows the check to "a
        doc exists" — the process criteria (which skill/tool was used) aren't checkable without
        tool-invocation tracking. Both scored 100%.
  - [x] `crm-mailbox.eval.ts` — all 4 criteria are DB/relation state (Person, Organization, Employer
        relation + role field); `Employer.Employer` was already in `runner.ts`'s default
        `ClientPlugin` types, so no new plumbing needed — `Relation.getSource`/`getTarget` resolve
        the relation's endpoints directly. Incidentally fixed an unrelated timeout: evalite defaults
        to a 30s per-eval timeout unless vitest config overrides it
        (`config.test.testTimeout ??= 30_000` in evalite's `run-evalite.js`); this scenario's
        multi-tool research (web search + CRM tools + image attach) routinely exceeds that — raised
        `vitest.config.ts`'s `testTimeout` to `360_000` (benefits every eval in the file). Scored
        100% in ~95s.
  - [x] `web-search.eval.ts` — the first tool-match scorer (Phase 2 item below). Built the
        tool-invocation tracking flagged as a follow-up when this project resumed:
        `assertions.ts` gains `completedBlocks()` (reads every `CompleteBlock` event off the
        space's trace feed — durable, already produced by `RunInstructions` via `RoutinePlugin`'s
        `FeedTraceSinkSpec` with zero wiring changes) and `toolInvocations()` (pairs
        `toolCall`/`toolResult` blocks by `toolCallId`). Required adding `@dxos/compute-runtime` as
        a workspace dependency (for `FeedTraceSink`). "Capital of France returned" grades a plain
        string match on the assistant's chat text (no LLM judge needed); "only web-search used"
        grades that exactly one non-`completeJob` tool fired. First attempt matched the literal
        string `'web_search'` and scored 50% — the actual recorded tool name is `'AnthropicWebSearch'`
        (the toolkit name, not the provider name), found by inspecting
        `node_modules/.evalite/cache.sqlite`'s `results` table directly. Fixed to a normalized
        substring match; scored 100%.
  - [x] `planning.eval.ts` — hardest: required new `sessionChat` support in `createEvalRunner`
        (planning's `update-tasks` operation hard-requires a bound `Chat` via
        `Chat.getFromContext`; the plan lives at `Chat.plan`) mirroring `harness.ts`'s
        `agentTest({ sessionChat: true })`. Enriched `ToolInvocation` with `operationKey` (the
        stable `dxn:org.dxos.function.*` key backing an Operation-invoked call, vs. `name`, a
        display name that varies — per web-search's surprise). Graded: exactly 3 tasks exist and
        all done (`findObject(Plan.Plan, ...)`), `update-tasks` was actually invoked (≥3 times,
        matched on `operationKey`), the plan was never written via a raw `objectCreate`/
        `objectUpdate` call (the "did not manipulate objects directly" criterion). First attempt
        scored 80% — matched the bare operation key; the actual key has a `dxn:` prefix, found the
        same cache.sqlite-inspection way as web-search's mismatch. Originally narrowed "3-line
        haiku per topic" to "topic mentioned in the response" pending an LLM judge — **now uses a
        real judge, see below.** Scored 100%.
- [x] **Native LLM-judge scorer, `src/judge.ts`:** `judge(rubric, content)` using `@dxos/ai`'s own
      `LanguageModel.generateObject` (Anthropic, schema-typed `{ pass, reasoning }` verdict) —
      deliberately not autoevals' built-in classifiers (Factuality/ClosedQA/Battle/etc. are
      hardcoded to an OpenAI-shaped client; using them here would need a separate OpenAI key or
      Braintrust's proxy, neither wired up in this repo). Uses `claude-haiku-4-5` (grading is
      classification, not generation — a fast/cheap model is enough). Wired into
      `planning.eval.ts`'s haiku-quality check, replacing the keyword-heuristic proxy. Added a
      second case in the same file (not a separate meta-test file, and not converting other evals
      to use it — deliberately scoped to this one example per direct guidance) demonstrating the
      judge correctly _fails_ a hand-crafted malformed transcript against the same rubric — a
      judge that only ever passes is worthless as a scorer. Verified live: real scenario 100% (5/5
      criteria), malformed-transcript case correctly fails with substantive reasoning.
      **Investigated but rejected in the same session:** collapsing the two vitest configs
      (`vitest.config.ts` for evalite, `vitest.e2e.config.ts` for gated tests) into one
      `projects`-based file — confirmed by direct experiment (renaming the file, adding a
      `projects` array) that vitest's `projects` don't inherit root-level `plugins`/`testTimeout`,
      so this would silently reopen the registry-sync race. Keeping the two-file split.
- [ ] More scorers: schema-validity; datasets for comprehension / tool-selection.
- [ ] Pin model versions; pass-rate thresholds; scheduled (nightly/on-demand) run distinct from PR
      CI — **explicitly deferred for now, per direct instruction.**
- [ ] **Stop naming the exact skill(s) to enable in eval prompts — write realistic user prompts and
      let the agent self-discover, for every eval, not just the two already switched.** An
      experiment this session (uncommitted edits, live-run, then reverted/kept per direct review)
      removed the "Enable the X skill using the skill manager" instruction from all 4 evals that
      had one, to see whether the agent could still find and enable the right skill on its own:
  - `planning.eval.ts` and `markdown.eval.ts` scored **100%** with no explicit skill mention — kept
    permanently.
  - `crm-mailbox.eval.ts` (75%) and `web-search.eval.ts` (50%) were **reverted** — not because the
    agent failed to self-discover (in both cases it correctly found and enabled every skill it
    needed, unprompted), but because the point losses were **scorer artifacts** unrelated to
    discovery: `crm-mailbox`'s `employerRoleCorrect` does an exact string match on `role ===
'Founding Engineer'`, and the agent wrote `'Founding Engineer & Product Manager'` (more
    complete, not wrong); `web-search`'s `onlyWebSearchUsed` assumes zero discovery overhead, but
    self-discovery costs real extra tool calls (list/enable-skills) the check never accounted
    for. **Before re-attempting these two:** loosen `employerRoleCorrect` to a substring/contains
    check instead of exact equality, and change `onlyWebSearchUsed` to allow skill-management
    tool calls (`enable-skills`, `query-skills`, etc.) alongside `web-search`, only failing if a
    _different task_ tool was used. Once those scorers are fixed, drop the explicit skill
    mentions from both prompts the same way and re-verify live.

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
