---
title: Swarms and topology
description: One swarm per topic, and how MESH decides which peers to connect.
---

A swarm is the set of direct links a device keeps for one **topic**, the key that names one group of devices. Its
topology is the rule that decides which of the peers on the topic to link to.

## Model

A space has twelve devices online. Should your device link to all eleven others, or to a few of them? A swarm answers
that question for one topic.

A **direct link** is a connection between two devices, and on this page a **peer** is the device at the other end of
one. EDGE is a peer of another kind. It is always online, and a device reaches it over a WebSocket, outside every
swarm.

**One swarm per topic.** Each open space has a swarm, keyed by the space's topic. So does an identity's own HALO space,
which is how its devices sync with each other. So does each invitation in progress.

If your device is in five spaces, it is in five swarms. Two devices that share several spaces have a separate direct
link in each.

**Candidates and links.** Signaling tells the swarm which peers are on the topic. Those peers are its **candidates**.
The **topology** is the rule that picks which candidates to link to and when to drop a link, and the swarm carries
that out.

## Topologies

| Topology        | Rule                                                             | Used for     |
| --------------- | ---------------------------------------------------------------- | ------------ |
| MMST            | Link to a few peers, chosen so the swarm usually stays connected | Space swarms |
| Invitation      | The host dials one guest at a time. Guests accept every link     | Invitations  |
| Fully connected | Link to every peer                                               | Tests        |
| Star            | Every peer links to one central peer                             | Tests        |

**MMST**, short for mostly minimal spanning tree, keeps the swarm reachable without linking every pair. Each device
follows the same rules:

- It opens direct links until it has a minimum number.
- It chooses them from a random sample of candidates, taking the ones nearest its own key by XOR distance.
- It refuses offers once it has its maximum.

Every device picks by the same distance, so the links usually join the whole swarm, and a change reaches every device
through intermediaries.

MMST does not guarantee a connected swarm, however. Two groups whose devices already have their minimum open no link
between them, and then only EDGE joins them.

For a space swarm, the minimum is 4 links, the maximum is 10, and the sample is 20 candidates. The topology makes at
most one change every 10 seconds, so links do not flap.

## The connection limiter

Opening a direct link over WebRTC is expensive, and a device that opens many spaces at once could start hundreds
together. The code calls a direct link a connection, which gives the limiter its name. It lets at most 50 links be
opening at a time, and the rest wait in a queue.

## Behavior

- A device leaves a swarm when it closes the space or goes offline, and joins again when it reopens it.

## Limits

- MMST guarantees neither the shortest route between two devices nor that any route joins them. EDGE replication
  covers the gaps.
- A swarm with one device online has no direct links. That device syncs only with EDGE.
