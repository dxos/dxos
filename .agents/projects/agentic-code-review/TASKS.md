# Agentic Code Review — Tasks

_Resume: Phases 1–2 built + dogfooded with real Sonnet subagents; open PR. Next: Phase 3 — PR-comment posting in finalize.mjs + CI wiring. Uncommitted: none (pending commit of the skill). Last: implemented the harness (lib + prepare/finalize + seed rules + SKILL.md); switched rule ext `.mdl`→`.rule.md` (collision)._

## Phase 0: Design & scaffolding

Capture the architecture and open questions before writing code.

### Tasks

- [x] **Register project + scaffold docs** — registry entry, DESIGN.md, TASKS.md.
- [x] **Resolve open questions** — skill name `agentic-review`; manual/local flow first (PR comments deferred); severity rule-fixed; incremental persistence deferred (store git-ignored). See DESIGN §Open questions.

## Phase 1: Core scripts + rule format

The engine: rule discovery, diff-base resolution, staging, and finalize —
usable manually before any CI wiring.

### Tasks

- [x] **Rule parser** (`lib/frontmatter.mjs` + `lib/rule.mjs`) — frontmatter (`name`,`title`,`files`,`grep`,`severity`,`scope`) + markdown body; validated; glob base = rule dir or repo root (`scope`). Ext is `.rule.md` (not `.mdl` — collides with SPEC.mdl/PLUGIN.mdl).
- [x] **Rule discovery** (`lib/discover.mjs`) — `git ls-files '*.rule.md'` (tracked + untracked-not-ignored), honoring `.gitignore`.
- [x] **Diff-base resolution** (`prepare.mjs`) — scan `.agents/reviews/*/REVIEW.md` for finalized reviews whose `commit` is an ancestor of HEAD; newest wins; fallback to merge-base with first main-like ref, then HEAD.
- [x] **`prepare.mjs`** — changed files vs base (committed + staged + unstaged + untracked), intersect with rule globs, apply `grep`, group (one rule × ≤chunk files), write STAGING.md + blank REVIEW.md + `groups/NN.md` stubs, print paths + group count + per-group line.
- [x] **Diagnostic parser** (`lib/diagnostics.mjs`) — parse `# WARN|ERROR \`file:line[:col]\`` + body; dedupe + sort helpers.
- [x] **`finalize.mjs`** — merge fragments into REVIEW.md (sorted, deduped), set `isFinalized: true`, print severity counts.

## Phase 2: Skill packaging

Make Claude own the loop.

### Tasks

- [x] **`SKILL.md`** — workflow: run prepare → read group count → spawn N Sonnet subagents with the per-group brief → wait → run finalize → report. Includes the subagent prompt template and rule-authoring guide.
- [x] **Seed example rules** (`rules/*.rule.md`, `scope: repo`) — no-sleep-in-test, no-casts, no-compat-shims, private-new-packages, workspace-deps.
- [x] **Dogfood** — ran the full harness on a probe with real Sonnet subagents; diagnostics (`as any`, non-null `!`, sleep/setTimeout) landed in REVIEW.md with accurate line numbers.

## Phase 3: PR + CI integration

### Tasks

- [ ] **PR comment posting** in `finalize.mjs` — anchor to `file:line` via the GitHub API; idempotent (hidden marker per rule id).
- [ ] **Incremental persistence** — decide whether/how finalized REVIEW.md is committed so base resolution is incremental across fresh clones.
- [ ] **CI wiring** — run on PRs (post comments) and/or nightly on main (summary/issue).

### References

- Brief: `/project new` message (2026-08-09).
- Existing script convention: `scripts/query-logs.mjs`.
- Rule sources: `CLAUDE.md` Non-negotiables, `code-style` skill.
- Skill: `.agents/skills/agentic-review/` (SKILL.md, lib/, scripts/, rules/).
