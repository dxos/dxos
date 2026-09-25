---
name: agentic-review
description: >-
  Run the rule-driven agentic code review — discover `rule` blocks in the repo's
  `.mdl` files, prepare per-rule review groups (full project by default; diff-only
  with `--pr-only`), spawn one focused Sonnet subagent per group, then finalize
  the merged diagnostics into REVIEW.md + RESOLUTION.md. Use when asked to run
  the agentic review, list unresolved review issues, review a branch/PR against
  the repo's `.mdl` rules, or check a diff for known anti-patterns. For the
  built-in bug/quality passes use `/code-review` instead.
  A cheaper first pass with TypeSafe System One (`scripts/system-one.ts`)
  judges most groups and routes only uncertain ones to subagents.
---

# Agentic Review

A harness that checks the tree against **`rule` blocks defined in `.mdl` files** —
semantic rules a linter can't express ("prefer subscribing to events over polling
in tests"). Each rule is applied by a focused LLM subagent, scoped to one rule
over a bounded set of files, so the reviewer stays cheap and on-task.
**Default:** full-project first pass when there is no prior review (and for any
**new** rule never covered by a prior finalized run); later runs are incremental.
**`--pr-only`:** diff-only against the last review or merge-base with main.
**Claude drives the loop**: prepare → spawn subagents → finalize.

The scripts are TypeScript run directly with Bun (`bun <script>.ts`, no build step), import
nothing beyond `node:*` and `bun:*`, and can also be run by hand. Tests:
`bun test ./.agents/skills/agentic-review`.

## Layout

```text
.agents/skills/agentic-review/
  scripts/prepare.ts      # discover rules, resolve base, group, write the store
  scripts/finalize.ts     # merge fragments → REVIEW.md + RESOLUTION.md
  scripts/unresolved.ts   # re-print unresolved issues across all runs
  scripts/system-one.ts   # cheap first pass with TypeSafe System One; routes the rest onward
  lib/system-one/          # budget, source segmentation, context fetchers, questions, checker
  lib/                     # mdl, frontmatter, git, discovery, diagnostics, resolution, store
  rules/                   # seed rules (repo-wide non-negotiables)
```

Rules are **`rule` blocks** inside `.mdl` documents (the repo's structured
markdown format; see `packages/reflect/deus/lang/core.mdl`). A `.mdl` file can
define many things — `type`, `feat`, `test`, and so on — and a `rule` is just one
more block type. The harness scans every `.mdl` file, extracts the `rule` blocks,
and ignores the rest, so descriptor documents (`SPEC.mdl`, `PLUGIN.mdl`) define no
rules and are passed over. Put rules wherever they belong — colocated in a
package's `.mdl`, or in a shared document like `rules/non-negotiables.mdl`. The
run store lives at `.agents/reviews/<short-sha>/` (slug = `git rev-parse --short
HEAD`). Prepare writes STAGING.md / groups for the subagent loop; finalize keeps
only `REVIEW.md` + `RESOLUTION.md` and deletes the intermediates.

## Workflow

### 1. Prepare

```sh
bun .agents/skills/agentic-review/scripts/prepare.ts
# PR / diff-only (previous default):
bun .agents/skills/agentic-review/scripts/prepare.ts --pr-only
```

It prints the STAGING.md / REVIEW.md paths, the resolved base (`full` or a
commit), the mode, and the **group count** plus a per-group line
(`NN  <rule-id>  (<n> files, full|delta)`). Read the group count — it is exactly
how many subagents to spawn. If the count is `0`, nothing matched; report clean
and stop. Prepare **errors** if the working tree is dirty or
`.agents/reviews/<short-sha>/` already exists — commit first, then stage.

