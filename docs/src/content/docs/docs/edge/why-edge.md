---
title: Why EDGE?
description: Why a local-first system runs servers at all.
---

A local-first app keeps its data on the user's devices and works offline. It still needs a peer that is always online,
because the user's devices are rarely online together. EDGE is that peer: it holds a copy of each space, not the
original, and every device can sync, query and recover through it.

## The pattern

Edit a space on a laptop, close the lid, then open the space on a phone. The two devices were never online at the same
time, so no direct link could carry the change. The laptop sent it to EDGE before it slept, and the phone gets it from
EDGE when it wakes.

## An app server against an always-online peer

|                                   | App server                                    | EDGE                                                   |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Where the data lives              | On the server; devices hold a cache           | On the devices; EDGE holds a copy                      |
| Works offline                     | Read-only, at best                            | Fully; changes sync later                              |
| Who resolves conflicts            | The server                                    | CRDT merging, the same on every peer                   |
| If the service disappears         | The data goes with it                         | The devices still have everything                      |
| Who decides access                | The server, on every request                  | The space's members, through HALO                      |

EDGE reads space content today. [What EDGE can see](/docs/edge/concepts/what-edge-can-see/) says what that means.

## Practical problems

### Devices that are rarely online together

A phone and a laptop that never overlap need a peer in between. EDGE keeps every change it receives, so each device
syncs with it whenever it is online. See [Replication and backup](/docs/edge/concepts/replication/).

### Queries over objects this device has not loaded

A device loads only the documents it needs. A query that should match the whole space also asks EDGE, which has
indexed all of it. See [Indexing and queries](/docs/edge/concepts/indexing/).

### Recovery when every device is lost

If every device that holds an identity is gone, nothing on the user's side can admit a new one. EDGE keeps the
identity's recovery credentials and checks a recovery challenge against them. See
[Identity services](/docs/edge/concepts/identity-services/).

### Work that runs while you are offline

A trigger that fires on a schedule, an incoming email, or an agent that works through a task needs a computer that is on.
EDGE runs functions and agents against the space. See [Compute](/docs/edge/concepts/compute/).

## Next

[Architecture](/docs/edge/concepts/architecture/) shows the services and the objects behind them.
