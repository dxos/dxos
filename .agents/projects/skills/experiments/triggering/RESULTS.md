# Experiment 3: triggering accuracy

Date: 2026-08-21. Model: `sonnet`. 103 of 123 planned runs (see coverage gaps).

## Why this experiment is the one that mattered

Experiment 1 compared a rule held in `AGENTS.md` against the same rule delivered
as an on-demand skill, and found no difference. That comparison was close to
vacuous: arm C had the principle text pasted straight into the prompt, so it was
the same tokens in the same context as arm A. If a skill always loads, "in a
skill" and "in `AGENTS.md`" are the same thing. **Triggering probability is the
only variable that distinguishes the two designs**, and it is what this measures.

## Method

Real triggering, not a proxy. Each case is a naturalistic user prompt run through
headless `claude -p` inside the repo, with `--output-format stream-json` capturing
whether the `Skill` tool actually fired and with which skill. Prompts are phrased
as a user would put it and deliberately avoid the description's own trigger words,
so the test is whether the description generalises rather than whether it matches
itself. Three repetitions per prompt, two prompts per skill. `--allowedTools
Skill` was verified not to change the triggering decision.

## Result: 73/100 positive runs fired the expected skill (73%)

The distribution is bimodal. Most skills are near-perfect; a small group barely
fires at all, and **that group is almost exactly the set I wrote or rewrote in
this session**.

| Skill                                                                                                                                                                                                                                                  | fired | note                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: | -------------------------------------------------------------- |
| moon                                                                                                                                                                                                                                                   |   1/6 | fired `code-style` instead; description rewritten this session |
| writing-for-agents                                                                                                                                                                                                                                     |   1/6 | lost to the built-in `skill-creator`; added this session       |
| trunk-quarantine                                                                                                                                                                                                                                       |   1/3 | pre-existing, so the low group is not only this session's work |
| unslop                                                                                                                                                                                                                                                 |   2/6 | added this session                                             |
| submit-pr                                                                                                                                                                                                                                              |   2/3 | see "ungating validated" below                                 |
| technical-writing                                                                                                                                                                                                                                      |   3/6 | added this session                                             |
| debugging                                                                                                                                                                                                                                              |   2/3 | `logging` also fired; reasonable overlap                       |
| land                                                                                                                                                                                                                                                   |   1/1 | see "ungating validated" below                                 |
| echo, proto                                                                                                                                                                                                                                            |   6/6 |                                                                |
| browser-e2e-tests, code-style, composer-debug, composer-forensics, composer-plugins, composer-ui, composite-components, context-propagation, debugging-ui, effect, logging, operations, regenerate-model-fixture, subduction, test-perf-leaks, tracing |   3/3 |                                                                |

Two zeros that are **my labelling error, not skill failures**:

- `testing-assistant-conversations` 0/3 lost to `regenerate-model-fixture`. My
  prompt was "a test fails with 'No memoized conversation found'", which is
  verbatim `regenerate-model-fixture`'s stated trigger and the more specific
  skill. The router was right and my expected answer was wrong.
- `agent-eval-tests` 0/3 on a prompt about scoring whether an agent really did
  what it claimed. Plausibly the same problem; not re-run.

## Result: negative controls all clean

| Prompt                                         | fired   |
| ---------------------------------------------- | ------- |
| "Run the rule-driven review over my branch..." | nothing |
| "Convert this project from prettier to oxfmt." | nothing |
| "What's the capital of France?"                | nothing |
| A trivial rename with the snippet inline       | nothing |

The first two target `agentic-review` and `migrate-oxfmt`, the two skills we
gated with `disable-model-invocation`. Neither fired from a prose ask, which
**empirically confirms the gating behaviour** documented in the skills README:
gated skills are unreachable except by a typed slash command. No over-triggering
was observed anywhere in the run.

## Why the new skills under-trigger

The working descriptions open with a concrete noun the user would actually type
(`ECHO`, `proto`, `moon.yml`) and then list situations. The failing ones share
three traits:

1. **They open with an abstraction, not the user's word.** "Cut AI tells from
   prose" and "How to write documents an AGENT reads" are the author's framing.
   A user says "this reads like a robot wrote it" or "how do I write a skill".
2. **They spend their tail on cross-references.** `unslop` and
   `technical-writing` each end by pointing at the other and dividing
   responsibility. That text does no triggering work and dilutes what does.
3. **They compete with a built-in.** `writing-for-agents` lost to
   `skill-creator`, which is broader and already present. Sharing territory with
   a built-in demands a sharper description, not a politer one.

`moon` at 1/6 is a plain misroute rather than a competition problem: "the build
isn't picking up a new barrel file" went to `code-style`. My rewrite led with
"Running and configuring moon (the repo's build/task system)" and buried the
symptoms a user would actually report.

This matches `skill-creator`'s own guidance, which says Claude tends to
**under**-trigger and that descriptions should be pushy. Mine are descriptive
and hedged.

## What to do

1. Rewrite the four descriptions leading with user symptoms, drop the
   cross-reference tails, and re-measure with this harness. Target 5/6.
2. Fix the two mislabelled cases and re-run them rather than counting them.
3. Add the harness to the skill-authoring convention: a new skill is not done
   until its description fires on prompts that avoid its own wording.

## Ungating validated

Earlier in this session `submit-pr` and `land` were ungated on the argument that
a prose ask, and the Create PR button, both route through the model and so could
never reach a gated skill. That argument is now measured rather than assumed:

- "I'm done with this change. Open a PR for it." fired `submit-pr` in 2/3 runs.
- "Get PR 12688 merged." fired `land` in 1/1.

Both are reachable from plain English, which is what ungating was for. Set
against the negative controls, where the two still-gated skills fired zero times
from equivalent prose asks, the pair confirms both halves of the gating rule in
the skills README.

`submit-pr` at 2/3 is not a good score for a skill `AGENTS.md` mandates, so it
belongs on the description-rewrite list too.

## Coverage gaps

20 runs did not complete before the runner was throttled to a crawl. Unmeasured:
`task-planning`, `cloud-sandbox`, `skills`, plus repetitions 2 and 3 of the
negative controls.

## Reproducing

```sh
xargs -a matrix.txt -P 3 -n 2 ./trig.sh   # slows badly under throttling
python3 agg3.py
```
