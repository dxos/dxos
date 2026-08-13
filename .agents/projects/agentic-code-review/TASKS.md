# Agentic Code Review — Tasks

_Resume: Phases 1–2 done; PR #12526 open & green. Phase 3: persistence + self-review done; remaining = PR-comment posting + CI wiring. Uncommitted: none. Last: dogfooded the harness on its own scripts (persisted REVIEW.md), fixed the two catch-swallow findings it raised._

## Phase 0: Design & scaffolding

Capture the architecture and open questions before writing code.

### Tasks

- [x] **Register project + scaffold docs** — registry entry, DESIGN.md, TASKS.md.
- [x] **Resolve open questions** — skill name `agentic-review`; manual/local flow first (PR comments deferred); severity rule-fixed; incremental persistence deferred (store git-ignored). See DESIGN §Open questions.

## Phase 1: Core scripts + rule format

The engine: rule discovery, diff-base resolution, staging, and finalize —
usable manually before any CI wiring.

### Tasks

- [x] **Rule parser** (`lib/mdl.mjs`) — read `.mdl` docs, extract ` ```mdl ` blocks, keep `rule` blocks (`files`,`grep`,`severity`,`scope` + instruction prose); validated; glob base = `.mdl` dir or repo root (`scope`). Rules ride the existing `.mdl` format, not a new extension.
- [x] **Rule discovery** (`lib/discover.mjs`) — `git ls-files '*.mdl'` (tracked + untracked-not-ignored), honoring `.gitignore`; flattens `rule` blocks across files; descriptor `.mdl` (SPEC/PLUGIN) yield none.
- [x] **Diff-base resolution** (`prepare.mjs`) — scan `.agents/reviews/*/REVIEW.md` for finalized reviews whose `commit` is an ancestor of HEAD; newest wins; fallback to merge-base with first main-like ref, then HEAD.
- [x] **`prepare.mjs`** — changed files vs base (committed + staged + unstaged + untracked), intersect with rule globs, apply `grep`, group (one rule × ≤ chunkSize files), write STAGING.md + groups.json manifest + blank REVIEW.md + `groups/NN.md` stubs, print paths + group count + per-group line.
- [x] **Full-project default** — no prior review (and any new rule) scans git-visible files matching the rule; incremental afterward; old diff-only behaviour is `--pr-only`. Persists `rules:` on REVIEW.md.
- [x] **Diagnostic parser** (`lib/diagnostics.mjs`) — parse `# WARN|ERROR \`file:line[:col]\`` + body; dedupe + sort helpers.
- [x] **`finalize.mjs`** — merge fragments into REVIEW.md (sorted, deduped), set `isFinalized: true`, print severity counts.

## Phase 2: Skill packaging

Make Claude own the loop.

### Tasks

- [x] **`SKILL.md`** — workflow: run prepare → read group count → spawn N Sonnet subagents with the per-group brief → wait → run finalize → report. Includes the subagent prompt template and rule-authoring guide.
- [x] **Seed example rules** (`rules/non-negotiables.mdl`, five `rule` blocks, `scope: repo`) — no-sleep-in-test, no-casts, no-compat-shims, private-new-packages, workspace-deps; with an `## Extensions` decl + inline `ext rule` definition.
- [x] **Dogfood** — ran the full harness on a probe with real Sonnet subagents; diagnostics (`as any`, non-null `!`, sleep/setTimeout) landed in REVIEW.md with accurate line numbers.

## Phase 3: PR + CI integration

### Tasks

- [x] **Incremental persistence** — finalized REVIEW.md is committed (transient STAGING/groups.json/groups ignored); base resolution reads the newest finalized ancestor across clones.
- [x] **Self-review rule** — `rules/harness-scripts.mdl` reviews the harness's own `.mjs`; dogfooded (found + fixed two catch-swallow warns), REVIEW.md persisted.
- [x] **Issue ids + RESOLUTION.md** — finalize stamps `<review_id>-<seq>` + rule id on each diagnostic; writes `RESOLUTION.md` (`unresolved|ignored|resolved`); `unresolved.mjs` re-prints open issues across runs (`--path` / `--rule`).
- [ ] **PR comment posting** in `finalize.mjs` — anchor to `file:line` via the GitHub API; idempotent (hidden marker per rule id).
- [ ] **CI wiring** — run on PRs (post comments) and/or nightly on main (summary/issue).

### References

- Brief: `/project new` message (2026-08-09).
- Existing script convention: `scripts/query-logs.mjs`.
- Rule sources: `CLAUDE.md` Non-negotiables, `code-style` skill.
- Skill: `.agents/skills/agentic-review/` (SKILL.md, lib/, scripts/, rules/).

## Phase 4: Resolve baseline findings (PR #12554)

Work the 42 curated `unresolved` findings from `.agents/reviews/50877ea571/RESOLUTION.md`
(branch `claude/agentic-code-review-3wrnts`). Every change verified locally (build/test/lint).

### Done

- [x] **workspace-deps (11)** — `@dxos/*` peerDeps `workspace:*` → `workspace:^`.
- [x] **private-new-packages (1)** → `ignored` (`@fixture/pkg-b` private:false is load-bearing).
- [x] **no-compat-shims (6/6)** — transcription, progress (stale), echo json-serializer,
      echo schema-validator, echo-client echo-handler, plugin-assistant Chat.
- [x] **no-sleep-in-test (7/24)** — async (debounce fake-timers, events sync, persistent-lifecycle
      Trigger); mesh (teleport balancer/framer, rpc, network-manager rtc → `expect.poll`).
- [x] Changeset + `stories-assistant` direct dep on `@dxos/assistant-toolkit` (knip fix).

### Remaining — no-sleep-in-test (17), left `unresolved` (forcing them risks flakiness)

- [ ] **Auto-save / debounced persistence** — need to subscribe to the host "saved" event
      (`automerge-host.ts:188`) instead of the no-flush sleep. Ids: 1420, 1803 (echo-client
      repo-proxy/database), 1986, 2092, 2107, 2159 (echo-host automerge-repo/subduction/documents-synchronizer).
- [ ] **Trivial-assertion + processing wait** — 2158 (documents-synchronizer; assertion is `>= 0`, always true).
- [ ] **Microtask phase-sequencing** — 2136 (collection-synchronizer; setup phases have no exposed signal).
- [ ] **Close-while-reading races** — 279, 281 (feed-store; needs FeedQueue close-event semantics).
- [ ] **Ordering-dependent** — 3376 (blade-runner readable-muxer pushStream spacing).
- [ ] **Negative assertions** (sleep defensible; `expect.poll` would be wrong) + heavy e2e —
      4538 (invitations-handler), 4450 (client-e2e), 4580 (client-services pipeline), 4776 (client edge-recovery).
- [ ] **CI-excluded sync-e2e** — 3626 (plugin-inbox; ECHO query subscription; `sync-e2e` tag excluded from CI).
