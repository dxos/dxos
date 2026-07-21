# AI Testing Strategy — Tasks

Design: [`packages/core/compute/ai/TESTING.md`](../../../packages/core/compute/ai/TESTING.md).
PR: [#12287](https://github.com/dxos/dxos/pull/12287) (draft — design doc only).

Goal: replace the memoized-LLM e2e strategy with a tier per conversation dimension —
deterministic unit tiers (C/D/E/F/G) gating CI, graded model-pinned evals (A/B/H via
`@dxos/assistant-evals`) out-of-band — and retire the current frozen-conversation replay
as primary coverage.

## Consumer groups (see TESTING.md "Consumer inventory")

- **G1** — pure agent e2e (`@dxos/assistant-e2e`): database, crm-mailbox, web-search, planning,
  markdown, smoke. Leaf package, redundant C/D signal, ~7.5 MB fixtures. **Delete + boot-smoke.**
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

- [ ] De-gate G2/G3 memoized replay from the default `:test` path (env flag / tag / describe.skip).
- [ ] Extract a scripted `LanguageModel` primitive from `MemoizedLanguageModel` (given a call →
      scripted parts/tool-calls; no prompt-matching, no file I/O). Substrate for D + G1 boot-smoke.
- [ ] Harness (D) unit tests on the scripted model: tool-call→result→continue, stop, max-iterations,
      tool error, malformed output.
- [ ] Delete G1 (`@dxos/assistant-e2e`) + fixtures; replace with one scripted-model boot-smoke
      (full plugin composition boots, trivial 1-tool task completes).
- [ ] Convert G2 → deterministic mocked C unit tests; golden-args fixture convention; delete each
      G2 fixture once its unit test lands.
- [ ] Context-assembly (E) + schema round-trip (F) tests.
- [ ] Code-side oracle (G): DB-state / tool-invocation assertion helpers.

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

## Deferred / open questions

- Exact de-gating mechanism (env flag vs moon tag vs skip) — decide in Phase 1 step 1.
- Whether plugin-markdown create/update (largest G2 fixtures) convert cleanly to mocked unit tests
  or need the scripted-model primitive too.
