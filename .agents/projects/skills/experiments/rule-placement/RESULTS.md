# Experiment 1: rule placement — run 1 (INCONCLUSIVE)

Date: 2026-08-21. Model: `sonnet` via headless `claude -p`. 65 completed runs.

## Question

Does an on-demand principle skill (pstack's way) produce fewer rule violations
than a terse always-loaded Non-negotiable (our way)?

## Method

Five arms, differing only in where the rule text sits. Every arm carries the same
dilution: `composer-plugins/SKILL.md` (47KB) appended to the system prompt, the
file `agent-directives` cited as out-positioning `AGENTS.md`.

| Arm | System prompt           | User prompt                            |
| --- | ----------------------- | -------------------------------------- |
| E   | dilution                | task                                   |
| A   | our rule, then dilution | task                                   |
| B   | our rule, then dilution | their principle skill, then task       |
| C   | dilution                | their principle skill, then task       |
| D   | dilution                | task, then our rule (per-turn channel) |

Our rule text is verbatim from the `AGENTS.md` Non-negotiables. Their text is the
matching `principle-*` skill body. Five tasks over three violation classes (2
cast, 2 shim, 1 unhandled-error), three repetitions each. Runs are text-only, no
tools, so the measurement is purely the code the model writes.

## Result

| Arm                   | violations |   n | rate |
| --------------------- | ---------: | --: | ---: |
| E control             |          1 |  13 |   8% |
| A ours, always-loaded |          0 |  14 |   0% |
| B both                |          0 |  12 |   0% |
| C theirs, on-demand   |          1 |  12 |   8% |
| D ours, re-injected   |          1 |  14 |   7% |

Three violations in 65 runs. No arm separates from the control, and the control
itself is at the floor.

## Why it is inconclusive

**The tasks do not discriminate.** Sonnet writes correct code on all five with no
rule present at all, so no arm can show a difference. This is the failure mode
`skill-creator`'s analyzer names directly: an assertion that passes regardless of
the skill is non-discriminating and creates false confidence. A floor effect is
not evidence that placement does not matter.

**A detector bug corrupted the first scoring pass.** It flagged
`as Record<string, unknown>` used as a narrowing step inside a type guard, which
is idiomatic and not a rule breach. Before the fix the apparent rates were 14 to
36 percent and would have supported a confident wrong conclusion in either
direction. Fixed in `score.py`: hard violations are `as any`, `as unknown as`,
non-null `!`, and an assertion to the target type with no validation anywhere.

**A weak secondary signal, well inside noise.** On the cast tasks, arms B, C, and
D produced a proper `value is T` type guard in 3 of 6 runs against 1 of 6 for arm
A and 2 of 6 for the control. Directionally it favours on-demand placement, but
n=6 per cell. Do not cite this.

## What run 2 needs

The gap between this floor and the field (5,230 `no-casts` findings in one
`agentic-review` run over the real tree) is the whole problem. Real violations
happen under conditions these tasks do not reproduce:

- **Multi-turn sessions**, where the rule was loaded many turns before the
  tempting moment. Every run here was single-turn, which is the best case for an
  always-loaded rule and the least realistic.
- **Tasks where doing it right is expensive.** A six-line file makes validation
  cheap. Use a real repo file where the correct fix touches several call sites.
- **Surrounding code that already violates**, which is the actual state of the
  tree and a strong pull toward matching local style.
- **Bulk work**, where the violation is one of forty edits rather than the whole
  deliverable.

Until run 2, the original claim stays open: this run neither supports nor refutes
it.

## Reproducing

```sh
cp .agents/skills/composer-plugins/SKILL.md <workspace>/arms/dilution.txt
xargs -a matrix.txt -P 2 -n 3 ./run.sh   # P>2 hit rate limits and produced empty runs
python3 score.py && python3 agg.py
```
