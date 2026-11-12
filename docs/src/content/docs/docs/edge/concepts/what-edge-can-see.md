---
title: What EDGE can see
description: What EDGE reads today, and the encrypted relay it is moving to.
---

Today EDGE stores every space that replicates through it in plaintext, and can read it. Keyhive will change that: EDGE
will hold encrypted data it cannot read. That work is in progress.

## Today

EDGE receives each space's documents and feeds as they are, and stores them as they are. Nothing on the device encrypts
a space before it reaches EDGE. EDGE reads the content for:

| Job                                                      | Why it needs the content                              |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [Replication](/docs/edge/concepts/replication/)          | Merging changes into its copy                         |
| [Indexing](/docs/edge/concepts/indexing/)                | Matching queries by type, property and relation       |
| [Compute](/docs/edge/concepts/compute/)                  | Functions and agents read and write the space         |
| AI                                                       | Prompts the assistant and agents send include content |

The connection to EDGE is encrypted in transit. Content is readable on EDGE's servers. A space with
`setEdgeReplication` off never reaches EDGE, and syncs only between devices online together.

## In progress: Keyhive

HALO is built on [Keyhive](https://github.com/inkandswitch/keyhive), which encrypts a space for its members. The target is
for EDGE to join each space as a `pull` member: it receives and relays the encrypted changes, so devices that never meet
still sync, but it holds no key that decrypts them. HALO's [Spaces and membership](/docs/halo/concepts/spaces-membership/)
describes that model.

When it lands, an end-to-end encrypted space will lose the EDGE jobs that need to read content: EDGE's index and compute
on that space. Replication and backup will keep working.

## Limits

- Until Keyhive's encryption is running, treat anything in a space that replicates through EDGE as readable by DXOS.
- Turning off EDGE replication keeps a space off EDGE, at the cost described on
  [Replication and backup](/docs/edge/concepts/replication/).
