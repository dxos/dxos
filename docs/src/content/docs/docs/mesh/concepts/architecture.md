---
title: Architecture
description: The layers of MESH, from the transport up to the extensions ECHO and HALO run.
---

MESH is a stack of five layers. Each layer uses the one below it, and ECHO and HALO plug in at the top as extensions.

## Model

```text
 Extensions   replication · Automerge · gossip · admission · notarization · invitations
 ───────────────────────────────────────────────────────────────────────────────────────
 Swarm        one per topic; a topology decides which peers to connect
 ───────────────────────────────────────────────────────────────────────────────────────
 Signaling    finds the peers on a topic and passes offers and answers between them
 ───────────────────────────────────────────────────────────────────────────────────────
 Teleport     one session per connection, many named streams over it
 ───────────────────────────────────────────────────────────────────────────────────────
 Transport    WebRTC · TCP · memory
```

| Layer      | What it does                                                                    | Package in `packages/core/mesh`                     | Page                                                   |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Transport  | Moves bytes between two devices                                                 | `network-manager` (`transport/`)                    | [Transports](/docs/mesh/concepts/transports/)          |
| Teleport   | Multiplexes streams over one connection and runs extensions on them             | `teleport`                                          | [Teleport](/docs/mesh/concepts/teleport/)              |
| Signaling  | Introduces peers on a topic and relays the messages that set up a connection    | `messaging`, `network-manager` (`signal/`)          | [Signaling and discovery](/docs/mesh/concepts/signaling/) |
| Swarm      | Keeps the set of connections for one topic, as its topology decides             | `network-manager` (`swarm/`, `topology/`)           | [Swarms and topology](/docs/mesh/concepts/swarms/)     |
| Extensions | The protocols ECHO and HALO run over a connection                               | `teleport-extension-*`, and the client's own        | [Teleport](/docs/mesh/concepts/teleport/)              |

`edge-client` sits beside the stack. It keeps the device's WebSocket to EDGE, which carries signaling and the
replication to EDGE's copy of each space. See [Connecting](/docs/edge/concepts/connecting/).

## Behavior

- The client's services own MESH. An app never constructs a swarm or a transport; it opens a space, and the space joins
  its swarm.
- In the browser the client's services run in a worker. A worker cannot open a WebRTC connection, so the tab opens it on
  the worker's behalf and forwards the bytes.
- Every connection is authenticated before any extension other than control runs on it: each side proves it holds a key
  the space or identity admitted.

## Limits

- The packages `rpc`, `rpc-tunnel` and `websocket-rpc` also live in `packages/core/mesh`, but they connect a worker to
  its tabs, not one device to another. These pages leave them out.
- Iroh, in `packages/core/mesh/iroh`, is a design for a further transport, not code. See
  [Transports](/docs/mesh/concepts/transports/).
