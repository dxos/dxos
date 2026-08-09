---
name: agentic-review
description: >-
  Run the rule-driven agentic code review over a branch's diff — discover `rule`
  blocks in the repo's `.mdl` files, prepare per-rule review groups over the
  changed files, spawn one focused Sonnet subagent per group, then finalize the
  merged diagnostics into REVIEW.md. Use when asked to run the agentic review,
  review a branch/PR against the repo's `.mdl` rules, or check a diff for known
  anti-patterns. For the built-in bug/quality passes use `/code-review` instead.
---

# Agentic Review

A harness that checks a diff against **`rule` blocks defined in `.mdl` files** —
semantic rules a linter can't express ("prefer subscribing to events over polling
in tests"). Each rule is applied by a focused LLM subagent, scoped to one rule
over a bounded set of the changed files, so the reviewer stays cheap and on-task.
**Claude drives the loop**: prepare → spawn subagents → finalize.

The scripts are dependency-free Node ESM and can also be run by hand.

## Layout

```
.agents/skills/agentic-review/
  scripts/prepare.mjs    # discover rules, resolve base, group, write the store
  scripts/finalize.mjs   # merge group fragments into REVIEW.md
  lib/                   # mdl reader, frontmatter, git, discovery, diagnostics, store
  rules/                 # seed rules (repo-wide non-negotiables)
```

Rules are **`rule` blocks** inside `.mdl` documents (the repo's structured
markdown format; see `packages/reflect/deus/lang/core.mdl`). A `.mdl` file can
define many things — `type`, `feat`, `test`, and so on — and a `rule` is just one
more block type. The harness scans every `.mdl` file, extracts the `rule` blocks,
and ignores the rest, so descriptor documents (`SPEC.mdl`, `PLUGIN.mdl`) define no
rules and are passed over. Put rules wherever they belong — colocated in a
package's `.mdl`, or in a shared document like `rules/non-negotiables.mdl`. The
run store is written to `.agents/reviews/<slug>/` (git-ignored).

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

A rule is a ` ```mdl ` fenced block of type `rule` in any `.mdl` document. The
header is `rule <id>: <title>`; the body is instruction prose followed by a few
fields:

````markdown
```mdl
rule no-sleep-in-test: No sleep in tests
  Prose instructions for the subagent — say what to flag and what NOT to flag.
  Use inline `code`, not fenced blocks (the rule already lives inside a fence).
  scope: repo
  files:
    - packages/**/*.test.ts
  grep: sleep|setTimeout
  severity: warn
```
````

- **`files`** — one glob or a list; matched against the changed set.
- **`scope`** — `dir` (default) resolves globs relative to the `.mdl` file's
  directory, so a package rule targets its own tree; `repo` resolves from the
  repo root (used by the shared seed rules).
- **`grep`** — an optional JS-regex pre-filter tested against file contents; a
  file is reviewed only if it matches. Omit to review every changed file the
  globs select. Values are literal (no YAML quoting) — write `grep: @dxos/`, not
  `grep: "@dxos/"`.
- **`severity`** — `warn` | `error` (default `warn`), authoritative from the rule
  (deterministic); subagents do not change it.

A document that uses the `rule` type should declare it in an `## Extensions`
section (`` `rule` `` → `org.dxos.mdl.rule@1.0`); see
`rules/non-negotiables.mdl` for a complete example with an inline `ext`
definition.

## Notes

- **Diff base** is incremental in principle (the newest finalized ancestor
  review), but the run store is git-ignored, so in practice the base is the
  merge-base with `origin/main` — the whole branch diff. Persisting finalized
  reviews for true incrementality is a later phase.
- **PR-comment posting** from `finalize.mjs` is a later phase; today finalize
  writes `REVIEW.md` only.
