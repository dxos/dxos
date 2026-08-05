# Model-fixture tests — design

_Rework the memoized-LLM test framework: own vitest tag, dedicated non-blocking CI
job, rename + relocate fixtures to a hash-addressed store, and recover the deleted
per-skill / assistant-e2e suites under the tag._

## Problem / motivation

The memoized-LLM replay framework records live model turns to per-file
`*.conversations.json` snapshots and replays them offline. Today:

- **Gating is ad-hoc and per-file.** `runMemoizedTests()`
  ([gate.ts](../../../packages/core/compute/ai/src/testing/gate.ts)) is called
  from each suite via `describe.skipIf(!runMemoizedTests())`. Off by default; opt
  in with `DX_RUN_LLM_TESTS=1` or `ALLOW_LLM_GENERATION=1`. The env check is
  scattered into every consumer instead of living in one place.
- **Nothing runs on CI.** The gated suites skip on every PR (no env, no key), so
  there is zero visibility into whether the fixtures still replay. A regression in
  deterministic C/D/E/F code that shifts a prompt only shows up when a developer
  runs the suite locally with the opt-in flag.
- **Fixture storage is coarse and brittle.** One giant append-only
  `*.conversations.json` per test file (several are multi-MB), matched by exact
  structural prompt equality, with a shared per-file ID stream that means a single
  test cannot be regenerated in isolation.
- **Coverage was deleted, not migrated.** The 6 agent e2e scenarios and various
  per-skill memoized suites were removed in favour of on-demand evals, leaving no
  CI-adjacent fixture coverage for those paths.

Background on the current framework and the broader A–L testing strategy:
[ai/TESTING.md](../../../packages/core/compute/ai/TESTING.md),
[ai/DESIGN.md](../../../packages/core/compute/ai/DESIGN.md).

## Current state (starting point, verified 2026-08-05)

- **Engine:**
  [MemoizedAiService.ts](../../../packages/core/compute/ai/src/testing/memoization/MemoizedAiService.ts),
  [MemoizedLanguageModel.ts](../../../packages/core/compute/ai/src/testing/memoization/MemoizedLanguageModel.ts)
  (prompt matching, timestamp/date normalization, dynamic-id canonicalization),
  exposed to consumers through `TestAiService` in
  [test-layers.ts](../../../packages/core/compute/ai/src/testing/test-layers.ts).
- **Gate:** `runMemoizedTests()` — `MemoizedAiService.isGenerationEnabled() ||
DX_RUN_LLM_TESTS ∈ {1,true}`.
- **5 committed caches (~113 KB total):** `ai/.../memoization.conversations.json`,
  `agent-runtime/.../{AgentService,functions}.conversations.json`,
  `agent-runtime/.../assistant-session-tests/{request,xml-response}.conversations.json`.
- **Gated consumers (skip on PR):** `memoization.test.ts`, `functions.test.ts`,
  `request.test.ts`, `AgentService.test.ts`, `xml-response.test.ts`.
- **CI:** [check.yml](../../../.github/workflows/check.yml) runs
  `moon run :test :test-browser :test-storybook :test-workerd --affected`. No env
  key, no `DX_RUN_LLM_TESTS` → memoized suites skip. Evals are in no workflow.
