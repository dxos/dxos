---
title: Agents
description: A model in a loop, acting in a space with its own identity.
---

An agent is a model in a loop. Each turn it reads the chat, calls operations, reads their results and answers. A SAGE
agent has an identity of its own, and its work runs as a durable process, so it keeps going while no one is watching.

## Model

**Agent object.** An agent is an object that holds a name, an identity, instructions, the skills it starts with, and a switch that turns
its automation on or off. Its chats are children of it in the space.

**Chat.** A chat is the conversation an agent works in. It holds a feed of messages, the model and settings for the
session, the skills and objects added to it, and the tasks of the agent's plan. A chat with no agent is a plain chat,
such as one with Composer's assistant.

**Process and turns.** A chat runs as an agent [process](/docs/edge/concepts/processes/). A message is input to the
process. The process runs a turn: it calls the model, invokes the [operations](/docs/sage/concepts/tools/) the model asks
for, feeds the results back, and repeats until the model answers. Between turns the process is idle, and it hibernates
while it waits on a timer or a sub-agent.

**Identity.** An agent has its own HALO identity, a DID. What it writes is attributed to that identity, so members see
which agent made a change, apart from the person who asked and from other agents. See HALO's
[Identities and devices](/docs/halo/concepts/identities-devices/).

**Delegation.** An agent can hand tasks in its plan to sub-agents. Each runs as a child process. The parent's turn ends
when its own reply is done; when a child finishes, the parent wakes, reads the child's result, updates the task and
posts what it found.

**Outside agent loops.** An agent loop from elsewhere, such as the Claude Agent SDK, can run as a host on a device. It
brings its own tools and loop, and DXOS keeps its output as messages in the chat's feed, like any other agent's.

## Behavior

- An agent's chats run on EDGE, so it answers messages and fires its triggers while every device is offline. A plain
  chat runs in the app.
- An agent sees the objects added to its chat and anything it can query in the space. It changes them only through
  operations.
- Writes made during an agent's turn are attributed to the agent, including writes by the operations it calls.
- Turning an agent off turns off its triggers too.

## Limits

- An agent can do only what its operations do. If no operation it can reach changes a kind of object, the agent cannot
  change it.
- An outside agent loop runs only on the device that hosts it, and only while that device is online.
- An agent on EDGE uses a hosted model; local models are reachable only from the device that runs them. See
  [Models](/docs/sage/concepts/models/).
