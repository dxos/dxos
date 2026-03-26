---
title: "What is \"Cloudless\" software?"
slug: what-do-we-mean-by-cloudless-software
date: 2024-04-29
description: There are still signaling servers for peer discovery, but all data exchange happens peer-to-peer, and no servers have access to the data.
author: Rich Burdon
tags: []
featureImage: /blog/images/richburdon_httpss.mj.runcLvDQ6d75mg_monochromatic_technology__e5c4ed6a-05e4-4ba1-8ff1-cc7bfdfa82d9_3.png
---

We've been talking about "cloudless" software for a while now. It's provocative and hard to believe. Perhaps it's time we explain in more detail what we mean by that. In this post, we'll describe exactly how DXOS applications work and why we call them cloudless.

> TLDR: Yes, there are still some servers involved, but with DXOS, the server is just a signaling service for peer discovery. All data exchange happens peer-to-peer, and no servers have access to the data. This architecture is more private, and more cost-effective than traditional client-server architectures. If you're building a collaborative app for a small team of people, DXOS may be a good fit for you.

Most apps today run on servers. Whether they're server-side rendered, client-side rendered, or a mix of both, the source of truth is a database behind an API. Most applications implement a simple CRUD interface against the database, and it works great for online apps that don't require too much real-time collaboration (multiplayer writers). But what if you want to build a collaborative document editor, or an offline data-entry scenario? Simple CRUD may not be enough. You'll need to implement a sync protocol that can deal with conflicts, and that's where things can get more complicated. Furthermore, by defaulting to a server-based topology, you're giving up on end-user privacy and depend on their trust in your ability to keep their data safe.

There are a few ways to implement real-time sync. One way is to use a centralized server that acts as the source of truth. This is the most common approach, and it works well for many applications. For example, you can pay to use integrated services like [LiveBlocks](https://liveblocks.io/), or [Velt](https://velt.dev/), or roll your own with something like [Fluid Framework](https://fluidframework.com/) or just use [Electric SQL](https://electric-sql.com/).

Centralized services have some downsides. For one, you need to pay for hosting and maintain your own servers or pay a premium for services like Velt or LiveBlocks. It also means that you need to trust the server operator with your data. Finally, it also means that your app won't work offline, since it relies on the server to mediate data exchange between clients.

This is why we built DXOS. We think end users deserve better. Offline and real-time collaboration should be the default, not the exception. End-user privacy should not have to be surrendered to servers and cloud operators. The problem has been that building all of that is prohibitively hard for a software company, and there haven't been many alternatives to the standard 3-tier cloud topology.

DXOS offers ECHO, a CRDT-based graph database that works entirely on the client. ECHO supports real-time multiplayer and offline writers, and works without a central server or authority - all peers are equal. Data exchange between peers happens over direct WebRTC connections, which are established via our signaling service for peer discovery. This signaling service doesn't need to handle too much traffic, since peer discovery is very lightweight and all of the actual data is sent peer-to-peer. The signaling service also works as another peer-to-peer network and uses [libp2p](https://libp2p.io/) pubsub ([gossipsub](https://docs.libp2p.io/concepts/pubsub/overview/)) to scale horizontally. DXOS operates a default signaling network, but anyone is welcome to operate their own using our components. Overall, this architecture preserves end-user privacy and cuts infrastructure costs significantly, while enabling offline and real-time collaboration.

If you're building a collaborative app for small teams of people, DXOS may be a good fit for you. You won't have to operate any servers or databases, your app can work entirely on the client, your users will be able to work offline, collaborate in real-time, and their data will never leave devices they trust.

Try the [DXOS SDK](https://docs.dxos.org). Check out the app we're building with it: [Composer](https://dxos.org/composer).

Join our [Discord](https://discord.gg/FhG4W87KbC) - we'd love to hear from you.

Learn more:

-   How WebRTC works - [a post by Dennis Ivy](https://medium.com/agora-io/how-does-webrtc-work-996748603141)
-   [CRDTs](https://crdt.tech/)
-   [libp2p pubsub](https://docs.libp2p.io/concepts/pubsub/overview/)
