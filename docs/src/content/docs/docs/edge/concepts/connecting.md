---
title: Connecting
description: The one WebSocket each device keeps to EDGE, and how EDGE knows who is on it.
---

Each device keeps one WebSocket to EDGE. The EDGE services that stream to the device share it, and EDGE knows which
identity and device are on the other end.

## Model

A web app usually sends each request on its own and proves who is calling with a session cookie or a token. A DXOS
device holds one WebSocket open and proves who it is with its keys.

**One WebSocket, many channels.** `@dxos/edge-client` opens the WebSocket when the client starts and multiplexes it. A
**channel** is one service's stream inside the WebSocket. Each service, such as signaling or a space's replication,
gets a channel with its own flow control, so a large sync does not hold up signaling.

**Authentication.** When the WebSocket opens, EDGE sends a challenge. The device signs it with its device key and sends
the signature with the HALO credential chain, the signed records that admit that device to its identity. EDGE checks
the chain, so it knows the identity behind the device without a password or a session cookie. HTTP requests to EDGE's
services carry the same proof.

**The Router.** The **Router** is the EDGE service where each WebSocket ends. It keeps one
[Durable Object](/docs/edge/concepts/architecture/), a small server with its own storage, per identity. That object
holds the WebSockets of the identity's online devices and delivers messages addressed to the identity or to one of its
devices.

**Feature flags.** Use `runtime.client.edgeFeatures` to turn on what the device uses EDGE for:

| Flag                   | Turns on                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `signaling`            | EDGE as the signaling server. See MESH's [Signaling and discovery](/docs/mesh/concepts/signaling/) |
| `subductionReplicator` | Replicating Automerge documents with EDGE's copy                                                   |
| `feedReplicator`       | Replicating feeds with EDGE's copy                                                                 |
| `agents`               | The identity's agent device, whose key EDGE holds                                                  |

An agent device is a device of the identity, and it is not a SAGE agent. See
[Identity services](/docs/edge/concepts/identity-services/).

## Behavior

- When the WebSocket drops, the client reconnects with backoff and authenticates again. Channels resume where they
  left off, and replication catches up from what each side has.
- While the device is offline, everything local works: reads, writes and queries over loaded objects. Changes go to EDGE
  when the device reconnects.
- Swarms, signaling between peers and ICE/TURN belong to MESH. See MESH's
  [Signaling and discovery](/docs/mesh/concepts/signaling/). This page covers only the link between a device and EDGE.

## Limits

- Without the WebSocket, a device cannot meet new peers or replicate with EDGE. Without any route to EDGE, it also
  cannot recover an identity or query EDGE's index.
- EDGE accepts only identities linked to a DXOS account. Without one, requests return `403`.