Useful flags: `--chunk=<N>` (max files per group when uncapped, default 15),
`--max-groups=<N>` (cap total groups, default 20; spreads all matched files
across the budget by growing chunk sizes; `0` = unlimited), `--pr-only` (diff
against last review or merge-base with main), `--base=<ref>` (override the diff
base for delta rules), `--main=<ref>` (main-like ref for `--pr-only` fallback),
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
> ```text
> # WARN `path/to/file.ts:42:7`
>
> One short paragraph: what the violation is and the concrete fix, referencing
> the rule. Column is optional.
> ```
>
> Use the rule's severity (`WARN` or `ERROR`) in the header. If a file is clean,
> write nothing for it. Do not edit any file other than your `groups/<NN>.md`
> fragment. Do not run the finalize step.

### 2b. Or: a System One pass first

`scripts/system-one.ts` answers the same groups with TypeSafe System One, a
decision model that returns calibrated probabilities for typed questions. It is
orders of magnitude cheaper than a subagent (input tokens only, $0.042 per
million) but cannot explore, so each rule's `context` field decides what it is
shown. Needs `TYPESAFE_API_KEY`.

```sh
bun .agents/skills/agentic-review/scripts/prepare.ts --pr-only
bun .agents/skills/agentic-review/scripts/system-one.ts --dry-run   # plan and price only
bun .agents/skills/agentic-review/scripts/system-one.ts             # fill the newest prepared store
```

How it works:

- **Batched per file.** Every rule matching a file is asked in one call, grouped
  by declared context so each state carries only what its rules need. Files too
  large for the 32k-token state limit are split into windows.
- **Two rounds.** Round one asks each rule's verdict (a probability) and which one
  missing context kind would most change it. Round two re-asks uncertain verdicts
  with that kind fetched, which is how a model that cannot explore asks for more,
  and locates every verdict worth reporting by choosing a segment of the file.
- **Triage, not a final judge.** A verdict at or above `--threshold` (0.8) becomes
  a diagnostic in `groups/NN.md`. One under the threshold but at or above both
  `--uncertain` (0.15) and its rule's median across the run plus `--lift` (0.15)
  is uncertain; subjective rules score middling on almost any file, and the
  relative bound keeps them from flooding the follow-ups. `SYSTEM-ONE.md` lists
  under "Still needs an agentic reviewer" the uncertain pairs regrouped into
  batches of one rule each, beside the groups whose rule is `system-one: off`.
  **Spawn one subagent per line there**, then finalize as usual. Every verdict is
  kept in `system-one.json`.
- **Scale.** A 202-file change against about a hundred rules took under four
  minutes and $2.73, reported 312 violations and routed 13% of pairs onward
  (`.agents/projects/architecture-rules/TRIAL.md`).
- **Failures.** A request that fails leaves its pairs unanswered, and they are
  listed for follow-up like uncertain ones. An account failure (401, 402, 403:
  a bad key or no credits) stops the run at once, since every request would fail
  alike.
- **Probe mode** judges named files without a store:
  `system-one.ts --file=<path> [--rule=<id>]`, printing each verdict, its
  location and any context the model asked for.

Calibration against the hunks the mined rules cite is in
`.agents/projects/architecture-rules/dataset/CALIBRATION.md`: rules a reader can
judge from the code alone separate cleanly, and rules that depend on context do
only when that context is fetched.

### 3. Finalize

After all subagents finish:

```sh
bun .agents/skills/agentic-review/scripts/finalize.ts --slug=<slug>
bun .agents/skills/agentic-review/scripts/finalize.ts --all --force   # re-stamp existing runs
```

(With no `--slug`/`--dir`/`--all`, it finalizes the most recently modified pending
run.) It parses every `groups/NN.md`, merges diagnostics into `REVIEW.md`
(sorted by file then line, deduped), stamps each issue with a stable id
`<review_id>-<seq>`, writes `RESOLUTION.md` with every issue as `unresolved`,
sets `isFinalized: true`, **deletes** `STAGING.md` / `groups.json` / `groups/`,
and prints counts by severity. `--force` re-finalizes an already-finalized run;
`--all` walks every store under `.agents/reviews/`.

Finalized diagnostic header form:

```text
# ERROR e8ad2af114-1 no-casts `packages/foo/bar.ts:42`

Body…
```

### 4. Report

Summarize the finalized `REVIEW.md` to the user: error/warning counts and the
notable findings. Link the `REVIEW.md` and `RESOLUTION.md` paths.

