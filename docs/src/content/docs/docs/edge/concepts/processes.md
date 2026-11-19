---
title: Processes
description: One running invocation, with its own services, lifetime and trace.
---

A process is one run of an [operation](/docs/edge/concepts/operations/). It holds the services the operation needs, it
has a state that the app can watch, and it keeps a trace of what it did. A process can run in the app, in a browser
worker or on EDGE, and the app sees them all in one list.

## Model

An operating system runs each program as a process, with a parent, a state and a way to stop it. Compute does the same
for each run of an operation.

The **process manager** spawns processes and keeps their tree. A process that starts other work spawns it as a child,
linked to itself.

How long a process lives depends on its operation:

- A short operation becomes a process that takes one input, runs the handler and exits.
- A durable operation, such as an agent, is a process that takes input many times, is idle between inputs and resumes
  where it left off.

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

These pages say a process **hibernates** when it waits on a child or an alarm, and is idle when it waits for input.

**Layer stack.** A **layer** is a recipe that builds one or more services, and the **layer stack** is the set of layers
a process gets its services from. Each layer has an **affinity**, which says how widely one instance is shared: across
the whole application, per space, or per process. The services include:

- The space's ECHO database. The process reads and writes objects through it like a device.
- Storage of its own. This is a key-value store scoped to the process, and it survives hibernation.
- The space's **secrets**, which are API keys and tokens for outside services.
- The trace, and `AiService` for operations that call a model.

A service the runtime cannot provide is left out, and a layer that needs a missing service is not built.

**Local and remote.** The same operation can run in the app, in a browser worker or on EDGE. The app spawns a process
on EDGE by naming the operation's key, or its deployment id when it was deployed.

The process list merges the local tree with the one EDGE reports. Each control, such as cancel, goes to the runtime
that holds the process.

**Deployed operations.** You can keep operation code as an ECHO object in the space and deploy it to EDGE. EDGE builds
it and gives it a deployment id. The deployed operation runs with the space's secrets. EDGE can hold a secret on the
space's behalf, so the secret is not replicated to every device.

An operation that works through a long source, such as a mailbox or a chat history, can stream it with
`@dxos/pipeline`. A **pipeline** is a chain of stages over an Effect stream, with back pressure. It saves a cursor to
the process's storage as it goes, so a process that is stopped and run again resumes where it left off. A pipeline
runs inside one process and is not a separate kind of compute.

## Behavior

- A process that hibernates can be written to storage and dropped from memory. When its alarm fires or its child
  exits, the runtime loads it again and it continues. On EDGE, this lets a
  [Durable Object](/docs/edge/concepts/architecture/) stop running between an agent's turns.
- An operation can declare requirements, such as permission to write to a space. A process runs such an operation only
  if its **guard** admits it. A guard is a check the process is spawned with, and a child process inherits its
  parent's.
- A finished process clears its storage.

## Limits

- An operation's input reaches a remote process as serialized data, so it must not hold live objects or functions.
- Use process storage for a process's own state, such as a cursor. Put data that people or other processes need in
  ECHO objects.
