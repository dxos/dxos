---
title: Announcing the DXOS Technical Preview
slug: technical-preview
date: 2023-06-21
description: DXOS is announcing a Technical Preview of our developer platform for building beautiful, local-first, collaborative applications.
author: Rich Burdon
tags:
  - Announcements
featureImage: /blog/images/Blog-Announcement-Image-1.jpg
---

Today we're excited to share a **Technical Preview** of the DXOS platform, an open source project that supports the development of local-first, collaborative applications. DXOS was created by a small core team of developers from many countries. Our goal is to enable developers to quickly and easily create powerful collaborative, interoperable applications.

🐲

DXOS is a ****Technical Preview.**** Please don't use this for production data. We're working towards a stable and secure 1.0 release.

## What is DXOS

DXOS is a developer platform for building beautiful, local-first, collaborative applications. It consists of three main components that work together:

-   [ECHO](https://docs.dxos.org/guide/platform/), a distributed, local-first data store
-   [HALO](https://docs.dxos.org/guide/platform/halo.html), an encrypted identity solution
-   [KUBE](https://docs.dxos.org/guide/platform/kube.html), runtime services for peer-to-peer applications

We wrap these three components together in a set of SDKs (currently, [React](https://docs.dxos.org/guide/react/) and [TypeScript](https://docs.dxos.org/guide/typescript/)) that enable developers to deliver sophisticated applications quickly.

## Getting started with DXOS

With today's Technical Preview, DXOS is suitable for building real-world applications. We're using DXOS-powered apps ourselves on a daily basis. Here are three ways you can get started with DXOS.

0:00

/0:29

 1× 

Quickly build peer-to-peer apps with state synchronization.

**Run through Getting Started in our Docs.**  
Our [Getting Started guide](https://docs.dxos.org/guide/getting-started.html) in the docs takes you through building your first DXOS application. You'll get an overview of how ECHO stores data, how HALO handles user identity, and the SDKs that enable developers to quickly build apps.

![Collaboratively edit GitHub Issues with the Composer Chrome Extension.](/blog/images/Screen-Shot-2023-06-21-at-4.52.30-PM.png)

Collaboratively edit GitHub Issues with the Composer Chrome Extension.

**Try out our collaborative GitHub Issues editor.**  
We built a Chrome extension powered by DXOS that enables multiplayer collaboration on GitHub Issues. [Install the Chrome extension](https://chrome.google.com/webstore/detail/dxos-composer/gjichmoaohdfcfediacjjgcocbmblkjo) and try editing a GitHub Issue to get a feel for what DXOS enables.

**Join our Discord to follow along.**  
We'd love to hear what you're interested in building. You can talk with the team and follow along with what we're building in [our Discord](https://rebrand.ly/dxoscord).

## What's Next

The **Technical Preview** marks a milestone for DXOS. DXOS has always been open source, but now we're working with the garage door up. Here are three things we're working on right now:

-   [**Composer**](https://composer.dxos.org)**.** We're building a local-first, collaborative, extensible text editor. We built a minimal markdown editor to power the Composer Extension, and now we're extending it into a plugin-friendly environment for hosting DXOS apps. It's shaping up to be something in between Notion and Airtable with a sprinkle of macOS Widgets.
-   **Personal agents.** Peer-to-peer is an excellent collaboration model for several reasons: latency is incredibly low with no server round-trips, peers can still communicate over a local network even without internet. But there are challenges as well: peers have to be online at the same time to share state with one another and data isn't backed up on another device. [Personal agents](https://github.com/dxos/dxos/blob/main/docs/docs/design/remote-agents.md) are a solution we're working on to enable persistent replication and secure off-device backups.
-   **Stability, reliability, security.** We're using our own DXOS apps in production every day. And that means the platform needs to be stable, reliable, and secure. While the platform is largely peer-to-peer and decentralized, there are still some centralized points of failure. We're working on hardening that infrastructure and improving the documentation and DX for those who wish to self-host.
