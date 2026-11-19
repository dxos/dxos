---
title: Teleport
description: One multiplexed stream per connection, and the extensions that run on it.
---

Teleport is the session two devices run over one connection. It multiplexes named channels over that connection, and
runs extensions on them, each a protocol of its own. ECHO and HALO use extensions to replicate, announce presence and
admit members.

## Model

HTTP/2 sends many requests over one connection, so a slow response does not hold up the others. Teleport does the
same for the protocols that two devices run over one link.

**One session per connection.** When a swarm opens a connection, each side starts a Teleport session on it. The session
splits the connection into named channels, so many protocols share one link without blocking each other. It also
balances the bytes between the channels.

**Extensions.** An extension is a protocol with a name. Each side adds the extensions it runs, and an extension opens
once both sides have added it. A peer that does not know an extension never opens it.

| Extension                                | Added by        | Does                                                                          |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `dxos.mesh.teleport.control`             | Teleport itself | Heartbeats, and tells the other side which extensions this side has           |
| `dxos.mesh.teleport.auth`                | ECHO, HALO      | Each side proves it holds a key the space or identity admitted                |
| `dxos.mesh.teleport.automerge`           | ECHO            | Replicates the space's Automerge documents                                    |
| `dxos.mesh.teleport.replicator`          | ECHO, HALO      | Replicates the space's feeds                                                  |
| `dxos.mesh.teleport.gossip`              | ECHO, HALO      | Carries [presence](/docs/mesh/concepts/presence/) announcements               |
| `dxos.mesh.teleport.admission-discovery` | ECHO            | Lets a newly admitted member fetch the credential that admitted it            |
| `dxos.mesh.teleport.notarization`        | ECHO            | Lets a member ask another to write a credential to the space for it           |
| `dxos.halo.invitations`                  | HALO            | Runs an [invitation](/docs/halo/concepts/invitations/) between host and guest |

Each of these extensions runs an RPC service on a channel named `rpc`. Teleport's `RpcExtension` base class opens
that channel and runs the service on it. The auth, admission discovery, notarization and invitation extensions build
on it.

## Behavior

- Each space connection runs the auth extension. A peer that fails auth is disconnected only if the session's owner
  closes the session when told of the failure. A device that is fetching its admission credential closes the session.
  A space that is already open logs the failure and leaves the session open.
- On a space connection, feed replication opens alongside the auth extension, not after it, and does not wait for it.
  This means feeds can start to replicate before the peer has authenticated.
- The space adds gossip, admission discovery, notarization and Automerge replication only after the peer has
  authenticated.
- An invitation connection has no auth extension. Besides the control extension every session carries, it adds only
  `dxos.halo.invitations`, which checks the guest by the invitation's auth method. The `none` method checks nothing.
- Replication over Teleport is the same replication as through EDGE. See
  [Spaces and databases](/docs/echo/concepts/spaces/) for what it replicates.
- When a connection drops, the session and its extensions close. The swarm opens a new connection, which runs them
  again from the start. Replication resumes from what each side already has.

## Limits

- Teleport does not choose routes or peers. That is the [swarm](/docs/mesh/concepts/swarms/)'s job.
- An extension a peer does not support is skipped, not negotiated down. Both sides need the same version to talk.
