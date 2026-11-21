---
title: Presence and network status
description: Who is online, and how an app reads and changes its own connection.
---

Presence is how a device learns which other members and devices are online. Network status is what your app reads to
know whether its own device is connected. It is also the switch that takes the device offline.

## Model

No server keeps the list of who is online in a **swarm**, the set of direct links a device keeps for one space or
identity. The devices tell each other.

**Gossip.** **Gossip** is passing a message on from one device to the next. Every device in a swarm announces itself
every 10 seconds over the gossip extension. It also passes on the announcements it receives to its other links, so an
announcement reaches devices that its sender has no direct link to.

**Online and offline.** A peer whose announcement has not arrived for 20 seconds counts as offline. ECHO uses this for
a space's members, and HALO uses it for an identity's devices.

**Network status.** `client.mesh.networkStatus` is an observable of the device's own state:

| Field            | Meaning                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `swarm`          | `ONLINE` while the device joins swarms, `OFFLINE` after it leaves them |
| `signaling`      | The state of each signaling server connection                          |
| `connectionInfo` | The swarms the device is in, and their direct links                    |

**Going offline.** `client.mesh.updateConfig(ConnectionState.OFFLINE)` makes the device leave every swarm.
`ConnectionState.ONLINE` joins them again. The tutorials' offline switch calls it, so you can watch two windows diverge
and merge.

**Example** (Going offline and coming back)

```ts
import { ConnectionState } from '@dxos/client/mesh';

await client.mesh.updateConfig(ConnectionState.OFFLINE);
// Edit while offline; changes stay on this device.
await client.mesh.updateConfig(ConnectionState.ONLINE);
// The swarm reconnects and the changes merge.
```

## Behavior

- Going offline does not close spaces or stop writes. Changes stay on the device and replicate when it is online again.
- Presence follows swarms. A device is online in the spaces it has open, not in all of them.

## Limits

- Presence is eventually right. A device that drops off the network shows as online for up to 20 seconds.
- Gossip runs over direct links. In a space where no other device is online, a device sees no presence.
