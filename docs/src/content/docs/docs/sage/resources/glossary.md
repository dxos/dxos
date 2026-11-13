---
title: Glossary
description: Every SAGE term, defined once.
---

Compute terms, such as operation, process and trigger, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### Agent

A model in a loop that acts in a space, with an identity of its own. Its work runs as a process. See
[Agents](/docs/sage/concepts/agents/).

### Chat

The conversation an agent or the assistant works in: a feed of messages plus the model, skills and objects for the
session.

### Code mode

A way of running a turn in which the model has one tool, `eval`, and writes a program against the workspace instead of
calling one tool per action. See [Operations as tools](/docs/sage/concepts/tools/).

### Decision

An entry in a spec's changelog that says what is now true, and who decided it: a person or an agent. See
[Specs](/docs/sage/concepts/specs/).

### Delegation

An agent handing a task to a sub-agent, which runs as a child process and reports back when it finishes.

### Fact

A statement extracted from text in the space, such as who said what and when, kept with the source it came from. See
[Memory](/docs/sage/concepts/memory/).

### Goal

A rule over facts that decides when an agent wakes, and when its goal is achieved.

### Instructions

The text that tells a model how to behave: an agent's own, and each enabled skill's.

### MCP

The Model Context Protocol. DXOS serves a space's operations and skills over it, and agents use outside servers' tools
through it. See [MCP](/docs/sage/concepts/mcp/).

### Memory

What an agent keeps between turns, as ECHO objects: its chats, the memories it writes, and facts.

### Model

A language model, named by an id that several providers may serve. See [Models](/docs/sage/concepts/models/).

### Provider

Who serves a model: EDGE for hosted models, or a local server such as Ollama.

### Review

A judgement of how far the code at one commit meets each item of a spec, with the code as evidence. See
[Specs](/docs/sage/concepts/specs/).

### Skill

Instructions plus the operations a kind of work needs, enabled in a chat when the task calls for it. See
[Skills](/docs/sage/concepts/skills/).

### Spec

A `.mdl` document that says what software should do, for people and agents both, with its decisions, reviews and tests.
See [Specs](/docs/sage/concepts/specs/).

### Tool

What the model calls during a turn. In DXOS a tool is an operation, or a tool of a connected MCP server.

### Turn

One round of an agent's loop: the model's calls and their results, until it answers.
