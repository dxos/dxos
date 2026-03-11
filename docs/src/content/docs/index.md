---
title: Introduction
description: Getting started with DXOS
---

Welcome to the DXOS documentation!

DXOS is an open source framework for building real-time, collaborative web applications that run entirely on the client and communicate peer-to-peer, without the need for centralized servers.
To show off the power of DXOS, we've built [Composer](/composer/introduction): a local-first workspace that is designed for small team collaboration.

The DXOS SDK is under active development, however our current focus is building features and functionality that enables the development of [Composer](/composer/introduction). To this end, we're currently only able to provide limited support to developers using the SDK, and will prioritize suggestions and contributions that align with our work on Composer.

If you are interested in working with or contributing to either the SDK or Composer please share feedback on [GitHub](https://github.com/dxos/dxos/issues) or in [Discord](https://dxos.org/discord).

The DXOS SDK includes several technologies that work together:

* [ECHO](/echo/introduction) - Peer-to-peer database and reactive state container for offline-first, real-time, collaborative apps.
* [HALO](/halo/introduction) - Auth, identity & contact management for decentralized apps.
* MESH - Networking transports used by ECHO & HALO.
* EDGE - Web services running on Cloudflare workers, providing sync, backup, compute, etc.
* App Framework - Build modular applications based around plugins & capabilities, such as [Composer](/composer/introduction).

## Compare

DXOS applications vs typical software-as-a-service web applications:
| | SaaS Web Apps | DXOS Apps |
| :-- | :-- | :-- |
| How code is served | client & server rendered | statically served & client rendered |
| How data is stored | on the **server** | on the **client** (optionally backed up to a server) |
| How data is exchanged | client to server via HTTP or Web Sockets | peer-to-peer via WebRTC (optionally via a sync server) |
| How identity is established | servers issue session tokens after validating credentials with methods like OAuth | clients generate their own private/public key pairs and use them to sign messages in the database. |
