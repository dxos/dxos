---
title: Glossary
description: Every EDGE term, defined once.
---

MESH's terms, such as swarm, signaling and TURN, are in MESH's [glossary](/docs/mesh/resources/glossary/).

### Agent device

An agent device is a device of an identity, of kind `agent-managed`, whose key EDGE holds. An identity has one only
if it grants EDGE that access. It signs credentials when another EDGE service asks, and it is not a SAGE agent. See
[Identity services](/docs/edge/concepts/identity-services/).

### [Always-online peer](/docs/edge/why-edge/)

An always-online peer is a server that devices sync a space with, as they sync with each other. EDGE is the
always-online peer for every space that replicates through it.

### [Durable Object](/docs/edge/concepts/architecture/)

A Durable Object is a small Cloudflare server with its own storage, named by a key and created on first use. EDGE
keeps one or more per space, per identity and per agent.

### Environment

An environment is one deployment of EDGE: production, preview or dev, each at its own URL.

### Guard

A guard is a check a [process](#process) is spawned with. It admits or refuses the operations the process invokes
that declare requirements. A child process inherits its parent's guard.

### [Handler](/docs/edge/concepts/operations/)

A handler is the code that does an operation's work. It takes the input and returns an Effect that produces the
output. A handler set groups the handlers a runtime loads together.

### Hibernation

Hibernation is the state of a [process](#process) that waits on a child process or an alarm. A hibernating process
can be written to storage and dropped from memory. A process that waits for input is idle instead.

### Hub

Hub is the EDGE service that keeps DXOS accounts, email verification and the invitations that bring people to DXOS.

### [Index](/docs/edge/concepts/indexing/)

An index is a lookup from a type, a property or a relation to the objects that have it. EDGE keeps one for each space
it can read, and queries read it beside the device's own.

### Invoker

The invoker finds an operation's handler by key, checks the input and output against the schemas, and runs it.

### Layer stack

A layer stack is the set of layers that give a process its services. A layer builds one or more services, and its
affinity says whether one instance serves the application, a space or one process. See
[Processes](/docs/edge/concepts/processes/).

### [Operation](/docs/edge/concepts/operations/)

An operation is a typed action over ECHO objects, with a key, an input schema and an output schema. People, agents
and triggers run it the same way.

### Operation registry

The operation registry is the set of operation definitions kept as ECHO objects, which agents and the MCP server
search. An operation that sets `skipRegistry` is not in it.

### Pipeline

A pipeline is a chain of stages over a stream. An operation uses one to work through a long source, with a cursor to
resume.

### Plugin registry

The plugin registry is the EDGE service that indexes published plugins and hosts their bundles. See
[Compute](/docs/edge/concepts/compute/).

### Process

A process is one run of an operation, with its own services, state and trace, in the app or on EDGE. See
[Processes](/docs/edge/concepts/processes/).

### [Replicator](/docs/edge/concepts/replication/)

A replicator is a Durable Object that keeps EDGE's copy of one space's data in sync with devices. A space has one for
Automerge documents and one for feeds.

### Router

The Router is the EDGE service where each device's WebSocket ends. It keeps a Durable Object per identity, which
holds the identity's WebSockets and delivers messages between its devices. See
[Connecting](/docs/edge/concepts/connecting/).

### Secret

A secret is an API key or a token for an outside service, kept for a space. A process gets the space's secrets as a
service, and EDGE can hold one so that it is not replicated to every device.

### Service access

Service access is a credential that lets an identity use an EDGE or Hub service, written with `Identity.grantServiceAccess`.

### [Trace](/docs/edge/concepts/traces/)

A trace is the set of events a process records. Durable events go to the space's trace feed, and live events go to
the devices watching.

### Trigger

A trigger is an ECHO object that starts an operation on a schedule, on a change, or on a message from outside. See
[Triggers](/docs/edge/concepts/triggers/).

### Worker

A Worker is a Cloudflare Worker. Each EDGE service is one, deployed on its own and reached through the `edge` Worker
at its path. A browser worker, the thread a web app runs code in beside its page, is a different thing, and these
pages always call it a browser worker.
