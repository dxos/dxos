---
order: 0
next: ./quick-start
prev: ./why
---

# Introduction

DXOS enables the development and operation of internet scale, privacy preserving applications. <br/> Read more [motivation](why.md).

:::note
DXOS is under development and will continue to change frequently. <br/>Your feedback is most welcome. [GitHub](https://github.com/dxos/dxos/issues), [`@dxos_org` on Twitter](https://twitter.com/dxos_org). <br/>See [Contribution Guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md).
:::

DXOS consists of a few technologies that work together:

*   [ECHO](echo) - Database and reactive state container for offline-first, real-time, collaborative apps.
*   [HALO](halo) - Identity for decentralized apps.
*   [KUBE](kube) - Self-contained infrastructure for hosting and operating decentralized apps.

Compare DXOS applications to client-server web applications:
| | `web2` Apps | DXOS Apps |
| :-- | :-- | :-- |
| How code is served | served by web servers | served by web servers |
| How data is stored | on the server | on the client |
| How data is exchanged | client to server (and server to client) via HTTP or Web Sockets | peer to peer via WebRTC |
| How identity is established | server(s) issue session tokens after validating credentials with methods like OAuth | peers obtain identity locally from the [HALO]() PWA or another chosen application installed on the same client device which contains the user's wallet of identity keys. |

## ECHO

ECHO (The **E**ventually **C**onsistent **H**ierarhical **O**bject store) is a peer-to-peer graph database written in TypeScript. ECHO connects to other peers directly via [WebRTC](https://en.wikipedia.org/wiki/WebRTC), and continuously replicates writes with those peers using technologies based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type). ECHO supports multiple concurrent writers collaborating on large objects, bodies of text, and other "custom data models". Peers going offline and returning to reconcile changes with the online swarm are also supported.

Learn more about [ECHO](echo).

## HALO

Establishing user identity in a non authoritative internet is hard. Every peer has to learn how to trust each other. HALO is a set of components and protocols for decentralized identity and access control designed around privacy, security, and collaboration requirements.

Learn more about [HALO](halo).

## KUBE

Running an application requires a lot of supporting technology: process monitoring, observability, deployment management, DNS, SSL, ..., etc. KUBE is a compact, self-contained binary that runs anywhere and provides essential services for applications.

Learn more about [KUBE](kube).
