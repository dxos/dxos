---
title: Glossary
description: Every SAGE term, defined once.
---

Compute terms, such as operation, process and trigger, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### Agent

An agent is a model in a loop that acts in a space. Its work runs as a process, and it can have an identity of its
own. It is not HALO's agent device, which is a device of an identity whose key EDGE holds. See
[Agents](/docs/sage/concepts/agents/).

### Assistant

The assistant is the chat panel in Composer, where a person works with a model directly. Its chats have no agent.

### Chat

A chat is the conversation an agent or the assistant works in. It holds a feed of messages, and the model, skills and
objects for the session.

### Code mode

Code mode is a way of running a turn in which the model has one tool, `eval`. The model writes a program against the
[workspace](#workspace) instead of calling one tool per action. See
[Operations as tools](/docs/sage/concepts/tools/).

### Decision

A decision is an entry in a spec's changelog that says what is now true, and who decided it: a person or an agent. See
[Specs](/docs/sage/concepts/specs/).

### Delegation

Delegation is an agent handing a task to a sub-agent, which runs as a child process and reports back when it finishes.

### Fact

A fact is a statement extracted from text in the space, such as who said what and when. It is kept with the source it
came from. See [Memory](/docs/sage/concepts/memory/).

### Goal

A goal is something an agent watches for or works toward. The agent holds it as rules over [facts](#fact), and the
rules decide when the agent wakes.

### Host

A host is a local Node process that runs an agent loop from outside DXOS, such as the Claude Agent SDK, and writes its
output into a chat.

### Instructions

Instructions are the text that tells a model how to behave. A turn carries the agent's own and those of each enabled
skill.

### MCP

MCP is the Model Context Protocol. DXOS serves a space's operations and skills over it, and agents use outside
servers' tools through it. See [MCP](/docs/sage/concepts/mcp/).

### Memory

Memory is what an agent keeps between turns, as ECHO objects: its chats, the memories it writes, and facts.

### Model

A model is the AI system a turn calls, such as a language model. It is named by an id that several providers may
serve. See [Models](/docs/sage/concepts/models/).

### Provider

A provider is whoever serves a model: EDGE for hosted models, or a local server such as Ollama.

### Resolver

A resolver maps a model id to a provider that can serve it. Resolvers are chained, so one that cannot serve a model
passes it to the next.

### Review

A review is a judgement of how far the code at one commit meets each item of a spec, with the code as evidence. See
[Specs](/docs/sage/concepts/specs/).

### Skill

A skill is a set of instructions with the operations a kind of work needs. A chat enables it when the task calls for
it. See [Skills](/docs/sage/concepts/skills/).

### Spec

A spec is a `.mdl` document that says what software should do, for people and agents both. It carries its decisions,
reviews and tests. See [Specs](/docs/sage/concepts/specs/).

### Tool

A tool is what the model calls during a turn. In DXOS a tool is an operation, or a tool of a connected MCP server.

### Turn

A turn is one round of an agent's loop: the model's calls and their results, until it answers.

### Workspace

A workspace is what a code-mode program runs against: a space and the operations the program can reach.
