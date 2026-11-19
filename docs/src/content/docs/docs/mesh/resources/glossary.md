---
title: Glossary
description: Every MESH term, defined once.
---

EDGE's terms, such as router, Durable Object and environment, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### Extension

An extension is a named protocol that runs over a [Teleport](#teleport) session, such as replication or gossip. Both
sides must add it before it opens. See [Teleport](/docs/mesh/concepts/teleport/).

### ICE

ICE, short for Interactive Connectivity Establishment, is how WebRTC finds a route between two devices from candidate
addresses. You configure ICE servers with `runtime.services.ice` and `runtime.services.iceProviders`.

### MMST

MMST is the [topology](#topology) that space swarms use. Each device connects to a few peers nearest its own key, so
the swarm usually stays connected without linking every pair. A connected swarm is not guaranteed, and EDGE covers
the gaps. See [Swarms and topology](/docs/mesh/concepts/swarms/).

### Network status

Network status is a device's own connection state, read from `client.mesh.networkStatus`. It says whether the device
is in its swarms, and the state of its signaling connections. See [Presence and network status](/docs/mesh/concepts/presence/).

### Presence

Presence is how a device learns which members and devices are online, from the announcements each device gossips to
its swarm.

### Signaling

Signaling introduces the peers on a [topic](#topic) and relays the offers, answers and WebRTC signals that open a
direct link. EDGE is the signaling server. See [Signaling and discovery](/docs/mesh/concepts/signaling/).

### Swarm

A swarm is the set of connections a device keeps for one [topic](#topic). Each open space has one.

### Teleport

Teleport is the session two devices run over one connection. It multiplexes named channels and runs
[extensions](#extension) on them.

### Topic

A topic is the key that names a [swarm](#swarm). A space's topic is its space ID, the first 20 bytes of the SHA-256
of its space key. An invitation carries its own.

### Topology

A topology is the rule a [swarm](#swarm) follows to choose which peers to connect to: [MMST](#mmst), invitation,
fully connected or star.

### Transport

A transport is what moves bytes between two devices: WebRTC, TCP, memory, or the WebSocket to EDGE. See
[Transports](/docs/mesh/concepts/transports/).

### TURN

A TURN server relays a WebRTC connection's encrypted bytes when no direct route between two devices exists.
