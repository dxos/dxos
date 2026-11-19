---
title: Presence and network status
description: Who is online, and how an app reads and changes its own connection.
---

Presence is how a device learns which other members and devices are online. Network status is what your app reads to
know whether its own device is connected. It is also the switch that takes the device offline.

## Model

In a client-server app, the server knows who is online, because every client holds a connection to it. In a swarm,
the devices tell each other.

**Gossip.** Every device in a swarm announces itself every 10 seconds over the gossip extension. It also passes on the
announcements it receives to its other connections. This means an announcement reaches devices that its sender has no
direct link to.

**Online and offline.** A peer whose announcement has not arrived for 20 seconds counts as offline. ECHO uses this for
a space's members, and HALO uses it for an identity's devices.

**Network status.** `client.mesh.networkStatus` is an observable of the device's own state:

| Field            | Meaning                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `swarm`          | `ONLINE` while the device joins swarms, `OFFLINE` after it leaves them |
| `signaling`      | The state of each signaling server connection                          |
| `connectionInfo` | The swarms the device is in, and their connections                     |

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

In this example, the edits made between the two calls stay on the device. After the second call, the swarm reconnects
and the edits merge with the other devices' changes.

## Behavior

- Going offline does not close spaces or stop writes. Changes stay on the device and replicate when it is online again.
- Presence follows swarms. A device is online in the spaces it has open, not in all of them.

## Limits

- Presence is eventually right. A device that drops off the network shows as online for up to 20 seconds.
- Gossip runs over direct links, so a device with no peers online sees no presence for that space.
