---
title: Glossary
description: Every MESH term, defined once.
---

EDGE's terms, such as router, Durable Object and environment, are in EDGE's [glossary](/docs/edge/resources/glossary/).

### [Always-online peer](/docs/mesh/why-mesh/)

An always-online peer is a server that joins a [topic](#topic) as a [peer](#peer) and holds a copy of the topic's
data. It reaches devices that are never online together. In DXOS it is EDGE.

### Channel

A channel is one named stream of bytes inside a [Teleport](#teleport) session. Each [extension](#extension) gets
channels of its own, so protocols share a [direct link](#direct-link) without blocking each other.

### Direct link

A direct link is a connection between two devices, opened by a [swarm](#swarm) over a [transport](#transport) such as
WebRTC. The code calls it a connection. The other link a device has is its WebSocket to EDGE.

### [Extension](/docs/mesh/concepts/teleport/)

An extension is a named protocol that runs over a [Teleport](#teleport) session, such as replication or gossip. Both
sides must add it before it opens.

### Gossip

Gossip is passing a message on from one device to the next, so that it reaches devices its sender has no
[direct link](#direct-link) to. [Presence](#presence) announcements travel this way.

### ICE

ICE, short for Interactive Connectivity Establishment, is how WebRTC finds a route between two devices from candidate
addresses. You configure ICE servers with `runtime.services.ice` and `runtime.services.iceProviders`.

### [MMST](/docs/mesh/concepts/swarms/)

MMST, short for mostly minimal spanning tree, is the [topology](#topology) that space swarms use. Each device links to
a few peers nearest its own key, so the swarm usually stays connected without linking every pair. A connected swarm
is not guaranteed, and EDGE covers the gaps.

### [Network status](/docs/mesh/concepts/presence/)

Network status is a device's own connection state, read from `client.mesh.networkStatus`. It says whether the device
is in its swarms, and the state of its signaling connections.

### Peer

A peer is anything a device exchanges a [topic](#topic)'s data with. Other devices on the topic are peers, and so is
EDGE, the [always-online peer](#always-online-peer).

### Presence

Presence is how a device learns which members and devices are online, from the announcements each device gossips to
its swarm.

### Signal manager

A signal manager is the part of the client that talks to the signaling server. It joins and leaves topics, lists the
peers on a topic and carries the messages that open a [direct link](#direct-link). See
[Signaling and discovery](/docs/mesh/concepts/signaling/).

### [Signaling](/docs/mesh/concepts/signaling/)

Signaling introduces the peers on a [topic](#topic) and relays the offers, answers and WebRTC signals that open a
direct link. EDGE is the signaling server.

### Swarm

A swarm is the set of [direct links](#direct-link) a device keeps for one [topic](#topic). Each open space has one.

### Teleport

Teleport is the session two devices run over one [direct link](#direct-link). It multiplexes named
[channels](#channel) and runs [extensions](#extension) on them.

### Topic

A topic is the key that names a [swarm](#swarm). A space's topic is its space ID, the first 20 bytes of the SHA-256
of its space key. An invitation carries its own.

### Topology

A topology is the rule a [swarm](#swarm) follows to choose which peers to link to: [MMST](#mmst), invitation,
fully connected or star.

### [Transport](/docs/mesh/concepts/transports/)

A transport is what moves bytes between a device and a [peer](#peer): WebRTC, TCP, memory, or the WebSocket to EDGE.

### TURN

TURN, short for Traversal Using Relays around NAT, is the kind of server that relays a WebRTC link's encrypted bytes
when no direct route between two devices exists.
