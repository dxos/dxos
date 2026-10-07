# Model-fixture tests — Tasks

_Resume: Phases 1–4 DONE and pushed on PR #12475 (branch `claude/model-fixture-tests-phases-b32q1r`; base main). Verified: model-fixture suites skip by default; migrated fixtures replay green from `.store/conversations/<suite>/<hash>.json`; format-check clean; the non-required `model-fixture` workflow triggers on the PR. Env flags: `DX_RUN_MODEL_FIXTURE_TESTS` (replay) / `DX_UPDATE_MODEL_FIXTURES` (regenerate). Engine consolidated into the `LanguageModelFixture` namespace (src/testing/model-fixture/). NEXT: Phase 5 (recover the 12 deleted suites) — restore per-suite with compile verification, regenerating Group A fixtures via live LLM; keep each restored file behind the tag so a missing fixture never breaks the default build._

Rework the memoized-LLM test framework. Spec + current-state audit + resolved
decisions + recovery inventory live in [DESIGN.md](./DESIGN.md). Five subgoals,
sequenced 1 → 3 → 2 → 4 → 5.

## Phase 0: Decisions — DONE

All resolved 2026-08-05; details in [DESIGN.md](./DESIGN.md) §Decisions.

### Tasks

- [x] **Naming** — `model-fixture` (tag/workflow/labels), `LanguageModelFixture` (Effect module/layer), `conversations` (store dir only).
- [x] **`<suite>` encoding** — automatic (path-flatten), no manual slugs.
- [x] **Hash input** — the normalized match key (exactly the fields the replay matcher compares, after prompt normalization).
- [x] **`.store/` git policy** — committed.
- [x] **CI mechanism** — separate, non-required workflow (not a job in check.yml).
- [x] **Recovery scope** — the verified 3-week inventory (12 suites; see Phase 5).

## Phase 1: Own vitest tag (subgoal 1)

Move env-gating out of scattered `skipIf(runMemoizedTests())` into a single vitest
tag config; tag skipped by default.

### Tasks

- [x] **Define the vitest tag** with env-gating (regenerate / replay / skip) in the tag config, one place.
- [x] **Convert the 5 consumers** (`memoization`, `functions`, `request`, `AgentService`, `xml-response`) from `skipIf` to the tag.
- [x] **Add the moon tag** to the owning packages' `moon.yml` for task-level selection.
- [x] **Verify default-skip** — `moon run <pkg>:test` still skips these with no env set.

## Phase 3: Rename memoized-llm → model-fixture (subgoal 3)

Do the rename before Phase 4 touches storage. No compat shims.

### Tasks

- [x] **Rename engine** — `MemoizedAiService` / `MemoizedLanguageModel` and the `memoization/` dir.
- [x] **Rename the seam + flags** — `TestAiService` wiring, `DX_RUN_LLM_TESTS` / `ALLOW_LLM_GENERATION` (decide new names).
- [x] **Update docs** — `ai/TESTING.md`, `ai/DESIGN.md`, `regenerate-memoized-llm` skill, CLAUDE.md/memory references.
- [x] **Update every call site** in the same change (repo rule).

## Phase 2: Separate non-required workflow (subgoal 2)

A standalone workflow file running only model-fixture tests on PRs, non-required.

### Tasks

- [x] **Add `.github/workflows/model-fixture.yml`** selecting by `model-fixture` moon tag + vitest tag query; PR-triggered.
- [x] **Keep it non-required** — reports on the PR but is not in the required-checks set, so it never blocks merge.
- [x] **Fixtures are committed** (Phase 0) — no build step needed for the workflow to replay.
- [x] **Verify on a PR** — workflow runs, reports, does not gate merge.

## Phase 4: Hash-addressed fixture store (subgoal 4)

`<repo-root>/.store/conversations/<suite>/<hash>.json` — O(1) request-hash lookup;
dir scan for candidate/diff on miss/regeneration.

### Tasks

- [x] **Implement the store** — write/read `<suite>/<hash>.json`; hash = request hash (Phase 0 decision).
- [x] **Replay = O(1) lookup** by hash; **miss/regenerate = scan the `<suite>` dir** for closest-match/diff.
- [x] **Migrate the 5 caches** from `*.conversations.json` into the new layout.
- [x] **Delete the old reader/writer** and the `*.conversations.json` files.
- [x] **Regenerate to validate** — `DX_UPDATE_MODEL_FIXTURES` path round-trips through the store.

## Phase 5: Recover deleted suites (subgoal 5)

Inventory DONE — 12 suites verified (DESIGN.md §Recovery inventory). Restore onto
the new store + tag.

### Tasks

