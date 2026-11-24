---
title: Transports
description: The links MESH carries its protocols over, and how it uses several at once.
---

A transport moves bytes between a device and a **peer**, which is another device or EDGE. MESH multiplexes transports.
Here that means the same data goes over whichever transport reaches the peer, and a space uses more than one at once.

## Model

MESH has four transports.

| Transport      | Where                 | Notes                                                                                |
| -------------- | --------------------- | ------------------------------------------------------------------------------------ |
| WebRTC         | Browsers and Electron | The default between devices. Uses ICE to find a route, and TURN when there is none   |
| TCP            | Node                  | For Node peers, such as agents and tests, that can reach each other directly         |
| Memory         | Tests                 | Connects peers in the same process                                                   |
| EDGE WebSocket | Everywhere            | The device's one WebSocket to EDGE. Carries signaling and replication to EDGE's copy |

ICE is how WebRTC finds a route between two devices, and a TURN server relays the bytes when it finds none. See
[Signaling and discovery](/docs/mesh/concepts/signaling/).

WebRTC, TCP and memory each make a **direct link**, a connection between two devices, and the link carries a
[Teleport](/docs/mesh/concepts/teleport/) session.

The EDGE WebSocket is a transport of another kind. It links a device to EDGE, not to another device. It carries no
Teleport session, and it multiplexes its own channels, one per EDGE service. See
[Connecting](/docs/edge/concepts/connecting/).

## Several transports at once

A space's changes leave a device two ways:

- They go over each direct link in the space's [swarm](/docs/mesh/concepts/swarms/), the set of direct links the
  device keeps for that space.
- They go over the WebSocket to EDGE, which keeps a copy and passes them on to the devices it reaches.

Another device may get the same change by both routes. CRDT merging applies it once.

A device does not choose one transport per peer. It sends both ways, and each peer gets the changes by the route
that reaches it:

- If a peer is reachable directly, it gets changes quickly over the direct link.
- If a peer is offline, or behind a network no direct link crosses, it gets them through EDGE.

## Behavior

- In the browser, the client's services run in a browser worker, which cannot open WebRTC connections. The tab opens
  them and passes the bytes to the worker.
- A dropped direct link does not lose data when the space replicates through EDGE. EDGE has every change that reached
  it, and the next link catches up. With EDGE replication off, the changes wait on the device for the next direct
  link.

## Limits

- No transport dials a peer by its public key yet. [Iroh](https://www.iroh.computer/), a QUIC transport that does, is
  planned. It traverses NATs itself and falls back to a relay. A design in `packages/core/mesh/iroh` would first use
  it for presence and gossip directly between peers, beside EDGE. The design has no code yet.
