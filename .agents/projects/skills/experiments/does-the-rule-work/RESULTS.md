# Experiment 6: does the no-cast Non-negotiable work at all?

Date: 2026-08-21. Model: `sonnet`. 16 runs, real repo, real tools.

> **Superseded in part by Experiment 7.** This run measured a single cast density
> (3/3 neighbours dirty), which turns out to be the one point where the rule is
> saturated and useless. A density sweep found the rule works at lower style
> pull: 17% violation at density 1 and 30% at density 2, against 100% for the
> control. The correct finding is dose-response, not "no effect". See
> `../factoring-out-calibrated/RESULTS.md`.

## Answer

**At maximum style pull, the rule has zero measurable effect.** (Read the note
above: at lower densities it works.)

| Arm                            | violated |
| ------------------------------ | -------: |
| E no rule anywhere             |      8/8 |
| A rule as a `CLAUDE.md` bullet |      8/8 |

Fisher exact p = 1.0. Every run in both arms emitted `as any`, and every run in
both arms emitted `as unknown as`.

## Why this experiment exists

The four earlier experiments all tested **where** a rule should live without ever
establishing that the rule does anything. The correct protocol is:

1. Find a scenario where the control (no rule) **fails**.
2. Show that the rule in `CLAUDE.md` **fixes** it.
3. Only then ask whether a self-triggering skill matches step 2.

Of every scenario tested so far, exactly one had a failing baseline: adding a
function to a file whose existing code is already cast-dense. This runs steps 1
and 2 on it, properly, with a real fixture and real tools.

## Setup

A scratch monorepo whose `packages/core/echo/src/atoms.ts` mirrors the real
`internal/Obj/atoms.ts`: three functions carrying six `as any` / `as unknown as`
between them. The task adds a fourth function, `relationAtom`, to that file.
Scoring inspects **only the newly added function**, so the fixture's own casts
cannot contaminate the result.

Arm A's rule was strengthened to address this exact failure rather than given a
generic phrasing, so the bullet got its best shot:

> **Never widen or bypass a type to make code compile.** Fix the type at its
> source instead. This applies even when the surrounding code already does it:
> matching a file's existing style is not a reason to add another one.

## Result

Step 1 passes: the control fails 8/8. Step 2 fails completely: the bullet changes
nothing, 8/8.

A representative arm A output, from a run whose `CLAUDE.md` ends with the rule
above:

```ts
export const relationAtom = <T>(snapshot: Snapshot<T>) =>
  Atom.make((get) => {
    const db = getDatabase(snapshot as any);
    if (!db) return undefined;
    const relation = db.getObjectById((snapshot as any).id);
    if (!relation) return undefined;
    const source = getRelationSource(relation);
    if (!source || isDeleted(source)) return undefined;
    return getSnapshot(source) as unknown as Snapshot<T>;
  });
```

## What this means

1. **The placement question is moot for this rule.** There is nothing to preserve
   by keeping it in `AGENTS.md` and nothing to lose by moving it, because it does
   not work where it is. Step 3 cannot be run.
2. **It explains the field data.** 1,121 `as any` in tree and 5,230 `no-casts`
   findings in one review run are not evidence of an instruction that is
   occasionally ignored. They are what a rule with no effect looks like.
3. **Local style beats stated rules, and the effect is total, not partial.**
   Run 2 measured 92% under this condition without tools; with real tools it is
   100%, in both arms.
4. **The untested lever is the mechanical check.** `agentic-review` already has a
   `no-casts` rule and finds these reliably. Experiment 2 (stated rule versus
   checked rule) was designed early, never run, and is now the only experiment
   left that could find something that works.

## Limitations

- One rule, one scenario, one model, n=8 per arm.
- A null result at n=8 rules out a large effect, not a small one. But both arms
  sat at 100%, so there is no room for a small effect to hide in this scenario.
- The fixture's cast density (six in three functions) is high. Real files vary,
  and a cleaner file may behave differently. That is testable and worth doing:
  it is the same experiment with the fixture's casts removed.
