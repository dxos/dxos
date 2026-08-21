# Experiment 5: is a Non-negotiable safe to factor out of CLAUDE.md into a skill?

Date: 2026-08-21. Model: `sonnet`. 15 runs against a real repo with real tools.

## Answer

**Factoring cost nothing measurable, and the skill triggered reliably. But the
control also succeeded, so this task cannot detect a cost if one exists.**

| Arm                                | clean | shim left | stale imports | skill fired |
| ---------------------------------- | ----: | --------: | ------------: | ----------: |
| E no rule anywhere                 |   5/5 |       0/5 |             0 |         n/a |
| A rule as a `CLAUDE.md` bullet     |   5/5 |       0/5 |             0 |         n/a |
| B rule as a skill, self-triggering |   4/4 |       0/4 |             0 |         4/4 |

Verified by reading the resulting file trees, not only the aggregate: every arm
deleted `packages/core/util/src/format-bytes.ts`, removed it from the barrel,
landed `formatBytes` in `@dxos/display`, and migrated all 14 importers.

## Why this design, after two false starts

Experiment 4 asked the same question and was invalid twice over. Its detector
counted 13 violations of which **all 13 were false positives**: twelve came from
a regex matching the string `re-export`, which fired on outputs stating "no
re-export shim left", and one on a commented-out removal line. Separately, the
runs had no file tools, so no arm could reach the 14 importers and none could
complete the task.

Pasting the callers inline would not have fixed it. The reason a shim is tempting
is that finding and touching 14 files is effort; put them all in the prompt and
that effort disappears. So this run uses a real fixture: a scratch monorepo with
`@dxos/util`, a destination `@dxos/display`, and 14 real importer files across 5
packages, with Read/Edit/Write/Bash/Glob/Grep available. Scoring is structural on
the resulting tree, with no prose heuristics anywhere.

The arms are faithful to production. Arm A puts the rule as one bullet among six
non-negotiables in a realistic `CLAUDE.md`. Arm B deletes that bullet and puts the
rule in `.claude/skills/no-compat-shims/`, where it must trigger on its own.

## What it establishes for the factoring question

1. **The skill triggers on real work.** 4/4 here, and 5/5 in the invalid
   Experiment 4, on a task that never mentions shims, re-exports, or the rule.
   Triggering is the only thing that separates a skill from a `CLAUDE.md` line,
   and for a rule-shaped skill with a description written to name the _work_
   ("moving, renaming, or deleting an exported symbol") rather than the _rule_,
   it held up.
2. **No degradation where a difference could appear.** Arm B matched arm A
   exactly.
3. **But nothing failed anywhere,** so the ceiling on this evidence is low. A
   cost that only shows up when the rule actually bites would be invisible here.

## The more interesting finding

Migrating 14 files across 5 packages is trivial for an agent: grep, edit, done.
The intuition behind the rule, that under deadline pressure you leave a shim
because touching every caller is expensive, is a **human** intuition that does not
transfer. The control arm, told nothing at all and told the release was cut in
forty minutes, migrated every caller anyway.

Run 2's 70% violation rate on the same scenario was measured without tools and
with the broken prose regex, so it was doubly artifact. With tools and structural
scoring the real rate is zero.

That reframes the question. Before asking whether this Non-negotiable can be
factored out, it is worth asking whether it still earns its place at all.

## Limitations

- n=5 per arm; only a very large effect would be visible.
- One rule, one scenario, one model.
- The fixture is small enough to hold in one context. A migration spanning
  hundreds of call sites might behave differently.
- Nothing failed, so this measures "no cost detected", not "no cost".
