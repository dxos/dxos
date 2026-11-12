---
title: Glossary
description: Every MESH term, defined once.
---

EDGE's terms, such as router, Durable Object and environment, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### Extension

A named protocol that runs over a [Teleport](#teleport) session, such as replication or gossip. Both sides must add it
before it opens. See [Teleport](/docs/mesh/concepts/teleport/).

### ICE

Interactive Connectivity Establishment: how WebRTC finds a route between two devices from candidate addresses. ICE
servers are configured with `runtime.services.ice` and `runtime.services.iceProviders`.

### MMST

The [topology](#topology) space swarms use. Each device connects to a few peers nearest its own key, so the whole swarm
stays connected without linking every pair. See [Swarms and topology](/docs/mesh/concepts/swarms/).

### Network status

A device's own connection state, read from `client.mesh.networkStatus`: whether it is in its swarms, and the state of
its signaling connections. See [Presence and network status](/docs/mesh/concepts/presence/).

### Presence

Which members and devices are online, learned from the announcements each device gossips to its swarm.

### Signaling

Introducing the peers on a [topic](#topic) and relaying the offers, answers and WebRTC signals that open a direct link.
EDGE is the signaling server. See [Signaling and discovery](/docs/mesh/concepts/signaling/).

### Swarm

The set of connections a device keeps for one [topic](#topic). Each open space has one.

### Teleport

The session two devices run over one connection. It multiplexes named streams and runs [extensions](#extension) on them.

### Topic

The 32-byte key that names a [swarm](#swarm). A space's topic is derived from its space key; an invitation carries its
own.

### Topology

The rule a [swarm](#swarm) follows to choose which peers to connect to: [MMST](#mmst), invitation, fully connected or
star.

### Transport

What moves bytes between two devices: WebRTC, TCP, memory, or the WebSocket to EDGE. See
[Transports](/docs/mesh/concepts/transports/).

### TURN

A server that relays a WebRTC connection's encrypted bytes when no direct route between two devices exists.
