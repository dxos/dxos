# Can AGENTS.md become an index? Yes, if the skills are single-purpose

Date: 2026-08-21. Model: `sonnet`. Same density-2 fixture, task, and tools
throughout, so every arm is directly comparable.

## Result

| Arm                                                 |      violated | skill fired |
| --------------------------------------------------- | ------------: | ----------: |
| E no rule anywhere                                  |    8/8 (100%) |         n/a |
| A full rule **inline** in `CLAUDE.md`               |    3/10 (30%) |         n/a |
| B scenario-scoped skill `type-friction`, no pointer |    8/8 (100%) |         0/8 |
| C index pointer + general `code-style` skill        |     7/8 (88%) |         5/8 |
| D general `code-style` skill, no pointer            |    8/8 (100%) |         2/8 |
| **V1 single-purpose `no-casts` skill, no pointer**  | **1/6 (17%)** |         5/6 |

- V1 vs E: p = 0.0030. A single-purpose skill works.
- V1 vs A: p = 1.0000. It matches the inline rule (nominally better, 17% vs 30%).
- V1 vs C: p = 0.0163. It beats a topic-bundle skill decisively.
- C vs E: p = 0.5. A topic-bundle skill is not distinguishable from no rule.
- C vs D: p = 0.5. The index pointer lifts **triggering** (5/8 vs 2/8) but not
  outcomes.

## The variable that matters is skill granularity, not location

The rule text was identical in every skill arm. What changed was the packaging:

- **`no-casts`** — one skill, one rule, named for the rule. Fires 5/6, violates
  1/6.
- **`code-style`** — one skill, four topics (types, class members, signatures,
  comments), described as "Apply when writing or editing TypeScript". Fires 5/8,
  violates 7/8.

Both fire at the same rate. Only one changes behaviour. When a topic bundle
loads, the specific rule inside it is diluted by everything else it carries; when
a single-rule skill loads, the rule lands. Verified on raw files: arm C runs show
`fired: ['code-style']` and then `getDatabase(snapshot as any)` in the same run.

**Firing is necessary but not sufficient.** A companion variant,
`editing-typescript`, fired 6/6 and still violated 3/6. The skill's _name_
appears to carry weight beyond its description: `no-casts` primes the behaviour,
`editing-typescript` loads a document the agent then fails to connect to the
decision in front of it.

## Correcting Experiment 7

Experiment 7 concluded that mid-edit rules "cannot be factored out" for a
structural reason: skills trigger on the stated task, not on what you discover
while doing it. **That was wrong.** It generalised from one badly written skill.
Holding the task and fixture fixed and varying only the description:

| skill                                                             | fired | violated |
| ----------------------------------------------------------------- | ----: | -------: |
| `type-friction` (coined name, symptom-scoped, no concrete tokens) |   0/8 |      8/8 |
| `no-casts` (names `as any` and `as unknown as` literally)         |   5/6 |      1/6 |
| `typescript-types`                                                |   5/6 |      3/6 |
| `editing-typescript` (maximal scope)                              |   6/6 |      3/6 |

The failure was description quality. Note also that the _broadest_ description
did not trigger best on outcomes: naming the concrete thing beat widening the
scope, the opposite of what Experiment 7 predicted.

## What this means for `AGENTS.md`

`AGENTS.md` can become an index. Two conditions:

1. **One skill per rule, named for the rule.** `no-casts`, not `code-style`.
   Our real `code-style` skill is 210 lines covering many conventions, which is
   exactly the configuration that failed here.
2. **Keep the pointer.** It roughly doubled triggering (5/8 vs 2/8). It did not
   rescue outcomes on its own, so it is necessary but not sufficient.

The inline Non-negotiable can then go. On this rule the single-purpose skill was
nominally better than keeping it inline, and no worse statistically, while moving
~4 lines out of the always-loaded budget and taking the 210-line detail with it.

## Limitations

- One rule, one model, one fixture density, n=6-10 per arm.
- V1 had no index pointer. Pointer plus single-purpose skill was not tested and
  should be, since it is the configuration actually recommended above.
- Skill _name_ is confounded with description in these variants; they were varied
  together rather than independently.
