---
title: Announcing DXOS Agents
slug: announcing-the-managed-agent-service
date: 2024-06-26
description: DXOS is launching a fully-managed service to host agents.
author: Rich Burdon
tags: []
featureImage: /blog/images/bg-kube.png
---

> DXOS is launching a fully-managed service that runs your agents without having to worry about the underlying infrastructure and uptime. With a single click, you can start an agent in seconds.

## What are agents?

DXOS is a decentralized and privacy-preserving platform which communicates peer-to-peer. When all the peers go offline, it's impossible for any new peers to replicate. This is where agents come in. Agents are just like any other peer, but are assumed to have more uptime on the network. They should typically be running on servers or desktop machines which are always plugged in.

## Why managed agents?

DXOS is an open platform with a focus on privacy. Anyone can run a regular peer on any machine they want and that would qualify as an agent. We also offer an open-source [CLI tool](https://docs.dxos.org/guide/tooling/cli/agent.html) which can run the agent on any machine from the command line. If you have an always-on machine and you have lots of disk space, that's perfect. However, if you don't want to run your own server, the managed service is a convenient alternative.

The other big reason for choosing the managed service besides great uptime, network speeds, and managed disk space, is it's a simple and convenient _offsite backup_ for your ECHO data and HALO identity. This allows you to recover your account from anywhere in the world, even if you lose all your devices.

## Sharing a Single Agent (and Data Storage) Across Multiple Applications

Our vision is to enable significant savings through the interoperability of DXOS applications. Local-first apps can share the same agent and data storage, maintaining data privacy without extra charges for each additional app.

Similar to iCloud storage, which allows various applications to write to a single data storage layer, this storage belongs entirely to you and can be run anywhere.

## Free During Preview Phase

The managed service is free while in the preview phase. Please sign-up for the [Composer Beta](https://composer.space), and contact us on [Discord](https://discord.gg/W4GN4xgTT7) for access to Agents.