- **Deleted suites to recover** (git `f476c5097a`, "delete the 6 memoized tests
  superseded by evals"), under `assistant-evals/src/testing/`: `crm-mailbox`,
  `database`, `markdown`, `planning`, `smoke`, `web-search`. `@dxos/assistant-e2e`
  retains `harness.ts` + skipped `sandbox` / `inbox-enable` / `local-ai`.

## Goals (the 5 subgoals)

1. **Own vitest tag.** Move the env-variable gating out of scattered `skipIf`
   calls and into a single vitest tag definition (`model-fixture`). The tag is
   **skipped by default**; the env check (regenerate vs replay vs skip) lives in
   the tag config, one place.
2. **Dedicated non-blocking workflow.** A **separate, non-required** GitHub
   workflow (not a job in `check.yml`) that runs **only** the model-fixture tests
   on PRs and reports without gating merge. Selection is by the `model-fixture`
   vitest tag (test-runner query) plus a `model-fixture` **moon tag** (task
   selection).
3. **Rename by surface** (decision 1): `model-fixture` for tag/workflow/labels,
   `LanguageModelFixture` for the Effect module/layer/service (replacing
   `MemoizedAiService` / `MemoizedLanguageModel`), regenerate flag
   `LanguageModelFixtureUpdate`-style, `conversations` kept only as the store dir.
   No compatibility shims — update every call site in the same change.
4. **Hash-addressed fixture store.** Relocate fixtures from per-file
   `*.conversations.json` to:
   ```
   <repo-root>/.store/conversations/<suite>/<hash>.json
   ```
   - `<suite>` = the test-suite path flattened to **one path segment** (a single
     dir name, e.g. `packages_core_compute_ai_...` or a stable slug per suite).
   - `<hash>` = hash of the request → **O(1) lookup** by request hash on replay.
   - Candidate / diff scanning (regeneration, closest-match on a miss) scans the
     whole `<suite>` directory.
5. **Recover deleted suites.** Git-dig and restore the deleted per-skill suites +
   `assistant-e2e` scenarios (and anything else found), port them onto the new
   store + tag, and include them under the model-fixture tag.

## Decisions (resolved 2026-08-05)

1. **Naming — split by surface.**
   - `model-fixture` — the vitest tag, the moon tag, the CI workflow/job name,
     and any user-facing label.
   - `LanguageModelFixture` — the Effect module, layer, and service identifiers
     (replacing `MemoizedAiService` / `MemoizedLanguageModel`). Regenerate flag →
     `LanguageModelFixtureUpdate`-style naming.
   - `conversations` — **only** the on-disk store directory
     (`.store/conversations/…`). Do not rename the store noun.
2. **`<suite>` segment encoding — automatic.** Derive the single path segment
   mechanically from the test-suite file path (path-flatten). No hand-declared
   slugs.
3. **Hash input — the match key.** Hash exactly the fields the replay matcher
   compares a request against today, **after prompt normalization** (the existing
   timestamp/date + dynamic-id canonicalization). The hash is a pure function of
   the normalized match key, so lookup and today's equality match agree by
   construction. → Audit `MemoizedLanguageModel`'s current match predicate and
   hash precisely those normalized fields.
4. **CI — a separate, non-required workflow.** Not a job inside `check.yml`; a new
   standalone workflow file that runs the `model-fixture` moon+vitest selection on
   PRs and is **not** a required check (so it reports without blocking merge).
5. **`.store/` — committed.** Fixtures are committed to git (as today's caches
   are), so the CI workflow and local replay both see them without a build step.
6. **Recovery scope — the 3-week dig below.** The full inventory is enumerated in
   the next section; that is the recovery target.

## Recovery inventory (subgoal 5, verified 2026-08-05)

Seeded from every `*.conversations.json` path in the last 3 weeks, then widened to
every deleted `*.test.ts` whose historical content referenced the memoized layer.
**12 deleted memoized-LLM suites** to recover, in two groups:

**Group A — agent e2e scenarios (6).** Deleted `addbdf5fae` (2026-07-23, port to
evals) under `assistant-e2e/src/testing/`; a byte-identical copy was also deleted
`f476c5097a` (2026-07-22) under `assistant-evals/src/testing/` (the packages were
mid-rename). Recover one canonical copy each:

- `crm-mailbox.test.ts` (83 L) · `database.test.ts` (44 L) · `markdown.test.ts`
  (66 L) · `planning.test.ts` (50 L) · `smoke.test.ts` (45 L) ·
  `web-search.test.ts` (34 L)
- Fixtures for these were dropped earlier in `531def85fd` (2026-07-21) — the
  fixtures must be regenerated (`LanguageModelFixtureUpdate`), not restored.

**Group B — per-skill / per-operation memoized suites (6).** Deleted `be35baf312`
(2026-07-28, "G2 → C" deterministic-unit conversion):

- `assistant-toolkit/src/skills/agent/skill.test.ts`
- `assistant-toolkit/src/skills/database/skill.test.ts`
- `assistant-toolkit/src/skills/memory/skill.test.ts`
- `assistant-toolkit/src/skills/planning/skill.test.ts`
- `plugin-magazine/src/operations/curate-magazine.skill.test.ts`
- `plugin-markdown/src/operations/update.test.ts`

**Not deleted — fixture dropped but the suite was converted (do NOT recover as
deleted; they exist as scripted/unit tests):** `AiSummarizer.test.ts`,
`run-instructions.test.ts`, `plugin-assistant/AssistantPlugin.test.ts`,
`plugin-markdown/operations/create.test.ts`. A memoized variant could optionally
be re-added under the tag, but they are not recovery targets.

**Excluded false positives** (matched the grep on `createComposerTestApp`, not
LLM fixtures): `plugin-deck/DeckPlugin.test.ts`, `plugin-navtree/NavTreePlugin.test.ts`,
`plugin-tictactoe/TicTacToePlugin.test.ts`.

**Out of the 3-week window (not in scope, flagged for a deeper dig if wanted):**
the pre-rename `assistant-toolkit/src/blueprints/*/blueprint.conversations.json`
era, `conductor/.../gpt`, `plugin-assistant/.../trace-timeline`,
`skills/database/agent-firewall`.

## Approach (high-level, refine per phase)

- **Phase 1 (tag):** define the vitest tag + config-level env gate; convert the 5
  existing consumers from `skipIf(runMemoizedTests())` to the tag. Add the moon
  tag to the owning packages. No behaviour change yet — still skipped by default.
- **Phase 2 (CI):** add a separate, non-required `model-fixture` workflow (its own
  file), selecting by moon tag + vitest tag query.
- **Phase 3 (rename):** mechanical rename across engine, seam, flags, docs.
- **Phase 4 (store):** implement `.store/conversations/<suite>/<hash>.json`,
  migrate the 5 caches, delete the old `*.conversations.json` reader/writer.
- **Phase 5 (recover):** restore deleted suites, port to the new store + tag.

Sequencing note: **3 (rename)** is cheapest right after **1** and before **4**
touches storage; **5** depends on **4** (recovered suites should land on the new
store), and on **2** (so they actually run in the CI job).

## References

- Gate: [gate.ts](../../../packages/core/compute/ai/src/testing/gate.ts)
- Engine: [memoization/](../../../packages/core/compute/ai/src/testing/memoization/)
- Strategy: [ai/TESTING.md](../../../packages/core/compute/ai/TESTING.md)
- CI: [check.yml](../../../.github/workflows/check.yml)
- Deleted suites: `git show f476c5097a`
