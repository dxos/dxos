---
title: Why SAGE?
description: What sets SAGE's agents apart from other agent frameworks.
---

Most agent frameworks give a model tools, a memory store and a loop that runs while a request is open. If you have
called an LLM API with tools, you have written that loop yourself.

SAGE runs an agent as a durable process. The agent hibernates while it waits and wakes on events without asking a
model. It hands work to sub-agents and picks up when they report back. It can have an identity of its own, apart from
the person who asked.

## The pattern

Suppose you ask an agent to prepare next week's board meeting. It writes a plan, hands the research tasks to three
sub-agents and ends its turn. The sub-agents run as child processes.

When each one finishes, the agent wakes, reads the result, ticks off the task and posts what it found. Nobody kept a
request open, and the agent did not poll a model to check on them.

## An agent framework against SAGE

|                           | Typical agent framework                                 | SAGE                                                                                            |
| ------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| How long a task can run   | While the request or the session is open                | As long as it takes: the process hibernates and resumes, on a device or a server                |
| What wakes the agent      | A message, or a scheduler that calls the model to check | A message, a trigger, a sub-agent finishing, or a rule over facts that matches                  |
| Who made a change         | The user's account, or an API key                       | The agent's own identity when it has one, apart from the person who asked and from other agents |
| Where tools come from     | Functions written for the agent                         | The app's typed operations, the same ones its UI runs, with hints on what they change           |
| How tools reach the model | Usually every tool's schema in the prompt               | The tools of the skills the task needs, or one `eval` tool in code mode                         |
| What the work is held to  | A prompt or a ticket                                    | A spec that records who decided what, and reviews that check the code against it                |

## Practical problems

### Work that outlives a session

A loop that runs inside a request ends when the request or the session closes. In SAGE, an agent's work runs as a
process. While it waits on a timer, a person or a sub-agent, the process is written to storage and dropped from memory.
It then resumes where it left off.

On a server that is always online, the agent keeps going after every device is closed. See
[Agents](/docs/sage/concepts/agents/).

### Knowing which agent changed what

When several agents and people work on the same data, a change made by "the user" says little. A SAGE agent can have
an identity of its own, which EDGE creates.

A space can then admit the agent as a member under its own DID, apart from the person who asked and from other
agents. See [Agents](/docs/sage/concepts/agents/).

### Waking without polling a model

An agent that checks for new work by calling a model every few minutes is slow and expensive. SAGE's agents can hold
goals written as rules over facts. The rules are evaluated as facts arrive, and the agent wakes only when one matches.
See [Memory](/docs/sage/concepts/memory/).

### One set of actions for people and agents

When an agent needs its own API, you build every feature twice. In SAGE, an agent's tools are the app's operations.

The button, the command palette and the agent call the same key. The schema that labels a form also tells the model
what to pass. See [Operations as tools](/docs/sage/concepts/tools/).

### Memory the user owns

A memory that only the agent can read is hard to check and hard to correct. An agent's chats, the memories it writes
and the facts it extracts are objects in the user's own spaces, beside the data they are about.

They sync to the user's devices and the people they share with, and the user can read, edit and delete them. See
[Memory](/docs/sage/concepts/memory/).

### A plan that people and agents both hold

A prompt says what to do once. A spec says what the software should do, in text a person reads and an agent acts on.

The spec's changelog attributes every decision to the person or the agent that made it. A review records how far the
code meets each item. The spec's tests are steps that a person can follow and an agent can run. See
[Specs](/docs/sage/concepts/specs/).

### A long task in a few model calls

Calling one tool per step sends every result back through the model. In code mode, the model writes one short program
that queries, loops and calls operations. Only what the program prints comes back, or the value it returns when it
prints nothing. See [Operations as tools](/docs/sage/concepts/tools/#model).

### Choosing the model

Different work suits different models, and some prompts should stay on the user's device. A chat names the model it
uses, and a resolver finds a provider that serves it. The provider can be hosted, or it can be a model running on the
user's own device. See [Models](/docs/sage/concepts/models/).

## What SAGE does not do

SAGE does not train or host models. It calls them. It also does not run the work itself, which EDGE's
[Compute](/docs/edge/concepts/compute/) does. Each tool call is an operation, run as a
[process](/docs/edge/concepts/processes/).

## Next

[Agents](/docs/sage/concepts/agents/) shows how an agent runs.
