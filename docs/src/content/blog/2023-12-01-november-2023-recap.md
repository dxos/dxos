---
title: November 2023 Recap
slug: november-2023-recap
date: 2023-12-01
description: "We proposed a \"hub & spoke\" networking model to work alongside the peer to peer model in data-sovereign sync scenarios."
author: Rich Burdon
tags: []
featureImage: /blog/images/surface-16-9.jpg
---

> We're building an app platform based on a "unified personal data store" that has "privacy and user-owned data" in the core.  
>   
> While we're at it, maybe we'll invent some new UX patterns... 🤷‍♂️ [https://t.co/qRWATC84f1](https://t.co/qRWATC84f1)
> 
> — DXOS (@dxos\_org) [November 21, 2023](https://twitter.com/dxos_org/status/1727060542526050484?ref_src=twsrc%5Etfw)

Instead of apps owning data, people own data.

## Networking topology

We've been discussing our networking strategy. P2P is magic! When it works. We're exploring some alternate approaches and Josiah Witt wrote up our team's initial thoughts on [GitHub](https://github.com/orgs/dxos/discussions/4671). To address these P2P networking challenges, we proposed a "hub & spoke" model, suggesting that browsers defer networking to a native container with enhanced capabilities, such as a cloud server, a self-hosted server, or a native desktop app. This model allows native apps to operate directly or employ a remote agent in case of P2P connection failures, positioning P2P as an upgrade over traditional "hub & spoke" connections. Weigh in with your thoughts on [GitHub](https://github.com/orgs/dxos/discussions/4671) about storage partition problems, WebRTC issues, and considerations for effective P2P implementation. 

## November Releases

### Release 0.3.8

-   new context menu for stack sections in composer
-   network and replication stability improvements
-   bug fixes in composer folders
-   automerge 2.0 experimentation

Check out the full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.3.8) to explore all the details.

### Release 0.3.7

-   composer is now merged with composer labs (all the plugins from labs are now available in composer behind a toggle in the settings panel)
-   network performance and stability improvements
-   ECHO replication performance improvements

Explore all the details in the full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.3.7).

### Release 0.3.5

-   major improvements in the networking layer (less chattiness -> more stability)
-   new composer feature: folders!
-   functions playground (write code inline in composer/labs and execute it like a notebook)
-   composer: better link opening experience (still not perfect, but better!)
-   composer: presence indicators on items in the tree (now you can see where collaborators are in the space)

Check out the full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.3.5) to explore all the details.

## ICYMI

### Office Hours

Jess Martin and Zhenya Savchenko are hosting weekly Office Hours on Thursdays from 11-12 PT. Join us on the DXOS [Discord](https://dxos.org/discord) server.

### Meetup Talks

DXOS leadership spoke at both the [London's Local-first Software Meet-up](https://guild.host/events/localfirst-software-dkh284) on October 18, and the [Local-First Web Development](https://localfirstweb.dev/) Meetup on October 31.
