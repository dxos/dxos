---
title: Why MESH?
description: Why devices connect to each other directly, and why the same data also goes through EDGE.
---

EDGE holds a copy of every space that replicates through it, so a device could sync with EDGE alone. MESH also links
devices to each other directly, because a direct link is faster between nearby devices and keeps working when EDGE is
out of reach. Today a space replicates over both at once, so a change takes the direct link and also goes to EDGE. A
space that turns EDGE off with `Space.setEdgeReplication` syncs only over direct links, and its data then reaches no
server unless WebRTC has to fall back to a TURN relay.

## The pattern

Open the same space on two devices. Each device joins the space's swarm. EDGE introduces them, they open a direct link,
and a change made on one device arrives on the other over that link. The same change also goes to EDGE over each
device's WebSocket, so a third device that comes online later gets it from EDGE.

## A server path against a direct link

|                                    | Through EDGE only                       | Direct link between devices                 |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| Latency between two nearby devices | A round trip to the nearest data centre | The local network, or the shortest route    |
| Devices never online together      | Works: EDGE holds the copy              | Does not work on its own                    |
| EDGE unreachable                   | Sync stops                              | Sync continues between the devices it links |
| Who handles the data in transit    | EDGE                                    | Only the two devices                        |
| Peers behind strict NAT            | Works                                   | Needs a TURN relay                          |

Neither column is enough alone, so MESH uses both. EDGE is one more transport, not a separate path beside MESH.

## Practical problems

### Two devices in one room

Two laptops on the same network editing one document should not wait on a data centre. Over a direct link a change
arrives in the time the local network takes.

### EDGE is down or unreachable

A device that has lost its route to EDGE but can still reach its peers keeps syncing with them. When EDGE comes back,
both sides catch up with it.

### Devices that are rarely online together

A phone and a laptop that are never awake at the same time can never form a direct link. EDGE is the transport that
reaches them: each syncs with EDGE's copy when it is online. See [Replication and backup](/docs/edge/concepts/replication/).

### Data that stays between devices

A direct link carries data only between the two devices on it. The same data also goes to EDGE, which can read it only
if the space gives EDGE more than `pull` access; see HALO's [Spaces and membership](/docs/halo/concepts/spaces-membership/).

## Today: both at once

ECHO replicates each space over its swarm's direct links and through EDGE at the same time. The EDGE side is controlled by
the `subductionReplicator` and `feedReplicator` flags in `runtime.client.edgeFeatures`. Composer, the `dx` CLI and the
configuration in [Installation](/docs/echo/learn/installation/) turn both on. CRDT merging makes the duplicate delivery
harmless: a change that arrives twice is applied once.

## Next

[Architecture](/docs/mesh/concepts/architecture/) shows how the pieces fit together.
