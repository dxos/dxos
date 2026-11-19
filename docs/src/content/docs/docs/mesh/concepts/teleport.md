---
title: Teleport
description: One multiplexed stream per connection, and the extensions that run on it.
---

Teleport is the session two devices run over one **direct link**, the connection between them. It multiplexes named
channels over that link, and runs extensions on them, each a protocol of its own. ECHO and HALO use extensions to
replicate, announce presence and admit members.

## Model

HTTP/2 sends many requests over one connection, so a slow response does not hold up the others. Teleport does the
same for the protocols that two devices run over one direct link.

**One session per link.** A swarm is the set of direct links a device keeps for one space, identity or invitation. When
a swarm opens a direct link, each side starts a Teleport session on it. The session splits the link into named
**channels**, each a stream of bytes of its own, and balances the bytes between them.

**Extensions.** An **extension** is a protocol with a name. Each side adds the extensions it runs, and an extension
opens once both sides have added it. A peer that does not know an extension never opens it.

| Extension                                | Added by        | Does                                                                          |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `dxos.mesh.teleport.control`             | Teleport itself | Sends heartbeats, and tells the other side which extensions this side has     |
| `dxos.mesh.teleport.auth`                | ECHO, HALO      | Lets each side prove it holds a key the space or identity admitted            |
| `dxos.mesh.teleport.automerge`           | ECHO            | Replicates the space's Automerge documents                                    |
| `dxos.mesh.teleport.replicator`          | ECHO, HALO      | Replicates the space's feeds                                                  |
| `dxos.mesh.teleport.gossip`              | ECHO, HALO      | Carries [presence](/docs/mesh/concepts/presence/) announcements               |
| `dxos.mesh.teleport.admission-discovery` | ECHO            | Lets a newly admitted member fetch the credential that admitted it            |
| `dxos.mesh.teleport.notarization`        | ECHO            | Lets a member ask another to write a credential to the space for it           |
| `dxos.halo.invitations`                  | HALO            | Runs an [invitation](/docs/halo/concepts/invitations/) between host and guest |

All eight extensions run an RPC service on a channel named `rpc`. Four of them get that from Teleport's
`RpcExtension` base class, which opens the channel and runs the service: auth, admission discovery, notarization and
invitations. The other four open the channel themselves.

## Behavior

- Every direct link in a space's swarm runs the auth extension. What happens to a peer that fails depends on the code
  that joined the swarm:
  - If a device is fetching its admission credential, it closes the session.
  - If the space is already open, it logs the failure and leaves the session open.
- On a space's link, feed replication opens alongside the auth extension, not after it, and does not wait for it.
  Feeds can start to replicate before the peer has authenticated.
- The space adds gossip, admission discovery, notarization and Automerge replication only after the peer has
  authenticated.
- An invitation's link has no auth extension. Besides the control extension every session carries, it adds only
  `dxos.halo.invitations`, which checks the guest by the invitation's auth method. The `none` method checks nothing.
- Replication over Teleport is the same replication as through EDGE. See
  [Spaces and databases](/docs/echo/concepts/spaces/) for what it replicates.
- When a link drops, the session and its extensions close. The swarm opens a new link, which runs them again from the
  start. Replication resumes from what each side already has.

## Limits

- Teleport does not choose routes or peers. That is the [swarm](/docs/mesh/concepts/swarms/)'s job.
- An extension a peer does not support is skipped, not negotiated down. Both sides need the same version to talk.
