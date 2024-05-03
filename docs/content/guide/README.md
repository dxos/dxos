---
order: 0
prev: ../
---

# Introduction

DXOS provides developers with everything they need to build real-time, collaborative apps which run entirely on the client, and communicate peer-to-peer, without servers.

DXOS applications work offline, share state instantly when online, and leave end-users in control of their data and privacy.

Read more [motivation](why.md).

:::note
DXOS is under development and will continue to change frequently.<br/>Your feedback is most welcome on [GitHub](https://github.com/dxos/dxos/issues) and [Discord](https://discord.gg/eXVfryv3sW). <br/>See our [Contribution Guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md) about contributing code.
:::

DXOS includes a key pair of technologies that work together:

* [ECHO](platform) - Database and reactive state container for offline-first, real-time, collaborative apps.
* [HALO](platform/halo) - Identity for decentralized apps.

Compare DXOS applications to client-server web applications:
| | Client-Server Web Apps | DXOS Apps |
| :-- | :-- | :-- |
| How code is served | served by web servers | served by web servers |
| How data is stored | on the **server** | on the **client** |
| How data is exchanged | client to server via HTTP or Web Sockets | peer to peer via WebRTC |
| How identity is established | servers issue session tokens after validating credentials with methods like OAuth | clients generate their own private/public key pairs and use them to sign messages in the database. |

## ECHO

ECHO (The **E**ventually **C**onsistent **H**ierarhical **O**bject store) is a peer-to-peer graph database written in TypeScript. ECHO connects to other peers directly via [WebRTC](https://en.wikipedia.org/wiki/WebRTC), and continuously replicates data with those peers using the [Automerge](https://automerge.org/) [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type). ECHO supports multiple concurrent writers collaborating on arbitrary objects and text. Clients may perform writes while offline, reconciling with the swarm when returning online.

Learn more about [ECHO](platform).

## HALO

Establishing user identity in a non-authoritative internet is hard. Every peer has to decide how to trust each other. HALO is a set of components and protocols for decentralized identity and access control designed around privacy, security, and collaboration requirements.

Learn more about [HALO](platform/halo).
