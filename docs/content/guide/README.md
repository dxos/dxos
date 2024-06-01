---
order: 0
---

# Introduction

DXOS provides developers with a toolkit to build local-first, collaborative apps which preserve privacy by communicating peer-to-peer.

DXOS applications work offline, share state instantly when online, and leave end-users in control of their data and privacy.

Composer is a collaborative productivity app where developers can build and organize knowledge, extend with custom data and UI, and run private AI against their knowledge locally.

:::note
DXOS is under development and will continue to change frequently.<br/>Your feedback is most welcome on [GitHub](https://github.com/dxos/dxos/issues) and [Discord](https://discord.gg/eXVfryv3sW). <br/>See our [Contribution Guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md) about contributing code.
:::

The DXOS SDK includes a key pair of technologies that work together:

* [ECHO](echo/) - Database and reactive state container for offline-first, real-time, collaborative apps.
* [HALO](halo/) - Identity for decentralized apps.

Compare DXOS applications to client-server web applications:
| | Client-Server Web Apps | DXOS Apps |
| :-- | :-- | :-- |
| How code is served | served by web servers | served by web servers |
| How data is stored | on the **server** | on the **client** |
| How data is exchanged | client to server via HTTP or Web Sockets | peer to peer via WebRTC |
| How identity is established | servers issue session tokens after validating credentials with methods like OAuth | clients generate their own private/public key pairs and use them to sign messages in the database. |

# SDK Documentation Overview

Dependency relationship of some of the technologies covered in the docs:

```mermaid
graph TD;
  %% Make the nodes closer together horizontally to narrow the graph:
  %%{init:{'flowchart':{'nodeSpacing': 8}}}%%

  %% NOTE: GitHub's Mermaid implementation doesn't support relative links
  %% so use absolute links instead.

  subgraph DXOS["DXOS protocols"];
    ECHO["<a href='https://docs.dxos.org/guide/echo/'>ECHO</a><br>Peer-to-peer object store"];
    HALO["<a href='https://docs.dxos.org/guide/halo/'>HALO</a><br>Authentication, identity,<br>and contact management"];
    MESH["MESH\nNetworking and replication"];
    ECHO-.->HALO;
    ECHO-.->MESH
    HALO-.->MESH;
  end
  subgraph Plugins["<a href="https://docs.dxos.org/guide/composer-plugins/">Composer Plugins</a>"];
    Layout["<a href="https://docs.dxos.org/guide/composer-plugins/core#layout">Layout</a>"];
    Theme["<a href="https://docs.dxos.org/guide/composer-plugins/core#theme">Theme</a>"];
    Etc1["..."];
  end
  subgraph AppFramework["App Framework"];
    Surface["<a href="https://docs.dxos.org/guide/composer-plugins/surface">Surface</a>"];
    Intent["<a href="https://docs.dxos.org/guide/composer-plugins/intent">Intent</a>"];
    Graph["<a href="https://docs.dxos.org/guide/composer-plugins/graph">Graph</a>"];
  end
  subgraph App["DXOS Apps"];
    TodoMVC["<a href='https://docs.dxos.org/guide/samples/#todomvc'>TodoMVC</a>"];
    Tasks["<a href='https://docs.dxos.org/guide/samples/#tasks'>Tasks</a>"];
    Composer;
    Etc2["..."];
  end
  TodoMVC-->DXOS;
  Tasks-->DXOS;
  Composer-->DXOS;
  Composer-.->Plugins;
  Composer-->AppFramework;
  Plugins-->DXOS;
  Plugins-->AppFramework;
```

Here solid lines represent direct dependencies and dashed lines pluggable ones.
