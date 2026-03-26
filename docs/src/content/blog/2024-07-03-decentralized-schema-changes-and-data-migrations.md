---
title: Decentralized schema and data migration
slug: decentralized-schema-changes-and-data-migrations
date: 2024-07-03
description: Changing the data structures of production applications can be complex and error prone.
author: Rich Burdon
tags: []
featureImage: /blog/images/tn-algorithm-02-pa-v02-00000-1.png
---

Changing the data structures of production applications can be complex and error prone. In a centralized system, this is typically done by carefully moving data and services from the old to the new data formats. Cloud based systems can implement scheduled maintenance periods to handle complex data migrations.

When there is no central authority, it gets even more challenging. Users may have incomplete local copies of data – and may be periodically offline with local changes that haven't yet been replicated to other users.

## Epochs

[ECHO](https://docs.dxos.org/guide/echo/), the peer-to-peer, privacy-preserving database from DXOS, uses Epochs via a low level [`MigrationBuilder`](https://github.com/dxos/dxos/blob/main/packages/sdk/migrations/src/migration-builder.ts) API to assist with coordinating changes in this decentralized environment.

Epochs are a way to manage the ever-growing history of changes to the data in the underlying [Automerge](https://automerge.org/) CRDT of ECHO. Periodically, peers in a space will agree to create a new Epoch, which is a "new beginning" from a specific point in the history. This is similar to how git branches become merge commits, where history is collapsed into a compact state. There are of course limitations on the maximum allowable age of a "stale client" to return to the swarm. If some peer was offline for too long and missed one or more Epochs, they will be unable to merge their changes with the swarm when they come online – for now.

Another reason we use epochs is for consistency. The default behavior of CRDTs is to merge compatible changes from different peers. When performing a migration we want to have strict control over how changes are merged to make sure the data doesn't get corrupted. The Epoch is our way to give each peer total control over the outcome of the migration. Currently, any remote changes received during the migration will be rejected. Of course the concurrent changes are still kept in history, and in the future we might add APIs to view them and then either automatically or manually (git-merge style) rebase them onto the new epoch.

This is the state of the art of ECHO - we're actively thinking about how to further improve the process, and how to make it easier for peers to catch up on missed Epochs.

## Migrations

ECHO supports strongly typed objects by representing their type information as [`effect-schema`](https://effect.website/) objects natively in the database. This has many benefits for developers and end-users, and participates in the migration pattern whenever the schema (type information) needs to change.

Migrations are events when data needs to be transformed from an old schema to a new schema before an application can continue working with the data.

Developers may achieve similar results with direct manipulation of the data, but coordinating this process with distributed peers leads to challenges with durability, performance, and idempotency (consistency) of the migration process.

Instead of performing direct writes, which would grow the CRDT and cause other peers to replicate them, ECHO offers a lower-level [`MigrationBuilder`](https://github.com/dxos/dxos/blob/main/packages/sdk/migrations/src/migration-builder.ts) API which helps perform large transactional changes to "the entire database" in a single operation. [`MigrationBuilder`](https://github.com/dxos/dxos/blob/main/packages/sdk/migrations/src/migration-builder.ts) works by generating a new Epoch and constructing the new state with respect to the new schema in a single process. By using an Epoch, this kind of substantial change to the database is atomic and consistent across the entire swarm.

## Limitations

There are still some unsolved problems we're working on.

If two peers are network partitioned (disconnected from each other) during an Epoch, we only choose one of the Epochs to be the canonical changes after they rejoin. We hope to explore how to improve on this current solution in the near future.

We're also thinking about how to make the process of migrating data more user-friendly. For example, we could introduce a protocol-level policy that says "if you don't come back to the swarm within a specified period of time, your changes will be abandoned." This would allow the swarm to continue to make progress without being held back by peers who are not actively participating.

There are other potential ways to transform changes in otherwise abandoned Epochs and somehow "rebase" them onto the canonical state once latent peers rejoin the space. Perhaps the schema itself can be represented with a CRDT. The [Cambria](https://www.inkandswitch.com/cambria/) project from Ink & Switch suggests the usage of lenses for reads and writes.

If you're interested in these problems, we'd love to hear from you. Join the conversation on [Discord](https://discord.gg/FhG4W87KbC) and let's talk about decentralized problems.
