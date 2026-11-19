---
title: Why MESH?
description: Why devices connect to each other directly, and why a server stays one of the routes.
---

Most apps send every change through a server, even between two laptops on the same desk. MESH links devices to each
other directly. A direct link has three advantages:

- It is faster between nearby devices.
- It keeps working when the internet or the server is out of reach.
- It carries data that reaches no server unless WebRTC has to fall back to a TURN relay.

A **TURN relay** is a server that forwards a link's encrypted bytes between two devices that have no route to each
other. A server also stays one of MESH's routes, for the devices a direct link cannot reach.

## The pattern

Two devices join the same **topic**, the key that names the group of devices sharing one space. The signaling server
introduces them, and they open a direct link. A change made on one device arrives on the other over that link.

A server can join the topic as well. It is then an **always-online peer**, and the same change also goes to it. A
third device that comes online later gets the change from the always-online peer.

## Only through a server, against a direct link

|                                    | Through a server only                   | Direct link between devices                 |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Latency between two nearby devices | A round trip to the nearest data center | The local network, or the shortest route    |
| Devices never online together      | Works. EDGE holds the copy              | Does not work on its own                    |
| Server unreachable                 | Sync stops                              | Sync continues between the devices it links |
| Who handles the data in transit    | The server                              | The two devices, and a TURN relay if needed |
| Peers behind strict NAT            | Works                                   | Needs a TURN relay                          |

Neither column is enough alone, so MESH uses both. The server is one more transport, not a separate path beside MESH.

## Practical problems

### Two devices in one room

Two laptops on the same network editing one document should not wait on a data center. Over a direct link, a change
arrives in the time the local network takes.

### The server is down or unreachable

If your device loses its route to the server but can still reach its peers, it keeps syncing with them. When the
server comes back, both sides catch up with it.

### Devices that are rarely online together

A phone and a laptop that are never awake at the same time can never form a direct link. An always-online peer is the
transport that reaches them. Each device syncs with that peer's copy when it is online.

### Data on a direct link

Some data should pass through as few machines as it can. On a direct link, only the two devices handle it. When the
devices have no route to each other, WebRTC sends the link through a TURN relay, which forwards the bytes encrypted.

## Today: both at once

[EDGE](/docs/edge/overview/) is both the signaling server and the always-online peer. It holds a copy of each space
that replicates through it. See [Replication and backup](/docs/edge/concepts/replication/).

A space that replicates through EDGE sends EDGE its changes. EDGE can read them only if the space gives EDGE more than
`pull` access, the lowest access level, which lets a member store and relay the space's encrypted data. See HALO's
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

ECHO replicates each space two ways at the same time. One is the space's **swarm**, the set of direct links a device
keeps for the space's topic. The other is EDGE.

Two settings control the EDGE side:

- The `subductionReplicator` and `feedReplicator` flags in `runtime.client.edgeFeatures` are set per client. They
  decide whether the client replicates with EDGE at all. Composer, the `dx` CLI and the configuration in
  [Installation](/docs/echo/learn/installation/) turn both on.
- `Space.setEdgeReplication` is set per space. On a client with the flags on, it turns the EDGE side off for one
  space. That space then syncs only over direct links.

CRDT merging makes the duplicate delivery harmless. A change that arrives twice is applied once.

## Next

[Architecture](/docs/mesh/concepts/architecture/) shows how the pieces fit together.
