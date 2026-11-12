---
title: Transports
description: The links MESH carries its protocols over, and how it uses several at once.
---

A transport moves bytes between two devices. MESH multiplexes transports: the same data reaches a peer over whichever
link reaches it, and a space uses more than one at once.

## Model

| Transport      | Where                 | Notes                                                                                     |
| -------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| WebRTC         | Browsers and Electron | The default between devices. Uses ICE to find a route, and TURN when there is none        |
| TCP            | Node                  | For Node peers, such as agents and tests, that can reach each other directly              |
| Memory         | Tests                 | Connects peers in the same process                                                        |
| EDGE WebSocket | Everywhere            | The device's one connection to EDGE; carries signaling and replication to EDGE's copy     |

WebRTC, TCP and memory carry a [Teleport](/docs/mesh/concepts/teleport/) session between two devices. The EDGE WebSocket
is different: it links a device to EDGE, not to another device, and it multiplexes its own channels, one per EDGE
service. See [Connecting](/docs/edge/concepts/connecting/).

## Several transports at once

A space's changes leave a device two ways. They go over each direct link in the space's
[swarm](/docs/mesh/concepts/swarms/), and over the WebSocket to EDGE, which keeps a copy and passes them on to the
devices it reaches. Another device may get the same change by both routes. CRDT merging applies it once.

So a device does not choose one transport per peer. A peer reachable directly gets changes quickly over the direct link.
A peer that is offline, or behind a network no direct link crosses, gets them through EDGE.

## Behavior

- In the browser, the client's services run in a worker, which cannot open WebRTC connections. The tab opens them and
  passes the bytes to the worker.
- A dropped direct link does not lose data: EDGE still has the changes, and the next link catches up.

## Planned: Iroh

A design in `packages/core/mesh/iroh` adds [Iroh](https://www.iroh.computer/), a QUIC transport that dials a peer by its
public key and traverses NATs itself, falling back to a relay. The first use would be presence and gossip directly
between peers, beside EDGE. It is a design, with no code yet.
