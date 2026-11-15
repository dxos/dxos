---
title: Traces
description: What ran, when and why, kept so people and agents can see it.
---

Every process records what it does as trace events. The durable ones are kept in the space, so a member can see what a
trigger or an agent did while they were away. The live ones show progress on the devices watching.

## Model

**Events.** A trace event has a type, a timestamp and a payload, and it names the process that wrote it. An operation
writes its own events with `Trace.write`; the runtime writes the rest. Some of the types:

| Event                                 | Written when                                         | Kept    |
| ------------------------------------- | ---------------------------------------------------- | ------- |
| `operation.start`, `operation.end`    | An operation starts, and when it ends or fails       | Durable |
| `operation.input`, `operation.output` | With the start and the end, holding the values       | Live    |
| `status.update`                       | A process reports what it is doing                   | Live    |
| `task.statusChanged`                  | A task in an agent's plan changes state              | Durable |
| `question.asked`, `question.answered` | An agent asks a person something, and gets an answer | Durable |
| `assistant.*`                         | An agent's turn begins, streams and ends             | Both    |

**Durable events** go to the space's trace feed, a [feed](/docs/echo/concepts/feeds/) like any other. They replicate to
members and to EDGE, and the app and agents query them like other ECHO data.

**Live events** go to the devices in the space's swarm that are watching the process, and are not stored. A device that
starts watching a running process gets the events buffered so far, then new ones as they come.

## Behavior

- The app's process list and an agent's activity view both read the trace: the durable feed for history, the live
  events for what is happening now.
- A process on EDGE writes to the same trace feed as one in the app, so the history does not depend on where it ran.
- Operation inputs and outputs are live only, so the values an operation handled are not kept in the space's history.

## Limits

- Live events reach only devices that are online and watching. A device that opens the process later sees only the
  durable events.
- Trace events are appended in batches about half a second apart, so the durable history trails a running process
  slightly.
