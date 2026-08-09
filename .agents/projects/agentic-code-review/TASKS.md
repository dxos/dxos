# Agentic Code Review — Tasks

_Resume: Design scaffolded (DESIGN.md). Next: implement Phase 1 — `.mdl` parser + `prepare.mjs`. Uncommitted: registry.yml, DESIGN.md, TASKS.md. Last: project created._

## Phase 0: Design & scaffolding

Capture the architecture and open questions before writing code.

### Tasks

- [x] **Register project + scaffold docs** — registry entry, DESIGN.md, TASKS.md.
- [ ] **Resolve open questions** — skill name, trigger priority, severity authority, PR-comment idempotency (DESIGN.md §Open questions).

## Phase 1: Core scripts + `.mdl` format

The engine: rule discovery, diff-base resolution, staging, and finalize —
usable manually before any CI wiring.

### Tasks

- [ ] **`.mdl` parser** — frontmatter (`name`,`title`,`files`,`grep`,`severity`) + markdown body; validate; glob resolution relative to the rule's dir.
- [ ] **Rule discovery** — walk repo for `*.mdl`, honor `.gitignore`.
- [ ] **Diff-base resolution** — scan `.agents/reviews/*/REVIEW.md` for finalized reviews whose `commit` is an ancestor of HEAD; pick newest; fallback `git merge-base HEAD origin/main`.
- [ ] **`prepare.mjs`** — compute changed files vs base, intersect with rule globs, apply `grep` filter, group (few rules/group, chunk files ≤N), write STAGING.md + blank REVIEW.md + `groups/NN.md` stubs, print paths + group count.
- [ ] **Diagnostic parser** — parse `# WARN|ERROR \`file:line[:col]\`` + body from group fragments.
- [ ] **`finalize.mjs`** — merge fragments into REVIEW.md (sorted, deduped), set `isFinalized: true`, print summary.

## Phase 2: Skill packaging

Make Claude own the loop.

### Tasks

- [ ] **`SKILL.md`** — workflow: run prepare → read group count → spawn N Sonnet subagents with per-group brief → wait → run finalize. Include subagent prompt template.
- [ ] **Seed example rules** from CLAUDE.md non-negotiables (no-sleep-in-test, no-casts, no-compat-shims, private-new-packages, workspace-deps).
- [ ] **Dogfood** — run the harness on this branch's own diff; verify diagnostics land in REVIEW.md.

## Phase 3: PR + CI integration

### Tasks

- [ ] **PR comment posting** in `finalize.mjs` — anchor to `file:line` via `gh`; idempotent (hidden marker per rule id).
- [ ] **CI wiring** — run on PRs (post comments) and/or nightly on main (summary/issue).

### References

- Brief: `/project new` message (2026-08-09).
- Existing script convention: `scripts/query-logs.mjs`.
- Rule sources: `CLAUDE.md` Non-negotiables, `code-style` skill.
