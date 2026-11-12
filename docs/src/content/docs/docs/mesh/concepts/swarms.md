---
title: Swarms and topology
description: One swarm per topic, and how MESH decides which peers to connect.
---

A swarm is the set of connections a device keeps for one topic. Its topology decides which of the peers on the topic
to connect to.

## Model

**One swarm per topic.** Each open space has a swarm, keyed by the space's topic. So does an identity's own HALO space,
which is how its devices sync with each other, and each invitation in progress. A device in five spaces is in five
swarms. Two devices that share several spaces have a separate connection in each.

**Candidates and connections.** Signaling tells the swarm which peers are on the topic. Those are its candidates. The
topology picks which candidates to connect to and when to drop a connection, and the swarm carries that out.

## Topologies

| Topology        | Rule                                                                 | Used for                       |
| --------------- | -------------------------------------------------------------------- | ------------------------------ |
| MMST            | Connect a few peers, chosen so the whole swarm stays connected       | Space swarms                   |
| Invitation      | The host dials one guest at a time; guests accept every connection   | Invitations                    |
| Fully connected | Connect to every peer                                                | Tests                          |
| Star            | Every peer connects to one central peer                              | Tests                          |

**MMST** keeps the swarm reachable without connecting every pair. Each device opens connections until it has a minimum
number, choosing from a random sample of candidates the ones nearest its own key by XOR distance. It refuses offers once
it has its maximum. Because every device picks by the same distance, the connections together link the whole swarm,
and a change reaches every device through intermediaries. A space swarm opens up to 4 connections itself and accepts
up to 10 in all, from a sample of 20. The topology makes at most one change every 10 seconds, so connections do not
flap.

## The connection limiter

Opening a WebRTC connection is expensive. A device that opens many spaces at once could start hundreds of connections
together, so a limiter lets at most 50 be in the connecting state at a time. The rest wait in a queue.

## Behavior

- A change reaches every device in a swarm as long as the swarm's connections link them, directly or through others.
- A device leaves a swarm when it closes the space or goes offline, and joins again when it reopens it.

## Limits

- MMST does not guarantee the shortest route between two devices, only that one exists while enough peers are online.
- A swarm with one device online has no connections; that device syncs only with EDGE.
