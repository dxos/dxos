---
title: MCP
description: Reaching a space's operations and skills from any MCP client.
---

The [Model Context Protocol](https://modelcontextprotocol.io/) lets an agent outside DXOS, such as a coding agent, use a
space. The DXOS MCP server serves the space's [operations](/docs/edge/concepts/operations/) and skills to any MCP
client. In the other direction, an agent inside DXOS can connect to outside MCP servers and use their tools.

## Model

An MCP server usually lists one tool for each thing it can do, and the client loads every schema. The DXOS MCP server
serves three tools, however many operations the space has:

| Tool              | Does                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `queryOperations` | Searches the operations by text, skill or key, and returns their schemas |
| `invokeOperation` | Runs one operation by key, checking its input and resolving the space    |
| `loadSkill`       | Returns a skill's instructions, or lists the skills when given no name   |

The client searches for the operations a task needs. It is not handed a schema for every one, so its context stays
small as plugins add operations.

A **skill** is a set of instructions with the operations one kind of work needs. Each skill marked for MCP is also
served as an MCP prompt.

**Where it runs.** Use `dx mcp serve` to run the server on a device, against the profile's spaces. EDGE runs it too, so
a client can reach a space with no DXOS device online. Both serve the same tools and prompts, built from the same
operation registry.

**Outside MCP servers.** A space can hold connections to outside MCP servers. A chat connects to them at the start of
each turn, and their tools join the agent's operations. Each chat can turn a connection off.

## Behavior

- An operation is reachable over MCP only when a skill marked for MCP lists it.
- `queryOperations` returns one row for each operation it finds. The row says whether the operation changes nothing,
  writes, or destroys data, so the client can ask before a destructive call.
- Writes over MCP replicate to members like any other change.

## Limits

- When the MCP server runs on EDGE, it needs the space to give EDGE more than `pull` access, the lowest access level.
  See HALO's [Spaces and membership](/docs/halo/concepts/spaces-membership/).
- An outside server's tools run on that server. DXOS checks their input against the schema the server gives, and
  nothing more.
