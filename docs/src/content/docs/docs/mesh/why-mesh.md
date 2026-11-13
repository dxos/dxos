---
title: Why MESH?
description: Why devices connect to each other directly, and why a server stays one of the routes.
---

Most apps send every change through a server, even between two laptops on the same desk. MESH links devices to each
other directly: a direct link is faster between nearby devices, keeps working when the internet or the server is out
of reach, and carries data that never passes through a server. A server stays one of the routes, for the devices a
direct link cannot reach.

## The pattern

Two devices join the same topic. The signaling server introduces them, they open a direct link, and a change made on
one device arrives on the other over that link. The same change also goes to a server peer, so a third device that
comes online later gets it from there.

## Only through a server, against a direct link

|                                    | Through a server only                   | Direct link between devices                 |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Latency between two nearby devices | A round trip to the nearest data centre | The local network, or the shortest route    |
| Devices never online together      | Works: EDGE holds the copy              | Does not work on its own                    |
| Server unreachable                 | Sync stops                              | Sync continues between the devices it links |
| Who handles the data in transit    | The server                              | Only the two devices                        |
| Peers behind strict NAT            | Works                                   | Needs a TURN relay                          |

Neither column is enough alone, so MESH uses both. The server is one more transport, not a separate path beside MESH.

## Practical problems

### Two devices in one room

Two laptops on the same network editing one document should not wait on a data centre. Over a direct link a change
arrives in the time the local network takes.

### The server is down or unreachable

A device that has lost its route to the server but can still reach its peers keeps syncing with them. When the server
comes back, both sides catch up with it.

### Devices that are rarely online together

A phone and a laptop that are never awake at the same time can never form a direct link. A server peer is the
transport that reaches them: each syncs with the server's copy when it is online.

### Data that stays between devices

A direct link carries data only between the two devices on it. Every connection is authenticated before data flows:
each side proves it holds a key admitted to the topic.

## Today: both at once

[EDGE](/docs/edge/overview/) is both the signaling server and the server peer, and it holds an always-online copy of
each space; see [Replication and backup](/docs/edge/concepts/replication/). The same data reaches EDGE, which can read it
only if the space gives EDGE more than `pull` access; see HALO's
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

ECHO replicates each space over its swarm's direct links and through EDGE at the same time. The EDGE side is controlled by
the `subductionReplicator` and `feedReplicator` flags in `runtime.client.edgeFeatures`. Composer, the `dx` CLI and the
configuration in [Installation](/docs/echo/learn/installation/) turn both on. CRDT merging makes the duplicate delivery
harmless: a change that arrives twice is applied once.

## Next

[Architecture](/docs/mesh/concepts/architecture/) shows how the pieces fit together.
