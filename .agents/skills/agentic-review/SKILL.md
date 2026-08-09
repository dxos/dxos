---
name: agentic-review
description: >-
  Run the rule-driven agentic code review over a branch's diff — discover
  `.rule.md` files, prepare per-rule review groups over the changed files, spawn
  one focused Sonnet subagent per group, then finalize the merged diagnostics
  into REVIEW.md. Use when asked to run the agentic review, review a branch/PR
  against the repo's `.rule.md` rules, or check a diff for known anti-patterns.
  For the built-in bug/quality passes use `/code-review` instead.
---

# Agentic Review

A harness that checks a diff against **`.rule.md`** rules — semantic rules a
linter can't express ("prefer subscribing to events over polling in tests"). Each
rule is applied by a focused LLM subagent, scoped to one rule over a bounded set
of the changed files, so the reviewer stays cheap and on-task. **Claude drives the
loop**: prepare → spawn subagents → finalize.

The scripts are dependency-free Node ESM and can also be run by hand.

## Layout

```
.agents/skills/agentic-review/
  scripts/prepare.mjs    # discover rules, resolve base, group, write the store
  scripts/finalize.mjs   # merge group fragments into REVIEW.md
  lib/                   # frontmatter, rule loader, git, discovery, diagnostics, store
  rules/                 # seed rules (repo-wide non-negotiables)
```

Rules live in **`*.rule.md`** files anywhere in the repo (`.rule.md`, not `.mdl`
— the latter is the repo's module-descriptor extension). The run store is written
to `.agents/reviews/<slug>/` (git-ignored).

## Workflow

### 1. Prepare

```
node .agents/skills/agentic-review/scripts/prepare.mjs
```

It prints the STAGING.md / REVIEW.md paths, the resolved base commit, and the
**group count** plus a per-group line (`NN  <rule-id>  (<n> files)`). Read the
group count — it is exactly how many subagents to spawn. If the count is `0`,
nothing matched the diff; report clean and stop.

Useful flags: `--chunk=<N>` (max files per group, default 15), `--base=<ref>`
(override the diff base), `--main=<ref>` (main-like ref for the fallback base),
`--slug=<slug>` (override the store dir name).

### 2. Spawn one Sonnet subagent per group

Spawn the groups **in parallel**, one Task per group, on the **Sonnet** model.
Give each subagent its group number and the store path. Prompt template:

> You are reviewing code against a single rule. Read the group section
> `## Group <NN>` in `<STORE>/STAGING.md`: it contains the rule's instructions,
> severity, and the exact list of files to review.
>
> Review **only** the listed files, and **only** against that one rule — no
> general review, no style opinions outside the rule. For each genuine violation,
> append a diagnostic to `<STORE>/groups/<NN>.md` in exactly this format:
>
> ```
> # WARN `path/to/file.ts:42:7`
>
> One short paragraph: what the violation is and the concrete fix, referencing
> the rule. Column is optional.
> ```
>
> Use the rule's severity (`WARN` or `ERROR`) unless the rule text says
> otherwise. If a file is clean, write nothing for it. Do not edit any file other
> than your `groups/<NN>.md` fragment. Do not run the finalize step.

### 3. Finalize

After all subagents finish:

```
node .agents/skills/agentic-review/scripts/finalize.mjs --slug=<slug>
```

(With no `--slug`/`--dir`, it finalizes the most recently modified run.) It parses
every `groups/NN.md`, merges the diagnostics into `REVIEW.md` (sorted by file then
line, deduped), sets `isFinalized: true`, and prints counts by severity.

### 4. Report

Summarize the finalized `REVIEW.md` to the user: error/warning counts and the
notable findings. Link the `REVIEW.md` path.

## Authoring a rule

A `.rule.md` file is YAML frontmatter + a markdown body (the instructions):

```markdown
---
name: no-sleep-in-test # rule id (defaults to the filename slug)
title: No sleep in tests # human title (defaults to name)
scope: repo # `repo` = globs resolve from repo root; `dir` (default) = from this file's dir
files: # one glob or a list; matched against the changed set
  - 'packages/**/*.test.ts'
grep: sleep|setTimeout # optional regex pre-filter: a file is reviewed only if it matches
severity: warn # warn | error (default warn) — fixed by the rule
---

Prose instructions for the subagent. Say what to flag and what NOT to flag.
```

- **`scope`** — colocate a rule with the code it governs (`scope: dir`, the
  default; globs resolve relative to the rule file). Use `scope: repo` for a
  repo-wide rule (e.g. the seed rules under `rules/`).
- **`grep`** — an optimization and precision filter, a JS regex tested against
  file contents. Omit it to review every changed file the globs match.
- **`severity`** is authoritative from the rule (deterministic); subagents do not
  change it.

## Notes

- **Diff base** is incremental in principle (the newest finalized ancestor
  review), but the run store is git-ignored, so in practice the base is the
  merge-base with `origin/main` — the whole branch diff. Persisting finalized
  reviews for true incrementality is a later phase.
- **PR-comment posting** from `finalize.mjs` is a later phase; today finalize
  writes `REVIEW.md` only.
