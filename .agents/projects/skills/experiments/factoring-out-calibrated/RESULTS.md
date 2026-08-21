# Experiment 7: can a Non-negotiable be factored out of CLAUDE.md into a skill?

Date: 2026-08-21. Model: `sonnet`. 38 runs, real fixtures, real tools.

## Answer

**No, not for this rule. The factored skill never triggered, so it performed
identically to having no rule at all.**

At the calibrated operating point (density 2):

| Arm                            |   violated | skill fired |
| ------------------------------ | ---------: | ----------: |
| E no rule anywhere             | 8/8 (100%) |         n/a |
| A rule as a `CLAUDE.md` bullet | 3/10 (30%) |         n/a |
| B rule factored into a skill   | 8/8 (100%) |     **0/8** |

- E vs A: p = 0.0040. The rule works.
- A vs B: p = 0.0038. Factoring it out breaks it.
- E vs B: p = 1.0000. Arm B is indistinguishable from no rule at all.

## Calibrating first, which every earlier attempt skipped

Testing where a rule lives is meaningless unless the control fails **and** the
`CLAUDE.md` version rescues it. Four earlier experiments were saturated at one end
or the other and could not have produced an answer. So this one swept the
variable that dominates everything else measured here, how cast-dense the
surrounding file is, to find an operating point with real separation:

| cast density         | E (no rule) | A (`CLAUDE.md`) | gap |
| -------------------- | ----------: | --------------: | --: |
| 1/3 neighbours dirty |  6/6 (100%) |       1/6 (17%) | +83 |
| 2/3 neighbours dirty |  8/8 (100%) |      3/10 (30%) | +70 |
| 3/3 neighbours dirty |  8/8 (100%) |      8/8 (100%) |   0 |

The fixtures differ **only** in how many neighbouring functions carry casts:
same types, same helpers, same task, same rule wording.

This also corrects Experiment 6, which concluded the no-cast rule "has no
measurable effect". That measured density 3, the single point where the rule is
saturated. The real relationship is dose-response: **the rule works until local
style overwhelms it.**

## Why arm B failed: the trigger never happens

The skill was installed correctly and its description was written to name the
situation rather than the rule, the approach that made Experiment 5's shim skill
fire 4/4:

> Adding or editing a function whose types do not line up: a parameter that will
> not accept the value you have, a return value the signature rejects, a generic
> that will not narrow...

It fired zero times out of eight.

The reason is structural, not a wording defect. Compare the two tasks:

- **Experiment 5 (fired 4/4):** "Move `formatBytes` out of `@dxos/util` into
  `@dxos/display`." The task statement _is_ the trigger. The agent knows before
  it starts that this is a move.
- **Experiment 7 (fired 0/8):** "Add a `relationAtom` export to `atoms.ts`." The
  task statement contains no type friction at all. The agent only meets the
  friction after it has opened the file and started writing, and by then it is
  no longer making a load-a-skill decision. It is mid-edit, matching the style
  around it.

**Skills trigger on the stated task, not on what you discover while doing it.**

## The rule that follows

Rules divide by when they become relevant:

- **Relevant from the task statement** (moving code, opening a PR, writing a
  test, regenerating fixtures). Safe to factor into a skill. Experiment 5 showed
  a 4/4 trigger rate and no loss of effect.
- **Relevant only mid-edit** (casts, non-null assertions, swallowed errors, any
  "when you are tempted to..." rule). Cannot be factored out. There is no moment
  where the agent decides to consult anything, so the rule has to be resident
  before the work starts.

Most Non-negotiables are the second kind, which is presumably why they ended up
in `AGENTS.md` rather than as skills. That instinct is now measured rather than
assumed.

## Limitations

- One rule, one model, one scenario, n=8-10 per arm.
- Only the description was varied for arm B; a hook that force-loads the skill
  on file-edit events was not tested and would be a different mechanism.
- Densities 1 and 2 both give usable separation; only density 2 was tested with
  all three arms.
