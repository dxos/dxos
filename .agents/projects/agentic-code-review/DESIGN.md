# Agentic Code Review — Design

## Problem

The agent makes the same class of mistakes repeatedly (e.g. `sleep`/polling in
tests, casts to silence the type-checker, compatibility shims left behind). These
are encoded as prose in `CLAUDE.md` and skills, but nothing systematically
_checks_ a diff against them. We want a **harness for agentic review**: durable,
machine-collected rules applied by focused LLM subagents to exactly the files
that changed, with diagnostics that can land as PR comments.

Deterministic linters can't express these rules (they're semantic: "prefer
subscribing to events over polling"). A grep can pre-filter candidates but can't
judge. So the reviewer is an LLM subagent, scoped tightly to one rule over a few
files to stay focused and cheap.

**Claude owns the process** — it is packaged as a review _skill_ plus scripts, so
the harness drives prepare → spawn subagents → finalize.

## Rule format — `.mdl`

Rules live in `.mdl` files anywhere in the repo, ideally colocated with the code
they govern. `files:` globs resolve **relative to the `.mdl` file's directory**,
so a package can drop a rule next to its own tests.

Format: **YAML frontmatter + markdown body** (the body is the instructions,
allowing rich markdown). One rule per file; the filename slug is the rule id.

```markdown
---
name: no-sleep-in-test
title: No sleep in tests
files: "src/**/*.test.ts" # glob(s), relative to this file's dir; array allowed
grep: sleep # optional pre-filter; only files matching are reviewed
severity: warn # warn | error (default warn)
---

Using `sleep` or polling is disallowed in tests, prefer subscribing to events.

Flag any use of `sleep`, `setTimeout`-based waits, or busy-poll loops. Prefer
event subscription, `Trigger`, or Effect `TestClock`.
```

- `grep` is an **optimization + precision** filter: a file only enters a group
  for this rule if it contains the pattern. Cheap way to skip files the rule
  can't apply to. Optional.
- `files` may be a string or a list. Globs are matched against repo-relative
  paths after resolving relative to the rule dir.
- Design decision: frontmatter+body over the inline-YAML sketch in the brief —
  it keeps `.mdl` genuinely markdown-editable and lets instructions be long.

## Store — `.agents/reviews/<slug>/`

Each review run gets a slug directory:

```
.agents/reviews/<slug>/
  REVIEW.md            # frontmatter + merged, finalized diagnostics
  STAGING.md           # groups of (rule × files) for subagents; input only
  groups/
    01.md              # one fragment per group — a subagent writes here
    02.md
    ...
```

`<slug>` is derived from branch + short commit (e.g. `agentic-code-review-b217ecc`)
so runs are addressable and don't collide.

### REVIEW.md frontmatter

Generated blank at prepare (step 1), finalized at step 3:

```markdown
---
branch: claude/agentic-code-review-8621ce
commit: b217ecc635 # HEAD at review time
base: ea11703a42 # commit this review diffs against (see base resolution)
createdAt: 2026-08-09T…
isFinalized: false # set true by finalize; unfinalized reviews are ignored
pr: 12520 # optional, if on a PR
groups: 4
---

<!-- diagnostics merged here at finalize -->
```

`isFinalized: false` means the run is incomplete (subagents may still be
writing / crashed) — the base-resolution scan **ignores** non-finalized reviews.

## Diagnostic format

Subagents emit diagnostics into their group fragment in a strict, parsable form:

```markdown
# WARN `path/to/file.ts:42:7`

Body explaining the violation and the fix, referencing the rule.

# ERROR `path/to/file.ts:88`

Column is optional.
```

- Header line: `# WARN|ERROR` + space + backtick-wrapped `` `file:line[:col]` ``.
- Body: everything until the next `# WARN|ERROR` header or EOF.
- The severity comes from the subagent (seeded by the rule's `severity`, but the
  subagent may downgrade/upgrade with justification — TBD, default: rule wins).

## Workflow (three steps)

### Step 1 — prepare (`prepare.mjs`)

1. Discover all `.mdl` rule files (walk repo, honor `.gitignore`).
2. **Resolve the diff base.** Scan `.agents/reviews/*/REVIEW.md` for **finalized**
   reviews whose `commit` is an **ancestor of HEAD** (`git merge-base --is-ancestor`).
   Pick the one with the **most recent** such commit → that's the base. This makes
   review **incremental**: only re-review what changed since the last good review.
   Fallback when none exists: `git merge-base HEAD origin/main` (review the whole
   branch diff).
