---
title: Why EDGE?
description: Why a local-first system runs servers at all.
---

A local-first app keeps its data on the user's devices and works offline. It still needs a **peer**, something its
devices sync with, that is always online, because the user's devices are rarely online together.

EDGE is that peer. It holds a copy of each space that replicates through it, not the original. Every device can sync
and recover through that copy. Devices can also query through it when EDGE can read the space.

You can turn this off for a space with `Space.setEdgeReplication`. The space then syncs only between devices online at
the same time.

## The pattern

Edit a space on a laptop, close the lid, then open the space on a phone. The two devices were never online at the same
time, so no direct link could carry the change. The laptop sent it to EDGE before it slept, and the phone gets it from
EDGE when it wakes.

## An app server against an always-online peer

An app server owns the data, resolves conflicts and decides access. EDGE is a peer that holds a copy. The table sets
the two side by side.

|                           | App server                          | EDGE                                 |
| ------------------------- | ----------------------------------- | ------------------------------------ |
| Where the data lives      | On the server. Devices hold a cache | On the devices. EDGE holds a copy    |
| Works offline             | Read-only, at best                  | Fully. Changes sync later            |
| Who resolves conflicts    | The server                          | CRDT merging, the same on every peer |
| If the service disappears | The data goes with it               | The devices still have everything    |
| Who decides access        | The server, on every request        | The space's members, through HALO    |

EDGE can read a space only when the space gives it more than `pull` access. `pull` is the lowest access level, and it
lets a member store and relay the space's encrypted data. See HALO's
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

## Practical problems

### Devices that are rarely online together

A phone and a laptop that never overlap need a peer in between. EDGE keeps every change it receives, so each device
syncs with it whenever it is online. See [Replication and backup](/docs/edge/concepts/replication/).

### Queries over objects this device has not loaded

A device loads only the documents it needs, so a query that reads the device alone can miss objects it has not loaded.
When EDGE can read the space, a query that should match the whole space also asks EDGE, which has indexed all of it.

A space that gives EDGE only `pull` access is relayed unread and not indexed. See
[Indexing and queries](/docs/edge/concepts/indexing/).

### Recovery when every device is lost

If every device of an identity is gone, the user still holds a recovery key, but no device is left to let a new one
in. EDGE keeps the identity's recovery credentials, the signed records that name its recovery keys, and checks a
recovery challenge against them. See [Identity services](/docs/edge/concepts/identity-services/).

### Work that runs while you are offline

A schedule, an incoming email and an agent partway through a task all need a computer that is on. A user's devices
are often off.

EDGE runs operations, the typed actions an app defines, and agents against the space. See
[Compute](/docs/edge/concepts/compute/).

## Next

[Architecture](/docs/edge/concepts/architecture/) shows the services and the objects behind them.
