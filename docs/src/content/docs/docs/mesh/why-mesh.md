---
title: Why MESH?
description: Why devices connect to each other directly, and why a server stays one of the routes.
---

Most apps send every change through a server, even between two laptops on the same desk. MESH links devices to each
other directly. A direct link has three advantages:

- It is faster between nearby devices.
- It keeps working when the internet or the server is out of reach.
- It carries data that reaches no server unless WebRTC has to fall back to a TURN relay.

A server stays one of the routes, for the devices a direct link cannot reach.

## The pattern

Two devices join the same topic. The signaling server introduces them, and they open a direct link. A change made on
one device arrives on the other over that link.

When a server peer is on the topic too, the same change also goes to it. This means a third device that comes online
later gets the change from the server peer.

## Only through a server, against a direct link

|                                    | Through a server only                   | Direct link between devices                 |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Latency between two nearby devices | A round trip to the nearest data centre | The local network, or the shortest route    |
| Devices never online together      | Works: EDGE holds the copy              | Does not work on its own                    |
| Server unreachable                 | Sync stops                              | Sync continues between the devices it links |
| Who handles the data in transit    | The server                              | The two devices, and a TURN relay if needed |
| Peers behind strict NAT            | Works                                   | Needs a TURN relay                          |

Neither column is enough alone, so MESH uses both. The server is one more transport, not a separate path beside MESH.

## Practical problems

### Two devices in one room

Two laptops on the same network editing one document should not wait on a data centre. Over a direct link, a change
arrives in the time the local network takes.

### The server is down or unreachable

If your device loses its route to the server but can still reach its peers, it keeps syncing with them. When the
server comes back, both sides catch up with it.

### Devices that are rarely online together

A phone and a laptop that are never awake at the same time can never form a direct link. A server peer is the
transport that reaches them. Each device syncs with the server's copy when it is online.

### Data on a direct link

A direct link carries data between the two devices on it. The data goes through a TURN relay only when the devices
have no route to each other.

## Today: both at once

[EDGE](/docs/edge/overview/) is both the signaling server and the server peer. It holds an always-online copy of each
space that replicates through it. See [Replication and backup](/docs/edge/concepts/replication/).

That data reaches EDGE. EDGE can read it only if the space gives EDGE more than `pull` access. See HALO's
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

ECHO replicates each space over its swarm's direct links and through EDGE at the same time. A space can turn the EDGE
side off with `Space.setEdgeReplication`. A space with EDGE replication off syncs only over direct links.

The `subductionReplicator` and `feedReplicator` flags in `runtime.client.edgeFeatures` control the EDGE side. Composer,
the `dx` CLI and the configuration in [Installation](/docs/echo/learn/installation/) turn both on.

CRDT merging makes the duplicate delivery harmless. A change that arrives twice is applied once.

## Next

[Architecture](/docs/mesh/concepts/architecture/) shows how the pieces fit together.
