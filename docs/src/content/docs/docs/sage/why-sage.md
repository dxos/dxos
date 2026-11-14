---
title: Why SAGE?
description: What sets SAGE's agents apart from other agent frameworks.
---

Most agent frameworks give a model tools, a memory store and a loop that runs while a request is open. SAGE runs an agent
as a durable process with an identity of its own. It sleeps between turns, wakes on events without asking a model, hands
work to sub-agents and picks up when they report back, and every change it makes is signed as its own.

## The pattern

Ask an agent to prepare next week's board meeting. It writes a plan, hands the research tasks to three sub-agents and
ends its turn. The sub-agents run as child processes. When each one finishes, the agent wakes, reads the result, ticks
off the task and posts what it found. Nobody kept a request open, and the agent did not poll a model to check on them.

## An agent framework against SAGE

|                           | Typical agent framework                                 | SAGE                                                                                  |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| How long a task can run   | While the request or the session is open                | As long as it takes: the process hibernates and resumes, on a device or a server      |
| What wakes the agent      | A message, or a scheduler that calls the model to check | A message, a trigger, a sub-agent finishing, or a rule over facts that matches        |
| Who made a change         | The user's account, or an API key                       | The agent's own identity, apart from the person who asked and from other agents       |
| Where tools come from     | Functions written for the agent                         | The app's typed operations, the same ones its UI runs, with hints on what they change |
| How tools reach the model | Usually every tool's schema in the prompt               | The tools of the skills the task needs, or one `eval` tool in code mode               |
| What the work is held to  | A prompt or a ticket                                    | A spec that records who decided what, and reviews that check the code against it      |

## Practical problems

### Work that outlives a session

An agent's work runs as a process. While it waits on a timer, a person or a sub-agent, the process is written to storage
and dropped from memory, and it resumes where it left off. On a server that is always online, the agent keeps going
after every device is closed. See [Agents](/docs/sage/concepts/agents/).

### Knowing which agent changed what

When several agents and people work on the same data, a change signed by "the user" says little. Each SAGE agent has its
own identity, and everything it writes, including the writes of the tools it calls, is attributed to it.

### Waking without polling a model

An agent that checks for new work by calling a model every few minutes is slow and expensive. SAGE's agents can hold
goals written as rules over facts. The rules are evaluated as facts arrive, and the agent wakes only when one matches.
See [Memory](/docs/sage/concepts/memory/).

### One set of actions for people and agents

When an agent needs its own API, every feature is built twice. In SAGE an agent's tools are the app's operations: the
button, the command palette and the agent call the same key, and the schema that labels a form also tells the model what
to pass. See [Operations as tools](/docs/sage/concepts/tools/).

### Memory the user owns

An agent's chats, the memories it writes and the facts it extracts are objects in the user's own spaces, beside the
data they are about. They sync to the user's devices and the people they share with, and the user can read, edit and
delete them. See [Memory](/docs/sage/concepts/memory/).

### A plan that people and agents both hold

A prompt says what to do once. A spec says what the software should do, in text a person reads and an agent acts on. Its
changelog attributes every decision to the person or the agent that made it, a review records how far the code meets
each item, and its tests are steps that a person can follow and an agent can run. See [Specs](/docs/sage/concepts/specs/).

### A long task in a few model calls

Calling one tool per step sends every result back through the model. In code mode the model writes one short program
that queries, loops and calls operations, and only what the program prints comes back. See
[Operations as tools](/docs/sage/concepts/tools/#model).

### Choosing the model

A chat names the model it uses, and resolvers find a provider that serves it: a hosted provider, or a model running on
the user's own device. See [Models](/docs/sage/concepts/models/).

## What SAGE does not do

SAGE does not train or host models; it calls them. It does not run the work itself: each tool call is an operation, run
as a [process](/docs/edge/concepts/processes/).

Start with [Agents](/docs/sage/concepts/agents/).
