---
title: Overview
description: What MESH is, and where ECHO and HALO use it.
welcome:
  section: MESH
  tagline: Peer-to-peer networking and replication.
  background: mesh
---

MESH is the networking under ECHO and HALO. It finds the other devices in a space and carries replication, presence and
invitations to them. MESH multiplexes transports: a direct WebRTC link to a peer and the WebSocket to EDGE are both ways
for it to reach another device, and a space uses both at once.

## How devices reach each other

Every device keeps one WebSocket to [EDGE](/docs/edge/overview/). EDGE plays two parts there. It is the signaling
server that introduces peers to each other, and it is a peer of its own that holds a copy of each space. After the
introduction, two devices open a direct WebRTC link and replicate over it. When no direct link can be made, or the
other device is offline, the data still reaches it through EDGE.

```text
  Device A ────── direct WebRTC link (Teleport) ────── Device B
      │                                                    │
      └──── WebSocket ──── EDGE ──── WebSocket ────────────┘
            signaling, and replication to EDGE's copy
```

## Where ECHO and HALO use MESH

| What                    | Who uses it | How                                                                                                                              |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Space replication       | ECHO        | Each open space joins a [swarm](/docs/mesh/concepts/swarms/) and replicates its documents and feeds over every link in it        |
| Presence                | ECHO, HALO  | Peers in a swarm [announce](/docs/mesh/concepts/presence/) that they are online                                                  |
| Device sync             | HALO        | An identity's devices join a swarm of their own and replicate the identity's state                                               |
| Invitations             | HALO        | Host and guest of an interactive [invitation](/docs/halo/concepts/invitations/) meet in a swarm keyed by the invitation          |
| Going offline           | Apps        | `client.mesh.updateConfig(ConnectionState.OFFLINE)` leaves every swarm; the tutorials' offline switch calls it                   |

## How these pages are organized

MESH is plumbing that apps rarely call. These pages explain how it works, so there is no learning path, API group or
guides.

- [Why MESH?](/docs/mesh/why-mesh/) argues for direct links when EDGE already holds a copy of every space.
- [Architecture](/docs/mesh/concepts/architecture/) shows the layers, from the transport up to the extensions ECHO and
  HALO run. The other concept pages take one layer each.
- The [glossary](/docs/mesh/resources/glossary/) defines every MESH term.