### 5. Address issues (RESOLUTION.md)

Each run gets a `RESOLUTION.md` ledger — one bullet per issue:

```text
- e8ad2af114-1 - unresolved - no-casts - packages/foo/bar.ts:42:7
- e8ad2af114-2 - resolved - harness-script-hygiene - .agents/skills/…/store.ts:99
- e8ad2af114-3 - ignored - no-sleep-in-test - packages/foo/x.test.ts:12
```

Fields: `<id> - <status> - <ruleId> - <file:line[:col]>`. Statuses:
`unresolved` | `ignored` | `resolved`. Finalize seeds every issue as
`unresolved`. Agents update the status field in place as they fix or dismiss
findings (do not rewrite REVIEW.md to clear an issue — flip the status instead).

### 6. List unresolved issues

Re-print every unresolved issue across **all** finalized runs (not just the
latest):

```sh
bun .agents/skills/agentic-review/scripts/unresolved.ts
bun .agents/skills/agentic-review/scripts/unresolved.ts --path=packages/core/echo
bun .agents/skills/agentic-review/scripts/unresolved.ts --rule=no-casts
bun .agents/skills/agentic-review/scripts/unresolved.ts --path='**/foo.ts' --rule=no-sleep-in-test
```

`--path` is a substring match, or a glob when it contains `*`/`?`. `--rule` is an
exact rule id. Legacy finalized runs without `RESOLUTION.md` are skipped.

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

- **`files`** — one glob or a list; matched against the project (default) or the
  changed set (`--pr-only` / incremental).
- **`scope`** — `dir` (default) resolves globs relative to the `.mdl` file's
  directory, so a package rule targets its own tree; `repo` resolves from the
  repo root (used by the shared seed rules).
- **`grep`** — an optional JS-regex pre-filter tested against file contents; a
  file is reviewed only if it matches. Omit to review every selected file the
  globs hit. Values are literal (no YAML quoting) — write `grep: @dxos/`, not
  `grep: "@dxos/"`.
- **`severity`** — `warn` | `error` (default `warn`), authoritative from the rule
  (deterministic). `finalize.ts` stamps every diagnostic in a group with the
  rule's severity from the run manifest, so a subagent's header cannot change it.
- **`unit`** — `file` (default) judges each matched file on its own; `pr` judges
  the change set once, for rules about what a change adds or leaves behind across
  files (an old path left beside its replacement, a diff wider than its purpose).
- **`context`** — what a non-agentic checker must be shown beside the code, as a
  list: `diff`, `imports`, `importers`, `siblings`, `package`, `public-api`,
  `similar`, `test`, `pr` (table in
  `.agents/projects/architecture-rules/DESIGN.md`). Declare the smallest set a
  reader who cannot open other files needs; leave it out when the file is enough.
- **`system-one`** — `on` (default) | `off`. `off` when no fetcher can supply what
  the rule needs, so only an agentic reviewer applies it.
- **`question`** — optional literal yes/no question ("yes" means violated) that
  replaces the default for the System One checker, for prose a literal reader
  would misapply.

A document that uses the `rule` type should declare it in an `## Extensions`
section (`` `rule` `` → `org.dxos.mdl.rule@1.0`); see
`rules/non-negotiables.mdl` for a complete example with an inline `ext`
definition.

## Notes

- **Default is full then incremental.** With no finalized ancestor review, every
  rule scans git-visible files matching its globs (`base: full`). After that,
  known rules review only the delta since the newest finalized ancestor; a **new**
  rule (absent from prior runs' `rules:` / `groups.json`) still gets a one-time
  full-project pass. Pass `--pr-only` for the old diff-only behaviour (last
  review or merge-base with `origin/main`).
- **Issue tracking** lives in `RESOLUTION.md` per run; `unresolved.ts` aggregates
  open items. Prefer flipping status over deleting diagnostics from REVIEW.md.
- **PR-comment posting** from `finalize.ts` is a later phase; today finalize
  writes `REVIEW.md` + `RESOLUTION.md` only.
