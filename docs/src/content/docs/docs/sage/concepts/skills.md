---
title: Skills
description: Instructions an agent loads when a task needs them.
---

A skill teaches an agent one kind of work. It holds instructions for how to do the work and the operations the work
needs. A chat enables only the skills its task calls for, so the model's context holds those and nothing else.

## Model

**A skill** is an ECHO object with a name, a description, instructions and a list of tools. The instructions are a
template, so they can include the current date or details of the objects in the chat. The tools are the operations, by
key, that the agent gets while the skill is enabled. The format follows the open
[Agent Skills](https://agentskills.io/specification) specification, so a skill means the same in DXOS as in other
agent tools.

**Where skills come from.** A PLEX plugin contributes skills alongside its operations, so installing a plugin gives
agents both the actions and the instructions for using them. See PLEX's [Operations](/docs/plex/concepts/operations/).
A person can also write a skill in the space, as an object like any other.

**Enabling a skill.** A person adds skills to a chat, and an agent starts with the skills its definition names. A type
can name the skills a chat about one of its objects should have, so a chat opened beside a project starts with the
project skills.

## Behavior

- An agent can look up skills during a turn and enable one it needs, if the skill allows agents to enable it.
- A skill enabled in the middle of a turn applies from the next model call, with its operations and instructions.
- A skill marked for MCP is served by the [MCP server](/docs/sage/concepts/mcp/) as a prompt, and its operations become
  reachable there.

## Limits

- A skill holds no credentials and no MCP server connections. Those belong to the space, and each chat can turn them
  off.
- A turn lists only the operations of the skills enabled in its chat. An operation no skill lists is one the agent has
  to search for, and over MCP it cannot be reached at all.
