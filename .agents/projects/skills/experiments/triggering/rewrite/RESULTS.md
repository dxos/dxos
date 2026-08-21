# Description rewrite: before and after

The four worst-triggering descriptions were rewritten against the three failure
patterns Experiment 3 identified, then re-measured with the identical prompts.

| Skill              |         before |           after |
| ------------------ | -------------: | --------------: |
| writing-for-agents |            1/6 |         **6/6** |
| technical-writing  |            3/6 |             4/6 |
| moon               |            1/6 |             3/6 |
| unslop             |            2/6 |             3/6 |
| **total**          | **7/24 (29%)** | **16/24 (67%)** |

Rewriting more than doubled the aggregate rate. Only one skill reached the 5/6
target.

## What actually worked

`writing-for-agents` went from worst to perfect, and it is the only one where the
rewrite did something other than add trigger phrases: it named the competitor and
claimed the ground explicitly ("in THIS repo", "prefer it over generic
skill-authoring guidance"). It had been losing to the built-in `skill-creator`.
**Explicit disambiguation against the competing option is what moved the number.**
Adding more symptom phrases, which is what the other three rewrites mostly did,
produced only marginal gains.

## The failures are not distributed, they are per-prompt

Each remaining miss is one whole prompt failing all three repetitions, while its
sibling prompt passes all three:

| Skill             | passing prompt                                                | failing prompt                                                 |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| unslop            | "Tidy up the wording... reads like a robot wrote it" 3/3      | "Does this changeset text sound machine-generated to you?" 0/3 |
| technical-writing | "I'm writing the README... what structure should it have" 3/3 | "Is this doc paragraph clear enough?" 1/3                      |
| moon              | "The build isn't picking up a new barrel file" 3/3            | "How do I run just one test file in the echo package?" 0/3     |

The passing prompts ask for **work**. The failing ones ask a **question** the
model believes it can answer directly: a yes/no judgement, or a fact it thinks it
already knows.

**Skills fire on tasks, not on questions.** The `moon` case is the sharpest: the
skill holds the repo-specific answer (a bare argument is parsed as a vitest
project filter, so you need `-- --project node <path>`), the model answered from
general knowledge instead, and general knowledge is wrong here. No description
wording fixes that, because the model never doubts itself enough to look.

## A note on `unslop`, which upstream marks always-apply

pstack's own description is `Cut AI tells from any writing. Must always apply.`
The port dropped that clause and added a scoping section limiting the skill to
prose you write or substantially rewrite, so 3/6 partly measures that scoping
decision rather than the wording.

The clause would not have delivered what it asks for in any case. A
model-invoked skill loads when the model decides to load it; the description is a
hint it weighs, not an enforcement mechanism, and Experiment 3 put even good
hints around 78%. The mechanisms in this repo that genuinely always apply are
`AGENTS.md` (loaded every session) and the `UserPromptSubmit` hook (re-injected
every turn), which is why the `agent-directives` project moved the response rules
onto the hook.

## Consequence for factoring rules out of AGENTS.md

This is the failure mode that matters for Experiment 4. A rule factored into a
skill fires when the agent recognises it is doing the kind of work the skill
covers. It does not fire when the agent believes it already knows the answer, and
a rule's whole purpose is to catch the cases where that belief is wrong.
