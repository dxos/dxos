---
order: 2
prev: ./quick-start
---

# Platform Overview

Compare DXOS Applications to current Web2 Applications:
| | Current Web (Web2) | DXOS |
| :-- | :-- | :-- |
| How code is served | served by web servers | served by web servers |
| How data is stored | on the server | on the client |
| How data is exchanged | client to server (and server to client) via HTTP or WS | peer to peer via WebRTC |
| How identity is established | server(s) issue session tokens after validating credentials with methods like OAuth | peers obtain identity directly from [HALO]() or another chosen DXOS application installed on the same client device which contains the user's wallet of identity keys |

## Key components of DXOS:

*   [ECHO](#echo) Database for offline-first and real-time collaborative apps.
*   [HALO](#halo) Identity for decentralized apps.
*   [MESH](#mesh) Networking for peer to peer apps.
*   [KUBE](#kube) Self-contained infrastructure for hosting and operating decentralized apps.

## ECHO

ECHO (The **E**ventually **C**onsistent **H**ierarhical **O**bject store) is a peer-to-peer graph database written in TypeScript. ECHO connects to other peers directly via [WebRTC](https://en.wikipedia.org/wiki/WebRTC), and continuously replicates writes with those peers using technologies based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type). ECHO supports multiple concurrent writers collaborating on large objects, bodies of text, and other "custom data models". Peers going offline and returning to reconcile changes with the online swarm are also supported.

### Spaces

Data is replicated within containers called `spaces`. A `space` is an instance of an ECHO database which can be replicated by a number of peers.

### Items

Specific documents or rows of data are referred to as `items`. `Items` always belong to a space and behave according to a **consistency model**.

### Models

Every item behaves according to a consistency model which describes rules for conflict resolution. ECHO provides at least two specific model types and can be extended with custom models.

*   [`ObjectModel`](../api/@dxos/client/classes/ObjectModel) is a document record with keys and values, where last write wins on any given key.
*   \[`TextModel`])(../api/@dxos/text-model/classes/TextModel) is for collaborative rich text editing on a "large string" or rich text model.

Continue to [ECHO Installation and usage](echo/installation).

## HALO

Establishing user identity in a non authoritative internet is hard. Every peer has to learn how to trust each other. HALO is a set of components and protocols for decentralized identity and access control designed around privacy, security, and collaboration requirements.

### Application

The [HALO application](https://halo.dxos.org) is a software wallet that contains user identities, secrets (i.e., private keys) and other credentials.

### SDK

The HALO SDK is part of the [`@dxos/client`](https://www.npmjs.com/package/@dxos/client) library and provides user authentication, profile, and contact management for app developers.

### Protocol

The HALO protocol supports verification, transport, and exchange of identity information between networked peers.

## KUBE

Running an application requires a lot of supporting technology: process monitoring, observability, deployment management, DNS, SSL, ..., etc. KUBE is a compact, self-contained binary that runs anywhere and provides essential services for applications.

Learn more about [KUBE](kube).
