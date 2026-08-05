# Model-fixture tests — Tasks

_Resume: Phase 0 decisions all resolved (see DESIGN.md §Decisions). Start Phase 1 (define the `model-fixture` vitest tag + move env-gating into the tag config). Uncommitted: registry.yml + this project's DESIGN.md/TASKS.md — about to PR the scaffold. Last: recovery inventory of 12 deleted suites verified._

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

- [ ] **Define the vitest tag** with env-gating (regenerate / replay / skip) in the tag config, one place.
- [ ] **Convert the 5 consumers** (`memoization`, `functions`, `request`, `AgentService`, `xml-response`) from `skipIf` to the tag.
- [ ] **Add the moon tag** to the owning packages' `moon.yml` for task-level selection.
- [ ] **Verify default-skip** — `moon run <pkg>:test` still skips these with no env set.

## Phase 3: Rename memoized-llm → model-fixture (subgoal 3)

Do the rename before Phase 4 touches storage. No compat shims.

### Tasks

- [ ] **Rename engine** — `MemoizedAiService` / `MemoizedLanguageModel` and the `memoization/` dir.
- [ ] **Rename the seam + flags** — `TestAiService` wiring, `DX_RUN_LLM_TESTS` / `ALLOW_LLM_GENERATION` (decide new names).
- [ ] **Update docs** — `ai/TESTING.md`, `ai/DESIGN.md`, `regenerate-memoized-llm` skill, CLAUDE.md/memory references.
- [ ] **Update every call site** in the same change (repo rule).

## Phase 2: Separate non-required workflow (subgoal 2)

A standalone workflow file running only model-fixture tests on PRs, non-required.

### Tasks

- [ ] **Add `.github/workflows/model-fixture.yml`** selecting by `model-fixture` moon tag + vitest tag query; PR-triggered.
- [ ] **Keep it non-required** — reports on the PR but is not in the required-checks set, so it never blocks merge.
- [ ] **Fixtures are committed** (Phase 0) — no build step needed for the workflow to replay.
- [ ] **Verify on a PR** — workflow runs, reports, does not gate merge.

## Phase 4: Hash-addressed fixture store (subgoal 4)

`<repo-root>/.store/conversations/<suite>/<hash>.json` — O(1) request-hash lookup;
dir scan for candidate/diff on miss/regeneration.

### Tasks

- [ ] **Implement the store** — write/read `<suite>/<hash>.json`; hash = request hash (Phase 0 decision).
- [ ] **Replay = O(1) lookup** by hash; **miss/regenerate = scan the `<suite>` dir** for closest-match/diff.
- [ ] **Migrate the 5 caches** from `*.conversations.json` into the new layout.
- [ ] **Delete the old reader/writer** and the `*.conversations.json` files.
- [ ] **Regenerate to validate** — `ALLOW_LLM_GENERATION` path (new flag) round-trips through the store.

## Phase 5: Recover deleted suites (subgoal 5)

Inventory DONE — 12 suites verified (DESIGN.md §Recovery inventory). Restore onto
the new store + tag.

### Tasks

- [x] **Git-dig complete** — seeded from all 3-week `*.conversations.json`, widened to every deleted `*.test.ts` referencing the memoized layer. 12 suites; 3 false positives excluded.
- [ ] **Recover Group A — 6 e2e scenarios** from `addbdf5fae^` (`assistant-e2e/src/testing/`): `crm-mailbox`, `database`, `markdown`, `planning`, `smoke`, `web-search`. Fixtures dropped in `531def85fd` → **regenerate**, don't restore.
- [ ] **Recover Group B — 6 skill/op suites** from `be35baf312^`: `skills/{agent,database,memory,planning}/skill.test.ts`, `plugin-magazine/.../curate-magazine.skill.test.ts`, `plugin-markdown/operations/update.test.ts`.
- [ ] **Reconcile against existing coverage** — Group B skills now have deterministic unit tests; Group A has evals. Recover as fixture-replay _alongside_, not replacing.
- [ ] **Port each onto the new store + tag**; regenerate fixtures via `LanguageModelFixtureUpdate`.
- [ ] **Confirm** they run in the model-fixture workflow and skip by default locally.
- [ ] **(Optional/backlog)** deeper dig outside the 3-week window — `blueprints/*`, `conductor/gpt`, `trace-timeline`, `database/agent-firewall`.

## References

- [DESIGN.md](./DESIGN.md) — spec + current-state audit + open decisions.
- [ai/TESTING.md](../../../packages/core/compute/ai/TESTING.md) — A–L testing strategy.
- `git show f476c5097a` — the delete-6-memoized-tests commit.
