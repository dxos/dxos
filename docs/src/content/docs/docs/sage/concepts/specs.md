---
title: Specs
description: The contract people and agents both work from, with what to build, who decided it, and how far the code meets it.
---

A spec says what a piece of software should do, in text that a person can read and an agent can act on. It records who
decided each part, people and agents alike, and it can be checked: a review says how far the code meets each item, and
its tests are steps that a person can follow and an agent can run.

## Model

**The language.** A spec is a `.mdl` file in DEUS, a specification language for people and agents working together. The
body is Markdown prose. Fenced `mdl` blocks carry the parts that need structure: types, operations, features with
numbered requirements, and tests. Simple requirements stay as prose, and the block types are themselves declared in
DEUS, so a project can add its own. The language and its tools are in `@dxos/deus`.

**The changelog.** Every change to a spec is a decision in its changelog. A decision says what is now true, the day it
was made, why, and who made it: `user:` for a person, or `agent:` for an agent, with the person it acted for. A choice
nobody has made yet is a question, which a later decision answers. Reading the changelog tells you which parts of a spec
a person decided and which an agent proposed.

**Reviews.** A review reads the code at one commit and gives each spec item a verdict, with the code it read as
evidence:

| Verdict    | Means                                     |
| ---------- | ----------------------------------------- |
| `done`     | Built as specified                        |
| `untested` | Built, but no test covers it              |
| `partial`  | Built in part                             |
| `diverged` | Built differently from what the spec says |
| `missing`  | Not built                                 |

A spec's history is its reviews, and an item's current status is its newest verdict.

**QA tests.** A test is a list of steps, each with what to do and what to expect. A person can follow it by hand. An
agent runs the same test by invoking one operation per step and judging the result against the same expectation.

## Behavior

- In Composer, a spec is an object in a project, with its reviews kept beside it. It syncs both ways with a `.mdl` file
  on disk or in a GitHub repository, so people edit it in Composer or in their editor.
- The Spec Review skill lets an agent review a spec against the code and record the result as a review.
- The `deus` command line lints a spec and checks that every feature in a feature map cites a real spec item.
- The editor highlights, completes and lints `.mdl` text as it is typed.

## Limits

- A review is an agent's or a person's judgement of the code, not a proof. Its verdicts are as good as the evidence it
  cites.
- A spec is the source of truth only while people keep it current. A decision made in a chat and never recorded in the
  changelog is lost to the next reader.