3. Compute changed files: `git diff --name-only <base> HEAD` (+ untracked/working
   set as configured). Keep only files that still exist.
4. For each rule, intersect its resolved globs with the changed files, then apply
   the `grep` pre-filter. Yields a set of `(rule, [files])` pairs.
5. **Group** for subagents, preferring **few rules per group** over few files:
   a group is one rule × a bounded chunk of its files (chunk size configurable,
   e.g. ≤ 15 files). Big rules split into multiple groups; tiny rules are **not**
   merged across rules (focus > packing).
6. Write `STAGING.md` (human/agent-readable: per group, the rule frontmatter +
   instructions + the file list) and a blank `REVIEW.md` (frontmatter above,
   `isFinalized: false`), and empty `groups/NN.md` stubs.
7. **Print to stdout**: paths to STAGING.md and REVIEW.md, and the **group
   count** — the harness spawns exactly that many subagents. Also print a
   per-group one-liner (rule + file count) for logging.

### Step 2 — subagents (harness-driven, via the skill)

The skill instructs the harness to spawn `groups` subagents on the **Sonnet**
model. Each subagent is handed: its group number, the rule (title + instructions
+ severity), and its file list (read from STAGING.md). It reviews each file
against that one rule and **appends diagnostics to `groups/NN.md`** in the
diagnostic format. Per-group fragment files avoid concurrent-write races on a
single REVIEW.md (design decision — the brief said "append to REVIEW.md"; we
split to isolate writers, then merge in finalize).

Subagents report **only** violations of their assigned rule — no general review,
no style opinions outside the rule. If clean, the fragment stays empty.

### Step 3 — finalize (`finalize.mjs`)

1. Parse every `groups/NN.md`, validate diagnostic headers, collect them.
2. Merge into `REVIEW.md` under the frontmatter, sorted by file then line;
   dedupe identical diagnostics.
3. Set `isFinalized: true`.
4. **If on a PR** (`pr` set / detectable via `gh`): post diagnostics as review
   comments anchored to `file:line` (via `gh pr review` / the comments API).
   Idempotency: tag comments with the rule id + a hidden marker so re-runs
   update rather than duplicate (TBD mechanism).
5. Print a summary (counts by severity, PR link if posted).

## Packaging — the skill

`.agents/skills/agentic-review/` (name TBD — avoids the built-in `/review` and
`/code-review`). Contains:

- `SKILL.md` — the workflow the harness follows: run `prepare.mjs`, read the
  group count, spawn that many **Sonnet** Task subagents with the per-group
  brief, wait, then run `finalize.mjs`. Includes the subagent prompt template.
- `scripts/prepare.mjs`, `scripts/finalize.mjs`, and a shared `lib/` (mdl parser,
  git helpers, diagnostic parser).
- Example rules seeded from existing `CLAUDE.md` non-negotiables (no-sleep-in-test,
  no-casts, no-compat-shims, private-new-packages, workspace-deps).

## Triggering

Two intended modes (both supported; the scripts are trigger-agnostic):

1. **On PRs** — run in CI (or on demand) against the PR branch; finalize posts
   comments. Incremental base = last finalized review or merge-base with main.
2. **Nightly on main** — run against main's recent diff; finalize can open an
   issue / summary instead of PR comments.

CI wiring is a later phase; the skill + scripts are usable manually first.

## Open questions

1. **Skill name.** `agentic-review` vs `review-rules` vs folding into an existing
   name. Built-ins `/review` and `/code-review` already exist. Leaning
   `agentic-review`.
2. **Trigger priority.** Build for PR-comment flow first, or the manual/nightly
   flow first? (Affects whether finalize's `gh` posting is Phase 1 or later.)
3. **Severity authority.** Rule-fixed severity, or may a subagent adjust it with
   justification? Leaning rule-fixed for determinism.
4. **PR-comment idempotency** mechanism (hidden marker vs delete-and-repost).

## Decisions log

- `.mdl` = YAML frontmatter + markdown body (not inline YAML).
- Globs resolve relative to the rule file's directory.
- Per-group fragment files (`groups/NN.md`), merged at finalize — not concurrent
  appends to one file.
- Base resolution scans finalized reviews for the newest HEAD-ancestor commit;
  fallback to merge-base with `origin/main`.
- Grouping favors few rules per group over few files (focus over packing).
- Scripts are Node ESM `.mjs` (no build step), matching `scripts/*.mjs`.
- Subagents run on **Sonnet**.