- [x] **Scope decision** — model-fixture coverage stays focused on **harness** (agent-runtime `AgentService` / `assistant-session` / `functions`, plus the `ai` engine) + **core skills** (`memory`, `database`). Plugin-operation and assistant-e2e agent suites are out of scope; their deterministic per-operation tests already live on `main` and stay.
- [x] **Kept (core set)** — forced to **sonnet** (`com.anthropic.model.claude-sonnet-4-6.default`), fixtures regenerated live and replay green:
  - `ai` engine `LanguageModelFixture.test.ts`; agent-runtime `AgentService` / `assistant-session-tests/{request,xml-response}` / `functions`.
  - `assistant-toolkit skills/{memory,database}/skill.test.ts`.
- [x] **Removed (out of scope)** — deleted the suites + their fixtures and dropped the stale `model-fixture` moon tag from the packages:
  - `assistant-e2e/src/testing/{database,smoke,web-search}.test.ts` (agent harness e2e).
  - `plugin-magazine/.../curate-magazine.skill.test.ts`, `plugin-markdown/operations/update.test.ts` (plugin operations; `curate-magazine.test.ts` / `update-markdown.test.ts` on `main` keep deterministic coverage).
- [ ] **Deferred, reasons:**
  - `assistant-toolkit skills/planning/skill.test.ts` — **in-scope core skill**, but its old test targeted the removed `Plan` type (now an `Outline` model in `@dxos/types`; `Chat.ensurePlan`/`Chat.plan`/`Plan.hasIncompleteTasks` gone). Needs a semantic rewrite against the `Outline` API — tracked as the next follow-up. `planning/operations/plan-reminder.test.ts` covers today's behavior meanwhile.
  - `assistant-toolkit skills/agent/skill.test.ts` — same removed-`Plan` dependency.
- [ ] **(Optional/backlog)** deeper dig outside the 3-week window — `blueprints/*`, `conductor/gpt`, `trace-timeline`, `database/agent-firewall`.

## Reviewer follow-ups (not blocking this PR)

- [x] **Strip provider transport metadata from committed fixtures** — recorded parts carried the raw
      Anthropic HTTP envelopes (`request` on `response-metadata`, `response` on `finish`): account and
      trace identifiers (`anthropic-organization-id`, `anthropic-workspace-id`, `cf-ray`, `request-id`,
      `traceparent`/`b3`) plus per-request rate-limit state, none of which replay reads. Dropped at the
      store-write boundary in `LanguageModelFixture` and rewritten in place across the 77 affected
      records by `tools/codemods/strip-model-fixture-transport.mjs`. Hashes key on parameters + prompt,
      so no fixture moved and no regeneration was needed.
- [x] **`query` tool `in`-example bug** (`assistant-toolkit .../database/operations/definitions.ts`) — the
      description's example showed nested object refs (`{"/": "echo://…"}`) for `in`, but the param decodes
      only plain URI strings, so the model copied the wrong shape and burned a retry on every scoped query.
      Example rewritten to URI strings. All three JSON examples in the description are now valid: the
      "Financial report" one was missing a comma and the "Cyberdyne" one had a trailing comma (the latter
      caught by CodeRabbit on #12576). A repo-wide sweep of `<example>` blocks under `src/skills/**` finds
      no other malformed one.
      The database-skill suite was regenerated with `DX_UPDATE_MODEL_FIXTURES=1`; all 54 pre-change records
      are stale and deleted (replay is green on the 52 new ones alone), and no fixture now records an
      `Expected string at ["in"][0]` retry.
- [ ] **`query` tool quotes `limit`** — the model frequently emits `"limit": "10"` (a JSON string), which
      `Schema.Number` rejects with `SchemaError: Expected number at ["limit"]`. Pre-existing and independent
      of the `in` fix — present in 8 fixtures before it and 8 after. It blocks the one call that
      `query operation: in param can be passed as string` exists to assert, so that test still never reaches
      the string→`Ref` coercion (the two agent-driven `in` tests do exercise it successfully). Fixing it means
      a coercible `limit` schema, which re-hashes the tool parameters and needs another coordinated regen.
- [ ] **`toolChoice as any` / `params.tools as never[]`** (`LanguageModelFixture.ts` record path) — external `@effect/ai` generic-variance at the untyped-tool-list → typed-`Toolkit` boundary; only runs under `DX_UPDATE_MODEL_FIXTURES`. A true source fix means reconstructing tool types from the stored JSON schemas.

## References

- [DESIGN.md](./DESIGN.md) — spec + current-state audit + open decisions.
- [ai/TESTING.md](../../../packages/core/compute/ai/TESTING.md) — A–L testing strategy.
- `git show f476c5097a` — the delete-6-memoized-tests commit.
