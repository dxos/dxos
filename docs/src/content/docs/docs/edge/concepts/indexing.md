---
title: Indexing and queries
description: EDGE's index of each space, and how a query uses it.
---

EDGE keeps an index of every space it replicates and can read. A query on a device reads its local index and EDGE's
together, so it can match objects the device has not loaded. A space that grants EDGE only `pull` access is relayed
unread and has no index there.

## Model

**The index.** Each space has an `Indexer` Durable Object. It reads the space's documents as they reach EDGE and indexes
them the way a device indexes its own: by type, by property and by relation.

**Merging results.** A query runs against the device's own index first and returns those results. If the device is
connected, it also asks EDGE, and adds EDGE's matches as they arrive. ECHO treats EDGE's answer as evidence, not
authority: when the device holds an object EDGE matched, it checks the match against its own copy and drops it if the
two disagree, so a slow index cannot bring back an object you deleted. A match for an object the device does not hold is
shown as EDGE reported it. See [Queries](/docs/echo/concepts/queries/).

## Behavior

- Results from the device's own data come back without waiting for EDGE.
- Queries are live. A query never completes; it updates as new matches arrive, from the device or from EDGE.

## Limits

- EDGE's index trails the space by however long changes take to reach it. A change made on another device a moment ago
  may not match yet.
- Offline, a query sees only what the device holds.
- A space with EDGE replication off has no EDGE index.
