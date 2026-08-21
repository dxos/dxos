# Experiment 3: triggering accuracy

Date: 2026-08-21. Model: `sonnet`. 92 of 123 planned runs (see coverage gaps).

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

## Result: 65/89 positive runs fired the expected skill (73%)

The distribution is bimodal. Most skills are near-perfect; a small group barely
fires at all, and **that group is almost exactly the set I wrote or rewrote in
this session**.

| Skill                                                                                                                                                                                                              | fired | note                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: | -------------------------------------------------------------- |
| moon                                                                                                                                                                                                               |   1/6 | fired `code-style` instead; description rewritten this session |
| writing-for-agents                                                                                                                                                                                                 |   1/6 | lost to the built-in `skill-creator`; added this session       |
| unslop                                                                                                                                                                                                             |   2/6 | added this session                                             |
| technical-writing                                                                                                                                                                                                  |   3/6 | added this session                                             |
| debugging                                                                                                                                                                                                          |   2/3 | `logging` also fired; reasonable overlap                       |
| echo, proto                                                                                                                                                                                                        |   6/6 |                                                                |
| code-style, composer-debug, composer-forensics, composer-plugins, composer-ui, composite-components, context-propagation, debugging-ui, effect, logging, operations, regenerate-model-fixture, subduction, tracing |   3/3 |                                                                |
| browser-e2e-tests                                                                                                                                                                                                  |   2/2 |                                                                |

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

## Coverage gaps

31 runs did not complete before the runner was throttled to a crawl. Unmeasured:
`submit-pr`, `land`, `task-planning`, `cloud-sandbox`, `skills`,
`test-perf-leaks`, `trunk-quarantine`, plus repetitions 2 and 3 of the negative
controls. `submit-pr` and `land` matter most, since ungating them earlier this
session was predicated on prose asks reaching them. That prediction is untested.

## Reproducing

```sh
xargs -a matrix.txt -P 3 -n 2 ./trig.sh   # slows badly under throttling
python3 agg3.py
```
