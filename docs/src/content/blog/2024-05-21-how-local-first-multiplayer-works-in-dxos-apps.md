---
title: User invitations in local-first collaborative applications
slug: how-local-first-multiplayer-works-in-dxos-apps
date: 2024-05-21
description: HALO is a decentralized identity and access control protocol that makes it easier to build collaborative applications.
author: Rich Burdon
tags: []
featureImage: /blog/images/shell-panels-1.jpg
---

0:00

/0:20

 1× 

> [Composer](https://composer.space) is a super-app for intelligence, where developers can collaborate real-time, organize knowledge, extend with custom data structures, and run private machine learning and AI against their knowledge locally. It's built on the DXOS SDK, an open source project for local-first, collaborative apps that preserve privacy by synchronizing user data peer-to-peer.

We recently released v0.5.2 of the SDK, which includes "delegated invitations" - an improvement to the sync protocol for joining new users into spaces. Now, any online member of the space may admit a guest bearing an invitation, not just the original inviter. This completes a key scenario for DXOS apps – the ability to "fire-and-forget" invitation links to collaborators, letting them join at any later time.

To illustrate the work DXOS Client does under the hood, this post will examine how collaboration works in decentralized, local-first applications.

In traditional cloud apps like Google Docs, the central server is the only source of truth. When someone shares a link to a resource, that link will be handled by the same server(s) which will get a chance to evaluate security rules. Of course, when scaled to multiple servers, the consistency challenges there can resemble the ones we face in a local-first or decentralized web app. Strategies to resolve those consistency challenges often involve declaring a singular authority.

In local-first applications we have to deal with distributed state without the luxury of a central authority. Any client is like an equally authoritative server and new peers have to establish trust relationships with existing ones.

DXOS provides some primitives and data structures to help:

-   A `space` is an instance of an ECHO local database which replicates objects between a set of cloud peers.
-   An `identity` is roughly a public key that is used to identify users and their different devices.
-   An `invitation` is a way members can invite new peers to join a space.

To share something between peers, objects can be added to a space, and other peers can be invited to join that space in order to begin replicating it. ECHO is based on the [Automerge CRDT](https://automerge.org/), so both real time and offline collaboration is possible without manual conflict resolution.

When different devices come online, they discover relevant peers in their spaces through a signaling service. Once discovered, peers exchange offers to establish peer-to-peer WebRTC connections and begin replicating user data that way. The DXOS networking technique forms a mesh network between peers optimized to minimize the number of connections while still maintaining connectivity and redundancy.

"Allowing someone to join" is a process by which a peer validates that the incoming guest is who they say they are and possess evidence of permission to join obtained from one of the existing members of the space. Once the guest is "admitted" the swarm of peers in the space will begin connecting with the guest, sending it data to allow it to replicate, and accepting and replicating their local changes to the space.

## Invitations

Any existing member of a space can generate an invitation with the [`space.share()`](https://docs.dxos.org/guide/typescript/spaces#creating-an-invitation) API. This is an intent to admit someone, and has enough information to be a [`verifiable credential`](https://curity.io/resources/learn/verifiable-credentials/).

First, a key pair is generated for the invitation. The public key is written into the space's `control feed` which is a tamper-proof, append-only log replicated between all members of the space, where every message is signed by the writer's device key.

Existing members of the space receive the intent to admit someone new by replicating the control feed. They all start listening on a topic (a string keyword) that is unique to the space. This topic (a kind of space identifier), the public key, and the private key are all part of the invitation that is sent to the new guest. This information is typically combined into a URL and presented as a QR code to the new user.

## Joining the space

When the guest device comes online, it joins the topic on the signaling server. All existing peers get notified that a new peer has appeared. All the hosts who see the guest make an offer to connect. The guest accepts all the offers, but then attempts working with one host at a time until it succeeds negotiating the invitation.

The rest of the sequence takes the following steps:

1.  An offer to connect is accepted by the guest
2.  Options are exchanged to ensure it's a guest-host pair; host-host is ignored.
3.  Host sends a 32-byte random message as a challenge to prove the invited person possesses the private key corresponding with the public key of the invitation in the control feed.
4.  Guest signs the message with the invitation private key and sends it back.
5.  Host sends back the auth method (how they want guest to prove they have a right to be admitted - can be OTP or known public key or nothing)
6.  Guest responds with the appropriate proof.
7.  If the host verifies the guest's signature, they admit the guest to the space by writing their admission credential into the control feed, including the new member's identity (a public key), and the invitation id that was used.

For single-use invitations, hosts stop listening on the signaling topic once they replicate the admission credential. If the invitation is multi-use, hosts will continue listening and admitting guests and hosts until the invitation expires.

## Not implemented (yet)

It's tricky to build a secure and reliable system for decentralized, real-time collaboration. As of this writing, we're leaving a few things to be implemented later.

For example, in case of a network partition (when some peers can't communicate with others), it's possible that two guests could join the space using the same single-use invitation. This can be handled later during the credential processing stage, where we can sort it out and kick someone out if they shouldn't be there.

If you're keen on consensus, security, decentralized or local-first apps, or just love building mobile apps or desktop apps, join our [Discord](https://discord.gg/d3DPZ3VpH2) and help us solve for the needs of local-first apps while protecting users' sensitive data.

## Summary

Software development is hard enough. The good news is that we no longer need to think about running databases or API servers. App developers can use DXOS Client to add collaborative features to any web app without new server infrastructure. DXOS protects end users' privacy by obviating the need for a centralized database or server, synchronizing JavaScript objects directly peer-to-peer, and leaving end users with ownership of their data.

Check out the docs, star us on [GitHub](https://github.com/dxos) and bring your feedback to [Discord](https://discord.gg/d3DPZ3VpH2) - we'd love to hear from you!
