# Architecture Rules — Design

## Problem

Agents write code that is correct but architecturally ugly or overcomplicated:
speculative abstractions, parallel mechanisms next to existing ones, mirrored
state, flag-driven functions, stateless "manager" classes, error handling
repeated at every layer. Correctness rules already exist as `rule` blocks in
`.mdl` files (see `.agents/projects/agentic-code-review`); nothing yet encodes
what the team considers good architecture, so the same review comments recur.

## Approach

Two sources feed one rule file, `.agents/skills/agentic-review/rules/architecture.mdl`:

1. **A seed list**, chosen by hand (2026-09-24):
   - `one-mechanism-per-concern` — never add a second event bus, config path,
     registry or cache next to one that already serves the concern.
   - `state-owned-once` — no mirrored copies of state kept in sync by hand;
     derive it or subscribe to the owner.
   - `no-impossible-state-handling` — no defensive branches for cases the types
     already exclude; `invariant` and fail.
   - `dependency-direction` — lower layers never import upward.
   - `functions-before-classes` — a class earns its keyword with state and a
     lifecycle; a stateless manager is a module.
   - `handle-errors-at-one-level` — no catch-log-rethrow at every layer.
     Rejected for the first batch: speculative-abstraction, single-caller
     indirection, flag-driven behavior, constants-before-configuration,
     change-proportionate-to-fix.

2. **Mined review comments.** Every human review comment on `dxos/dxos` in the
   last twelve months, scraped with its diff hunk into `dataset/comments.jsonl`,
   classified by a Sonnet subagent per chunk (rule-worthy or not, category,
   the generalizable principle behind it), then clustered into candidate rules
   with counts and example links in `dataset/CANDIDATES.md`. The seed list is
   checked against the data: a seed rule with no supporting comments is
   suspect; a cluster with many comments and no seed rule is a gap.

Each shipped rule follows the existing shape: a flag/do-not-flag boundary, a
canonical example from the repo, a grep pre-filter no narrower than the prose,
and a full-project trial over three or four packages before it lands as
`error`.

## Dataset layout

```text
.agents/projects/architecture-rules/dataset/
  scrape.mjs        # dependency-free scraper (GITHUB_TOKEN), idempotent
  comments.jsonl    # one human review comment per line, with diff_hunk
  prs.jsonl         # PR number → title, author, merged, base
  chunks/NN.jsonl   # mechanically filtered comments, ≤ 40 per chunk
  classified/NN.jsonl  # one classification per comment, written per chunk
  CANDIDATES.md     # clustered candidate rules, counts, example links
```

## Open questions

- Whether a comment's _resolution_ (the follow-up commit) should be captured
  too; it would sharpen the "fix" side of a rule but doubles the API calls.
- Whether to include PR-level (non-inline) comments; they lack a diff anchor.

## Rule fields for context and unit

A rule declares what a checker must show beside the code, because a checker that is not agentic
cannot go and look. Four optional fields, parsed by `lib/mdl.mjs`:

- `unit: file | pr` (default `file`). `file` gives one verdict per matched file. `pr` gives one
  verdict for the whole change set, for rules about what a change leaves behind (an old path
  left next to its replacement, a diff wider than its stated purpose, a new component with no
  story). A `pr` rule still uses `files` and `grep` to decide whether it applies at all.
- `context:` a list, inline (`context: diff, imports`) or one per line. The kinds:

  | Kind         | What is fetched                                                       | Typical rule                                                                          |
  | ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
  | `diff`       | the file's own changes against the review base                        | anything about what this change adds, as opposed to what the file already had         |
  | `imports`    | export signatures of the in-repo modules the file imports             | using a lower-level API correctly, not re-implementing what an import provides        |
  | `importers`  | files that import this module, cut to the lines that use it           | public-surface and API-shape rules, where the callers show the contract               |
  | `siblings`   | the other files in the directory with their exported names            | colocation, consistent naming within a folder, a helper that already exists next door |
  | `package`    | the owning package's name, workspace dependencies and layer           | dependency direction, what a layer may import                                         |
  | `public-api` | the package's entry barrel and `exports` map                          | internal leakage through the public surface                                           |
  | `similar`    | exports elsewhere in the repo whose names overlap this file's exports | reuse the existing mechanism instead of adding a parallel one                         |
  | `test`       | the colocated test, or the module under test for a test file          | testing rules that compare a test to what it claims to cover                          |
  | `pr`         | commit messages and the changed-file list of the reviewed range       | intent: whether a change stays within what it says it does                            |

- `system-one: on | off` (default `on`). `off` when no fetcher can supply what the rule needs,
  so only the agentic reviewer applies it.
- `question:` an optional one-sentence yes/no question that replaces the default "does this code
  violate the rule?" for the System One checker, for a rule whose prose a literal reader would
  misapply.

## The System One checker

`scripts/system-one.mjs` applies the rules with TypeSafe System One (`jev`), a decision model:
it takes a state and a map of typed questions and returns calibrated answers, charging for input
tokens only ($0.042 per million). It does not generate text or call tools, which decides the
design.

- **Context is fetched, not explored.** The rule's `context` field names what to show; fetchers
  in `lib/system-one/fetchers.mjs` cut each kind to what the rule needs, because the vendor's
  own guidance is that unrelated state costs accuracy. Rules are grouped by declared context, so
  each state carries only its rules' kinds.
- **The model asks for more with a choice.** Round one asks every rule a second question beside
  its verdict: which one missing context kind would most change the answer, or none. An
  uncertain verdict whose model names a kind is re-asked in round two with that kind fetched.
  This is option (b) from the brief, done with a closed choice, since the model cannot write a
  request; option (a) is the `context` field.
- **Locations are chosen, not written.** The model cannot emit a line number, so round two asks
  a choice over the file's top-level segments for every verdict worth reporting.
- **Budget.** 64k tokens per request and 32k for the state plus its longest question. Estimates
  use three characters per token, which measured runs put slightly conservative (3.2); every
  limit keeps a 20% margin, questions are packed into as few requests as fit, and a file too
  large for one state is cut into balanced, overlapping windows whose verdicts take the maximum.
- **Change-set rules.** A `unit: pr` rule gets one state holding every matched file's diff and
  one verdict, located by choosing a file.
- **Triage.** Calibration on the hunks the rules were mined from (`dataset/CALIBRATION.md`)
  shows high precision and modest recall, so the checker reports only verdicts at 0.8 or above
  and sends the band between 0.15 and 0.8 to agentic reviewers; below 0.15 is dismissed.
