---
title: Connecting
description: The one WebSocket each device keeps to EDGE, and how EDGE knows who is on it.
---

Each device keeps one WebSocket to EDGE. Every EDGE service the device uses shares it, and EDGE knows which identity and
device are on the other end.

## Model

**One WebSocket, many channels.** `@dxos/edge-client` opens the WebSocket when the client starts and multiplexes it: each
service, such as signaling or a space's replication, gets its own channel with its own flow control, so a large sync
does not hold up signaling.

**Authentication.** When the WebSocket opens, EDGE sends a challenge. The device signs it with its device key and sends
the signature with the HALO credential chain that admits that device to its identity. EDGE checks the chain, so it knows
the identity behind the device without a password or a session cookie. HTTP requests to EDGE's services carry the same
proof.

**The router.** EDGE keeps a router per identity. It holds the WebSockets of the identity's online devices and delivers
messages addressed to the identity or to one of its devices.

**Feature flags.** `runtime.client.edgeFeatures` turns on what the device uses EDGE for:

| Flag                   | Turns on                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `signaling`            | EDGE as the signaling server for [MESH](/docs/mesh/concepts/signaling/) |
| `subductionReplicator` | Replicating Automerge documents with EDGE's copy                       |
| `feedReplicator`       | Replicating feeds with EDGE's copy                                     |
| `agents`               | Agents that run on EDGE                                                |

## Behavior

- When the WebSocket drops, the client reconnects with backoff and authenticates again. Channels resume where they
  left off; replication catches up from what each side has.
- While the device is offline, everything local works: reads, writes and queries over loaded objects. Changes go to EDGE
  when it reconnects.
- Swarms, signaling between peers and ICE/TURN are [MESH](/docs/mesh/concepts/signaling/)'s. This page covers only the link
  between a device and EDGE.

## Limits

- Without the WebSocket, a device cannot meet new peers, recover an identity or query EDGE's index.
- EDGE accepts only identities linked to a DXOS account. Without one, requests return `403`.
