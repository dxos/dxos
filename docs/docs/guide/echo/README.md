---
title: Overview
order: 0
dir:
  text: ECHO Database
  order: 10
---

# ECHO

ECHO (The **E**ventually **C**onsistent **H**ierrarhical **O**bject store) is a peer-to-peer graph database written in TypeScript. ECHO connects to other peers directly via [WebRTC](https://en.wikipedia.org/wiki/WebRTC), and continuously replicates writes with those peers using technologies based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type). ECHO supports multiple concurrent writers collaborating on large objects, bodies of text, and other "custom data models". Peers going offline and returning to reconcile changes with the online swarm are also supported.

*   Secure, P2P data replication based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)
*   No servers or central authority, all the data is with the clients
*   Connectivity with peers via [WebRTC](https://en.wikipedia.org/wiki/WebRTC)
*   Supports for multiple concurrent writers
*   Collaboration on key-value objects, bodies of text, and other "custom data models".
*   Supports offline writes and conflict resolution when peers rejoin the network

### Spaces

Data is replicated within containers called `spaces`. A `space` is an instance of an ECHO database which can be replicated by a number of peers.

### Items

Units of data are referred to as `items` (like documents or rows in other databases). `Items` always belong to a space and behave according to a **consistency model**.

### Models

Every item behaves according to a consistency model which describes the rules for conflict resolution. ECHO provides at least two specific model types and can be extended with custom models.

*   [`ObjectModel`](../api/@dxos/client/classes/ObjectModel) is a document record with keys and values, where last write wins on any given key.
*   [`TextModel`](../api/@dxos/text-model/classes/TextModel) is for collaborative rich text editing on a "large string" or rich text model.

## How to use ECHO

- [Install](installation) the npm module
- Create a [Client](configuration)
- Join or create a [Space](spaces)
- [Query items](queries)
- [Create items](mutations#creating-items)
- [Mutate items](mutations#mutating-data)
- Set up user identity with [HALO](../halo)