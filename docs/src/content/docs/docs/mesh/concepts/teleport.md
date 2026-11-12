---
title: Teleport
description: One multiplexed stream per connection, and the extensions that run on it.
---

Teleport is the session two devices run over one connection. It multiplexes named streams over that connection, and
runs extensions on them: the protocols ECHO and HALO use to replicate, announce presence and admit members.

## Model

**One session per connection.** When a swarm opens a connection, each side starts a Teleport session on it. The session
splits the connection into named channels, so many protocols share one link without blocking each other, and balances
the bytes between them.

**Extensions.** An extension is a protocol with a name. Each side adds the extensions it runs, and an extension opens
once both sides have added it. A peer that does not know an extension never opens it.

| Extension                                  | Added by          | Does                                                                            |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------- |
| `dxos.mesh.teleport.control`               | Teleport itself   | Heartbeats, and tells the other side which extensions this side has            |
| `dxos.mesh.teleport.auth`                  | ECHO, HALO        | Each side proves it holds a key the space or identity admitted                  |
| `dxos.mesh.teleport.automerge`             | ECHO              | Replicates the space's Automerge documents                                      |
| `dxos.mesh.teleport.replicator`            | ECHO, HALO        | Replicates the space's feeds                                                    |
| `dxos.mesh.teleport.gossip`                | ECHO, HALO        | Carries [presence](/docs/mesh/concepts/presence/) announcements                 |
| `dxos.mesh.teleport.admission-discovery`   | ECHO              | Lets a newly admitted member fetch the credential that admitted it              |
| `dxos.mesh.teleport.notarization`          | ECHO              | Lets a member ask another to write a credential to the space for it             |
| `dxos.halo.invitations`                    | HALO              | Runs an [invitation](/docs/halo/concepts/invitations/) between host and guest   |

## Behavior

- Every extension but control waits for authentication. A peer that fails it is disconnected before any data moves.
- Replication over Teleport is the same replication as through EDGE. See
  [Spaces and databases](/docs/echo/concepts/spaces/) for what it replicates.
- When a connection drops, the session and its extensions close. The swarm opens a new connection, which runs them again
  from the start; replication resumes from what each side already has.

## Limits

- Teleport does not choose routes or peers. That is the [swarm](/docs/mesh/concepts/swarms/)'s job.
- An extension a peer does not support is skipped, not negotiated down; both sides need the same version to talk.
