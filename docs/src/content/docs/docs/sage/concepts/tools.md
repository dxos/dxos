---
title: Operations as tools
description: How an agent sees and calls the operations a person would.
---

An agent's tools are operations. The schema and description that tell a person what an operation does tell the model
too. When your plugin defines an operation, you write no separate tool for agents. An agent gets the operation once a
skill lists it.

## Model

Your app has a "mark as read" action behind a button. What does it take for an agent to call it? A tool needs a name,
a description and a schema for its parameters. An **operation**, the typed action behind the button, has all three.

**From operation to tool.** Each part of the operation becomes a part of the tool:

- Its key becomes the tool's name.
- Its description becomes the tool's description.
- Its input schema, with each field's description, becomes the tool's parameters.

When the model calls the tool, the invoker checks the input against the schema and runs the handler, the same way it
does for a button. See EDGE's [Operations](/docs/edge/concepts/operations/).

**Which tools a turn has.** A turn is one round of the agent's loop, and it does not get every operation in the space.
It gets the operations named by the [skills](/docs/sage/concepts/skills/) enabled in the chat, plus the tools of the
chat's MCP servers. An agent finds more by searching the operation registry for a skill that covers the task and
enabling it.

**Code mode.** In **code mode**, the model gets one tool, `eval`. It does its work by writing a short program against
the **workspace**, which is the space and the operations the program can reach. The program holds queries, operation
calls, loops and conditions. By default, Composer's agents run in code mode.

The program runs in a sandboxed browser worker with its own ECHO client. Only what the program prints comes back to
the model. If the program prints nothing and returns a value, that value comes back instead. A task that would take
twenty tool calls, each sending its result back through the model, is one program.

|                          | Tool calling                    | Code mode                                                              |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| Tools the model sees     | One per operation in its skills | One, `eval`                                                            |
| What comes back          | Every call's full result        | What the program prints, or its return value if it prints nothing      |
| A loop over many objects | One tool call per object        | One program                                                            |
| An error                 | A failed tool call              | The output so far and a short error, so the model can rewrite the code |

## Behavior

- An operation's mutation hint goes with the tool. The hint says whether the operation changes nothing, writes, or
  destroys data, so the app that runs the agent can ask before a destructive call.
- Results that are ECHO objects come back as references with their type and label, so the model can pass them to the
  next operation.
- Use `dx eval` to run a code-mode program from the command line. `dx eval --instructions` prints the API the program
  is written against.

## Limits

- A model sees only an operation's schema and description. An operation without a clear description is hard for an
  agent to use well.
- In code mode the output is cut at 8,000 characters, so a program should print a summary, not every object.
- In Composer, code mode needs its sandbox module and an ECHO client for the browser worker to connect to. If the
  module fails to load, or the app has no client, the agent falls back to tool calling. It never runs the code in the
  page.
