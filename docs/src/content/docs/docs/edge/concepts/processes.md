---
title: Processes
description: One running invocation, with its own services, lifetime and trace.
---

A process is one run of an operation. It holds the services the operation needs, it has a state that the app can
watch, and it keeps a trace of what it did. A process can run in the app, in a worker or on EDGE, and the app sees them
all in one list.

## Model

**Process manager.** The process manager spawns processes and keeps their tree: a process that starts other work
spawns it as a child, linked to itself. A short operation becomes a process that takes one input, runs the handler and
exits. A durable operation, such as an agent, is a process that takes input many times, sleeps between inputs and
resumes where it left off.

**States.** A process is in one of these states:

| State       | Means                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Starting    | The spawn was sent to a remote runtime, which has not acknowledged it yet |
| Running     | It is doing work                                                          |
| Hibernating | It is waiting for a child process or an alarm                             |
| Idle        | It is waiting for input                                                   |
| Terminating | It is being stopped                                                       |
| Terminated  | Something stopped it                                                      |
| Succeeded   | It finished                                                               |
| Failed      | It failed                                                                 |

**Layer stack.** A process gets its services from a stack of layers, each with an affinity: one instance for the whole
application, one per space, or one per process. The services include:

- the space's ECHO database, so the process reads and writes objects like a device;
- storage of its own, a key-value store that survives suspension, scoped to the process;
- the space's credentials, such as API keys for outside services;
- the trace, and the model service for operations that call a model.

A service the runtime cannot provide is left out, and a layer that needs a missing service is not built.

**Local and remote.** The same operation can run in the app, in a worker or on EDGE. The app spawns on EDGE by naming
the operation's key, or its deployment id when it was deployed. The process list merges the local tree with the one
EDGE reports, and each control, such as cancel, goes to the runtime that holds the process.

**Deployed operations.** Operation code can be kept as an ECHO object in the space and deployed to EDGE, which builds
it and gives it a deployment id. The deployed operation runs with the space's credentials, which EDGE can hold on the
space's behalf rather than replicating them to every device.

**Pipelines.** An operation that works through a long source, such as a mailbox or a chat history, can stream it with
`@dxos/pipeline`: a chain of stages over an Effect stream, with back pressure. It saves a cursor to the process's
storage as it goes, so a process that is stopped and run again resumes where it left off. A pipeline runs inside one
process; it is not a separate kind of compute.

## Behavior

- A process that serves an agent's chat writes to the database as the agent, not as the person who started it, and its
  children inherit that. Members see the agent as the author.
- A process that waits on an alarm or a child can be written to storage and dropped from memory. When the alarm fires
  or the child exits, the runtime loads it again and it continues. On EDGE this lets a Durable Object sleep between an
  agent's turns.
- An operation that declares requirements, such as permission to write to a space, is refused unless the process that
  invokes it admits it.
- A finished process clears its storage.

## Limits

- An operation's input reaches a remote process as serialized data, so it must not hold live objects or functions.
- Process storage is for a process's own state, such as a cursor. Data that people or other processes need belongs in
  ECHO objects.
