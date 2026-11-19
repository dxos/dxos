---
title: Glossary
description: Every SAGE term, defined once.
---

Compute terms, such as operation, process and trigger, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### Agent

An agent is a model in a loop that acts in a space, with an identity of its own. Its work runs as a process. See
[Agents](/docs/sage/concepts/agents/).

### Chat

A chat is the conversation an agent or the assistant works in: a feed of messages plus the model, skills and objects for the
session.

### Code mode

Code mode is a way of running a turn in which the model has one tool, `eval`, and writes a program against the workspace instead of
calling one tool per action. See [Operations as tools](/docs/sage/concepts/tools/).

### Decision

A decision is an entry in a spec's changelog that says what is now true, and who decided it: a person or an agent. See
[Specs](/docs/sage/concepts/specs/).

### Delegation

Delegation is an agent handing a task to a sub-agent, which runs as a child process and reports back when it finishes.

### Fact

A fact is a statement extracted from text in the space, such as who said what and when, kept with the source it came from. See
[Memory](/docs/sage/concepts/memory/).

### Goal

A goal is a rule over facts that decides when an agent wakes, and when its goal is achieved.

### Instructions

Instructions are the text that tells a model how to behave: an agent's own, and each enabled skill's.

### MCP

MCP is the Model Context Protocol. DXOS serves a space's operations and skills over it, and agents use outside servers' tools
through it. See [MCP](/docs/sage/concepts/mcp/).

### Memory

Memory is what an agent keeps between turns, as ECHO objects: its chats, the memories it writes, and facts.

### Model

A model is a language model, named by an id that several providers may serve. See [Models](/docs/sage/concepts/models/).

### Provider

A provider is whoever serves a model: EDGE for hosted models, or a local server such as Ollama.

### Review

A review is a judgement of how far the code at one commit meets each item of a spec, with the code as evidence. See
[Specs](/docs/sage/concepts/specs/).

### Skill

A skill is instructions plus the operations a kind of work needs, enabled in a chat when the task calls for it. See
[Skills](/docs/sage/concepts/skills/).

### Spec

A spec is a `.mdl` document that says what software should do, for people and agents both, with its decisions, reviews and tests.
See [Specs](/docs/sage/concepts/specs/).

### Tool

A tool is what the model calls during a turn. In DXOS a tool is an operation, or a tool of a connected MCP server.

### Turn

A turn is one round of an agent's loop: the model's calls and their results, until it answers.
