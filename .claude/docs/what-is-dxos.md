# What is DXOS

DXOS is the **Decentralized Operating System** — a platform for building fully decentralized, peer-to-peer applications.

DXOS applications work without centralized servers. Data is owned by users, synced directly between their devices and peers, and stored locally. There is no backend to provision.

## Core Principles

- **Local-first**: Data lives on the user's device; the network is used for sync, not storage.
- **Peer-to-peer**: Devices connect directly using WebRTC/WebSocket; no central relay for data.
- **Self-sovereign identity**: Users control their own keys and credentials via HALO — no account on a third-party service.
- **Eventually consistent**: ECHO provides conflict-free, distributed state using append-only feeds and CRDT-like models.

## What DXOS Provides

| Layer | System | Role |
|---|---|---|
| Data | ECHO | Decentralized graph database (Spaces, Objects, Queries) |
| Identity | HALO | Key management, credentials, device authorization |
| Networking | MESH | P2P transport, signaling, RPC, replication |
| SDK | `@dxos/client`, `@dxos/react-client` | Public API for app developers |
| App | Composer | Reference application and extensible IDE |

## Key Links

- Website: https://dxos.org
- Docs: https://docs.dxos.org
- Design specs: `docs/design/` in the repo
