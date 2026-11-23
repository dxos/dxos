---
title: Indexing and queries
description: EDGE's index of each space, and how a query uses it.
---

EDGE keeps an index of every space it replicates and can read. A query on a device reads its local index and EDGE's
together, so your query can match objects the device has not loaded.

A space that grants EDGE only `pull` access, the lowest access level, is relayed unread and has no index there. See
HALO's [Spaces and membership](/docs/halo/concepts/spaces-membership/).

## Model

A device loads only the documents it needs. How does a query match an object the device has never loaded? A query that
should match the whole space also asks EDGE.

**The index.** An **index** is a lookup from a type, a property or a relation to the objects that have it. Each space
has an `Indexer` [Durable Object](/docs/edge/concepts/architecture/) on EDGE. It reads the space's documents as they
reach EDGE and indexes them the way a device indexes its own.

**Merging results.** A query runs against the device's own index first and returns those results. If the device is
connected, the query also asks EDGE, and adds EDGE's matches as they arrive.

ECHO treats EDGE's answer as evidence, not authority:

- If the device holds an object EDGE matched, the device checks the match against its own copy and drops it if the two
  disagree. A slow index therefore cannot bring back an object you deleted.
- If the device does not hold the object, the match is shown as EDGE reported it.

See [Queries](/docs/echo/concepts/queries/) for how a query combines its sources.

## Behavior

- Results from the device's own data come back without waiting for EDGE.
- Queries are live. A query never completes. It updates as new matches arrive, from the device or from EDGE.

## Limits

- EDGE's index trails the space by however long changes take to reach it. A change made on another device a moment ago
  may not match yet.
- If the device is offline, a query sees only what the device holds.
- If a space has EDGE replication off, it has no EDGE index.
