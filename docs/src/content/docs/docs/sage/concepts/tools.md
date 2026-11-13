---
title: Operations as tools
description: How an agent sees and calls the operations a person would.
---

An agent's tools are operations. The schema and description that tell a person what an operation does tell the model
too, so a plugin that defines an operation has given it to agents without writing anything more.

## Model

**From operation to tool.** An operation's key becomes the tool's name, its description becomes the tool's description,
and its input schema, with each field's description, becomes the tool's parameters. When the model calls the tool, the
invoker checks the input against the schema and runs the handler, the same way it does for a button. See EDGE's
[Operations](/docs/edge/concepts/operations/).

**Which tools a turn has.** A turn does not get every operation in the space. It gets the operations named by the
[skills](/docs/sage/concepts/skills/) enabled in the chat, plus the tools of the chat's MCP servers. An agent finds
more by searching the registry for a skill that covers the task and enabling it.

**Code mode.** By default, Composer's agents run in code mode. The model gets one tool, `eval`, and does its work by
writing a short program against the workspace: queries, operation calls, loops and conditions. The program runs in a
sandboxed worker with its own ECHO client. Only what the program prints, or the value it returns, comes back to the
model. A task that would take twenty tool calls, each sending its result back through the model, is one program.

|                          | Tool calling                    | Code mode                                                              |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| Tools the model sees     | One per operation in its skills | One, `eval`                                                            |
| What comes back          | Every call's full result        | Only what the program prints                                           |
| A loop over many objects | One tool call per object        | One program                                                            |
| An error                 | A failed tool call              | The output so far and a short error, so the model can rewrite the code |

## Behavior

- An operation's mutation hint, whether it changes nothing, writes, or destroys data, goes with the tool, so a host can
  ask before a destructive call.
- Results that are ECHO objects come back as references with their type and label, so the model can pass them to the
  next operation.
- `dx eval` runs a code-mode program from the command line, and `dx eval --instructions` prints the API it is written
  against.

## Limits

- A model sees only an operation's schema and description. An operation without a clear description is hard for an
  agent to use well.
- In code mode the output is cut at 8,000 characters, so a program should print a summary, not every object.
- Code mode needs a worker and an ECHO client. Where neither is available, the agent falls back to tool calling; it
  never runs the code in the page.
