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

## Rule format — a `rule` block in `.mdl`

A rule is **one block type within the repo's `.mdl` document format** (see
`packages/reflect/deus/lang/core.mdl`): YAML frontmatter + markdown body + typed
` ```mdl ` fenced blocks. A `.mdl` file can define `type`, `feat`, `test`, … and
now `rule`. The harness scans every `.mdl` file, extracts the `rule` blocks, and
ignores the rest — so descriptor documents (`SPEC.mdl`, `PLUGIN.mdl`, 90+ of
them) define no rules and are passed over without error. This is why rules are
**not** a new file extension: they ride the existing format.

Rules can live anywhere — colocated in a package's `.mdl`, or in a shared
document (`rules/non-negotiables.mdl`). `files` globs resolve **relative to the
`.mdl` file's directory** by default (`scope: dir`); a rule sets **`scope: repo`**
to resolve from the repo root instead (the shared seed rules do this).

A `rule` block: header `rule <id>: <title>`, then instruction prose, then fields.

````markdown
```mdl
rule no-sleep-in-test: No sleep in tests
  Prose instructions (inline `code`, no fenced blocks — it's already in a fence).
  scope: repo # repo | dir (default dir)
  files: # one glob or a list; relative to the scope base
    - packages/**/*.test.ts
  grep: sleep|setTimeout # optional regex pre-filter over file contents
  severity: warn # warn | error (default warn)
```
````

- `grep` is an **optimization + precision** filter: a file only enters a group
  for this rule if its contents match. Values are literal (no YAML quoting).
- `files` may be a scalar or a list.
- Design decision: reuse the `.mdl` block format rather than invent a new file
  type — a rule is one of many things an `.mdl` document can carry, and the
  parser's job is to read `.mdl` files and find the rules in them.

## Store — `.agents/reviews/<slug>/`

Each review run gets a slug directory:

```text
.agents/reviews/<slug>/
  REVIEW.md            # frontmatter + merged, finalized diagnostics
  STAGING.md           # groups of (rule × files) for subagents; input only
  groups.json          # per-group manifest: NN → { ruleId, severity, title }
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
- A header-like line that does not match this format **fails finalization** (with
  the fragment name and line number) rather than being silently dropped.
- **Severity is rule-fixed and deterministic.** The subagent writes `WARN`/`ERROR`
  for readability, but finalize stamps every diagnostic in a group with the rule's
  severity from the run manifest (`groups.json`), so a subagent cannot change it.

## Workflow (three steps)

### Step 1 — prepare (`prepare.mjs`)

1. Discover all `rule` blocks across the repo's `.mdl` files (walk repo, honor
   `.gitignore`; non-rule blocks and descriptor documents are skipped).
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
6. Write `STAGING.md` (human/agent-readable: per group, the rule instructions +
   the file list), a `groups.json` manifest (NN → rule id + rule-fixed severity),
   a blank `REVIEW.md` (frontmatter above, `isFinalized: false`), and empty
   `groups/NN.md` stubs.
7. **Print to stdout**: paths to STAGING.md and REVIEW.md, and the **group
   count** — the harness spawns exactly that many subagents. Also print a
   per-group one-liner (rule + file count) for logging.

### Step 2 — subagents (harness-driven, via the skill)

The skill instructs the harness to spawn `groups` subagents on the **Sonnet**
model. Each subagent is handed: its group number, the rule (title + instructions

- severity), and its file list (read from STAGING.md). It reviews each file
  against that one rule and **appends diagnostics to `groups/NN.md`** in the
  diagnostic format. Per-group fragment files avoid concurrent-write races on a
  single REVIEW.md (design decision — the brief said "append to REVIEW.md"; we
  split to isolate writers, then merge in finalize).

Subagents report **only** violations of their assigned rule — no general review,
no style opinions outside the rule. If clean, the fragment stays empty.

### Step 3 — finalize (`finalize.mjs`)

1. Parse every `groups/NN.md`, validating diagnostic headers (a malformed one
   fails the run); collect them, stamping each with its group's rule-fixed
   severity from `groups.json`.
2. Merge into `REVIEW.md` under the frontmatter, sorted by file then line;
   dedupe identical diagnostics.
3. Set `isFinalized: true`.
4. Print a summary (counts by severity).

**Deferred to Phase 3 — PR-comment posting.** When on a PR, post diagnostics as
review comments anchored to `file:line`, made idempotent with a hidden per-rule
marker so re-runs update rather than duplicate. Today finalize writes `REVIEW.md`
only.

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

1. ~~**Skill name.**~~ **Resolved: `agentic-review`** (avoids built-in `/review`,
   `/code-review`).
2. ~~**Trigger priority.**~~ **Resolved: manual/local flow first.** `finalize.mjs`
   writes `REVIEW.md` only; PR-comment posting is Phase 3.
3. ~~**Severity authority.**~~ **Resolved: rule-fixed** for determinism — subagents
   do not adjust severity.
4. **PR-comment idempotency** mechanism (hidden marker vs delete-and-repost) —
   still open, deferred to Phase 3.
5. **Incremental persistence.** The run store is git-ignored, so incremental base
   resolution (newest finalized ancestor) has nothing to read across fresh clones
   and the base is the merge-base with main (whole branch diff). Committing
   finalized reviews for true incrementality is a Phase 3 decision.

## Decisions log

- **A rule is a `rule` block inside an `.mdl` document**, not a new file
  extension. The parser reads every `.mdl` file, extracts `rule` blocks, and
  ignores all other block types — so the repo's existing `SPEC.mdl`/`PLUGIN.mdl`
  descriptors (90+) coexist and simply define no rules. (Earlier iteration tried
  a dedicated `.rule.md`; reverted per the format's intent.)
- Added a **`scope: dir|repo`** field to the rule block (default `dir`); `repo`
  resolves globs from the repo root, for shared/seed rules.
- Globs resolve relative to the scope base (the `.mdl` file's dir, or repo root
  when `scope: repo`).
- `rule`-block values are literal (no YAML quoting), matching the `.mdl` block
  body syntax.
- Per-group fragment files (`groups/NN.md`), merged at finalize — not concurrent
  appends to one file.
- Base resolution scans finalized reviews for the newest HEAD-ancestor commit;
  fallback to merge-base with the first main-like ref (`origin/main`, `main`, …);
  final fallback to HEAD (working-tree-only review) when no main ref exists.
- Grouping favors few rules per group over few files (focus over packing).
- Scripts are dependency-free Node ESM `.mjs` — a hand-rolled frontmatter parser
  is used because a standalone script can't resolve a pnpm-hoisted YAML package.
- Subagents run on **Sonnet**.
- The run store (`.agents/reviews/`) is **git-ignored** — runs are ephemeral
  artifacts.

## Status

Phases 0–2 implemented and dogfooded (real Sonnet subagents flagged `as any`, a
non-null `!`, and a `sleep`/`setTimeout` in a test, with accurate line numbers,
merged into `REVIEW.md`). Phase 3 (PR comments + CI wiring) not started.
