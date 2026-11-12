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

### Hub

The EDGE service that keeps DXOS accounts, email verification and the invitations that bring people to DXOS.

### Index

EDGE's index of a space, which queries read beside the device's own. See
[Indexing and queries](/docs/edge/concepts/indexing/).

### Replicator

A Durable Object that keeps EDGE's copy of one space's data in sync with devices: one for Automerge documents, one for
feeds. See [Replication and backup](/docs/edge/concepts/replication/).

### Router

The Durable Object per identity that holds its devices' WebSockets and delivers messages between them. See
[Connecting](/docs/edge/concepts/connecting/).

### Service access

A credential that lets an identity use an EDGE or Hub service, written with `Identity.grantServiceAccess`.

### Worker

A Cloudflare Worker: one EDGE service, deployed on its own and reached through the front door at its path.
