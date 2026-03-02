# DXOS Architecture

DXOS is composed of three core systems: **ECHO**, **HALO**, and **MESH**.

```
┌─────────────────────────────────────────────┐
│  Applications (Composer, Tasks, etc.)        │
├─────────────────────────────────────────────┤
│  SDK (@dxos/client, @dxos/react-client)      │
├──────────────┬──────────────────────────────┤
│  ECHO        │  HALO                        │
│  (data)      │  (identity)                  │
├──────────────┴──────────────────────────────┤
│  MESH (networking / transport)               │
└─────────────────────────────────────────────┘
```

---

## ECHO — Decentralized Graph Database

**Full name**: Eventually Consistent Hierarchical Object store
**Location**: `packages/core/echo/`
**Design spec**: `docs/design/echo-spec.md`

ECHO is the data layer. It provides a distributed, peer-to-peer graph database where objects are replicated across devices and peers with eventual consistency.

### Key Concepts

| Concept | Description |
|---|---|
| **Space** | The unit of collaboration and data replication. A Space is a shared database that a group of peers can read/write. |
| **Object** | A globally-addressable data node in the graph. Typed via schema. |
| **Feed** | An append-only, hash-linked log. Objects are derived from messages in feeds. |
| **Epoch** | A snapshot checkpoint in a Space's history; enables efficient bootstrapping. |
| **Timeframe** | A monotonic sequence used to establish partial ordering of messages across feeds. |
| **Query** | Reactive query engine over local Space data. |

### How it works

1. Each peer writes mutations into its own append-only feed.
2. Feeds are replicated to other peers via MESH.
3. ECHO processes incoming feed messages and materializes an object graph.
4. Conflicts are resolved by CRDT-like models on each object type.

### Key Packages

| Package | Role |
|---|---|
| `echo-db` | Core database implementation |
| `echo-pipeline` | Message processing pipeline |
| `echo-query` | Query engine |
| `echo-protocol` | Wire protocol definitions |
| `echo-react` | React hooks (`useQuery`, `useSpace`, etc.) |

---

## HALO — Decentralized Identity and Access Control

**Location**: `packages/core/halo/`
**Design spec**: `docs/design/halo-spec.md`

HALO is the identity layer. It provides self-sovereign identity, device management, and access control using cryptographic keys and verifiable credentials.

### Key Concepts

| Concept | Description |
|---|---|
| **Identity** | A user or agent, represented by a cryptographic keypair. |
| **Device** | A unique client (browser profile, native app, CLI). Each device is authorized separately. |
| **Credential** | A signed, verifiable statement granting rights to an identity over a resource. |
| **HALO Space** | Each identity has a private ECHO Space storing their credentials, contacts, and device keys. |
| **Profile** | User metadata (name, avatar, etc.) stored in their HALO Space. |

### How it works

1. On first use, a user generates an identity keypair — stored only on their device.
2. Additional devices are authorized by signing a credential from an existing device.
3. Space access is controlled by credentials: joining requires an invitation signed by a Space member.
4. No passwords; no central account service.

### Key Packages

| Package | Role |
|---|---|
| `credentials` | Verifiable credential system |
| `keyring` | Key storage and signing |

### HALO Application

The HALO app (`https://halo.dxos.org`) is a wallet PWA for managing identities, devices, and authorizations. It mediates passwordless sign-in to third-party DXOS apps.

---

## MESH — Peer-to-Peer Networking

**Location**: `packages/core/mesh/`
**Design spec**: `docs/design/mesh-spec.md`

MESH is the transport layer. It establishes and manages peer-to-peer connections for data replication, RPC, and signaling.

### Key Concepts

| Concept | Description |
|---|---|
| **Swarm** | A transient P2P network of connected peers sharing a discovery key. |
| **Signaling** | How peers discover each other (via a signaling server), then connect directly. |
| **Teleport** | The multiplexed transport used for data replication between peers. |
| **WebRTC** | Used for direct browser-to-browser connections (with STUN/TURN fallback). |
| **RPC** | Strongly typed remote procedure calls over MESH connections. |

### How it works

1. Peers announce themselves to a signaling server using a discovery key (derived from the Space key).
2. The signaling server brokers ICE exchange so peers can punch through NAT.
3. WebRTC connections are established; Teleport multiplexes data replication and RPC over these.
4. Feed sync happens over Teleport using gossip and object-sync extensions.

### Key Packages

| Package | Role |
|---|---|
| `network-manager` | Manages the lifecycle of swarms and peer connections |
| `signal` | Signaling protocol client |
| `teleport` | Multiplexed P2P transport |
| `teleport-extension-gossip` | Feed gossip/discovery |
| `teleport-extension-object-sync` | ECHO object replication |
| `rpc` | Typed RPC over any transport |
| `messaging` | Point-to-point message passing |
| `edge-client` | Client for DXOS edge infrastructure |
