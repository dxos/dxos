# Experiment 1: rule placement — run 2

Date: 2026-08-21. Model: `sonnet`. 48 runs, 96 model calls, all completed.

## Answer

**Rule placement made no measurable difference. What the surrounding code looks
like, and whether the task is framed as urgent, made a large and significant
one.**

## What changed from run 1

Run 1 hit a floor: every arm wrote correct code because the tasks were single
turn, six lines long, on clean files, with the error named in the prompt. Run 2
fixes each of those:

- **Two turns.** A substantial filler turn sits between the system prompt and the
  tempting task, so an always-loaded rule is genuinely distant when it matters.
- **Real repo code.** Tasks are built from actual `@dxos/echo` friction, not toys.
- **A task where the surrounding code already violates** (`r2`), taken verbatim
  from `internal/Obj/atoms.ts`, which carries 12 real casts.
- **A task under time pressure** (`r4`): release branch cut in forty minutes.
- **A bulk task** (`r3`): twelve conversions, so a violation is one edit of many
  and each run yields twelve scored sites.

Arms: E control, A our rule always-loaded at turn 0, C their principle skill at
the point of need, D our rule re-injected on every turn. Arm B (both) dropped as
the least informative.

## Result: arm effect

Unit of analysis is the run, since sites within one response are not independent.

| Arm                                        | runs violated | bad sites / sites |
| ------------------------------------------ | ------------: | ----------------: |
| E control, no rule                         |          5/12 |        5/45 (11%) |
| A ours, always-loaded turn 0               |          5/12 |        5/45 (11%) |
| C theirs, principle skill at point of need |          6/11 |        7/44 (16%) |
| D ours, re-injected every turn             |          3/11 |         3/44 (7%) |

Every pairwise Fisher exact test is null: E vs A p=1.000, C vs D p=0.387, all
others between. Arm D looks best and arm C worst, and neither is distinguishable
from doing nothing.

**Honest power statement.** At n=12 per arm against a 42% baseline, only a swing
of ~42 percentage points would reach p<0.05. This run rules out a large placement
effect. A small or moderate one would not show up here.

## Result: task effect

| Task          | condition it reproduces                         | runs violated |
| ------------- | ----------------------------------------------- | ------------: |
| r1-expensive  | correct fix is costly, but the error is named   |     0/12 (0%) |
| r3-bulk       | violation is one edit among twelve              |     1/12 (8%) |
| r4-pressure   | release deadline, 14 call sites, owners offline |    7/10 (70%) |
| r2-localstyle | the file being extended is already cast-dense   |   11/12 (92%) |

Significant: r2 vs r1 p<0.0001, r4 vs r1 p=0.0007, r2 vs r3 p=0.0001, r4 vs r3
p=0.0046. The task a model is given predicts violations; where the rule sits does
not.

`r2` is the clearest case. Given `atoms.ts` with its existing
`getDatabase(snapshot as any)` and `as unknown as Obj.Snapshot<T>`, and asked to
add one more function in the same file, 11 of 12 runs copied the casts. Arm A,
carrying our Non-negotiable verbatim, reproduced the local style exactly. The one
clean run was arm D, which wrote it with no cast at all and said why.

## What this means for the repo

1. **The 1,121 `as any` in tree are self-perpetuating.** Each cast-dense file
   teaches the next edit to cast. That is a far better explanation for 5,230
   `no-casts` findings than any failure of instruction, and no instruction
   placement fixed it here.
2. **Leverage is in the code, not the prose.** Cleaning the top cast-dense files
   plausibly does more than any rewrite of `AGENTS.md`. Worth its own experiment:
   does cleaning `atoms.ts` change the violation rate on `r2`?
3. **Urgency framing is a real risk factor.** 70% under deadline pressure, and
   `submit-pr` and `land` both operate under exactly that framing.
4. **Neither collection wins.** Our Non-negotiable and their principle skill both
   failed the local-style task. The original question, framed as ours versus
   theirs, was the wrong question.

## Limitations

- One model, one style of task, one repo's conventions.
- Two-turn distance is still far shorter than a real session.
- n=12 per arm; see the power statement.
- `r3`'s twelve sites per run inflate the site count but not the run count, which
  is why the run is the primary unit.
- The scorer counts hard violations only (`as any`, `as unknown as`, non-null
  `!`, an unvalidated assertion to the target type). A narrowing cast inside a
  type guard is not counted, after that false positive corrupted run 1.

## Reproducing

```sh
cp .agents/skills/composer-plugins/SKILL.md <workspace>/arms/dilution.txt
xargs -a matrix.txt -P 2 -n 3 ./run2.sh   # P>2 hits rate limits and yields empty runs
python3 score2.py && python3 agg2.py
```
