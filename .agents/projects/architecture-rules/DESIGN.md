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
