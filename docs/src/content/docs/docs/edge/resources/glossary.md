---
title: Glossary
description: Every EDGE term, defined once.
---

MESH's terms, such as swarm, signaling and TURN, are in MESH's [glossary](/docs/mesh/resources/glossary/).

### Durable Object

A small Cloudflare server with its own storage, named by a key and created on first use. EDGE keeps one or more per
space, per identity and per agent. See [Architecture](/docs/edge/concepts/architecture/).

### Environment

One deployment of EDGE: production, preview or dev, each at its own URL.

### Handler

The Effect that does an operation's work. A handler set groups the handlers a runtime loads together. See [Operations](/docs/edge/concepts/operations/).

### Hub

The EDGE service that keeps DXOS accounts, email verification and the invitations that bring people to DXOS.

### Index

EDGE's index of a space, which queries read beside the device's own. See
[Indexing and queries](/docs/edge/concepts/indexing/).

### Invoker

What finds an operation's handler by key, checks the input and output against the schemas, and runs it.

### Layer stack

The layers that give a process its services, each scoped to the application, a space or the process. See [Processes](/docs/edge/concepts/processes/).

### Operation

A typed action over ECHO objects, with a key, an input schema and an output schema, run the same way by people, agents and triggers. See [Operations](/docs/edge/concepts/operations/).

### Pipeline

A chain of stages over a stream, used inside an operation to work through a long source, with a cursor to resume.

### Process

One run of an operation, with its own services, state and trace, in the app or on EDGE. See [Processes](/docs/edge/concepts/processes/).

### Replicator

A Durable Object that keeps EDGE's copy of one space's data in sync with devices: one for Automerge documents, one for
feeds. See [Replication and backup](/docs/edge/concepts/replication/).

### Router

The Durable Object per identity that holds its devices' WebSockets and delivers messages between them. See
[Connecting](/docs/edge/concepts/connecting/).

### Service access

A credential that lets an identity use an EDGE or Hub service, written with `Identity.grantServiceAccess`.

### Trace

The events a process records: durable ones in the space's trace feed, live ones to the devices watching. See [Traces](/docs/edge/concepts/traces/).

### Trigger

An ECHO object that starts an operation on a schedule, on a change, or on a message from outside. See [Triggers](/docs/edge/concepts/triggers/).

### Worker

A Cloudflare Worker: one EDGE service, deployed on its own and reached through the front door at its path.
