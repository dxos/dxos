---
title: Signaling and discovery
description: How a device finds the peers in a space and sets up a direct link.
---

Signaling is how a device learns which peers are on a topic and exchanges the messages that open a direct connection
to one of them. EDGE is the signaling server.

## Model

**The signal manager.** Each device has one signal manager. With `runtime.client.edgeFeatures.signaling` on, it is
the EDGE signal manager, which sends everything over the device's [WebSocket to EDGE](/docs/edge/concepts/connecting/).
Without it, the client uses an in-memory signal manager that only reaches peers in the same process, which is what tests
use.

**Topics.** A swarm is named by a topic, a 32-byte key. A space's topic is derived from its space key, so every member
of the space, and EDGE, computes the same one. An invitation has a topic of its own, carried in the invitation code.

**Join, query and leave.** A device joins a topic to say it is there, queries the topic to list the peers on it, and
leaves when it closes the space. EDGE tells each peer on the topic when another joins or leaves.

**Offers, answers and signals.** To connect, one peer sends an offer to another through EDGE, and the other accepts
or rejects it with an answer. The two then trade WebRTC signals, the session description and ICE candidates, until
the direct link opens. From then on, nothing for that connection goes through signaling.

```text
 Device A                    EDGE                     Device B
    │── join(topic) ──────────▶│◀──────── join(topic) ──│
    │◀─ peer B on topic ───────│── peer A on topic ────▶│
    │── offer ────────────────▶│── offer ──────────────▶│
    │◀─ answer ────────────────│◀─ answer ──────────────│
    │◀═══ signals (SDP, ICE candidates) relayed ═══════▶│
    │◀════════════ direct WebRTC link ═════════════════▶│
```

**ICE and TURN.** WebRTC finds a route between two devices from ICE candidates. Behind most home routers a direct
route exists. Behind strict NATs and firewalls it does not, and the connection goes through a TURN server, which
relays the encrypted bytes.

## Configuration

| Setting                                  | Effect                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `runtime.client.edgeFeatures.signaling`  | Uses EDGE as the signaling server. Without it, devices in different processes never meet   |
| `runtime.services.ice`                   | A fixed list of ICE servers (STUN and TURN), passed straight to WebRTC                     |
| `runtime.services.iceProviders`          | URLs that return ICE servers, fetched once and cached; DXOS runs one at `https://dxos.network/ice` |

The configuration in [Installation](/docs/echo/learn/installation/) sets the signaling flag and the DXOS ICE provider.
See EDGE's [Configuration](/docs/edge/resources/configuration/) for the rest.

## Behavior

- Signaling carries only the messages that set up a connection. Replication never goes through it.
- A device that loses its WebSocket keeps its open direct links. It cannot open new ones until it reconnects.

## Limits

- Without signaling, two devices only meet if they share a process. Turning it off is for tests.
- A TURN relay sees encrypted bytes only, but every byte of that connection goes through it.
