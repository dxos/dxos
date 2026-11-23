# ECHO design

ECHO is the DXOS object database. Every space is a database of typed objects that each device holds a full copy of, edits offline, and merges with its peers without a server deciding the order of changes. This document describes ECHO's data model, how it replicates and queries, how it is secured, and where it is going.

## Goals

ECHO exists so that applications can treat shared, collaborative data as ordinary local objects. Its goals:

- **Local first.** Reads and writes go to the device's own copy, so the app works offline and never waits on the network to show an edit.
- **Collaborative by default.** Concurrent edits by many people merge automatically, character by character in text and field by field in objects.
- **Typed.** Every object has a schema, so data written by one app version is read correctly by the next.
- **Private.** A space's data is readable only by its members; relays and EDGE store it without being able to act on it.

Non-goals: ECHO is not a general SQL database, does not offer cross-space transactions, and does not guarantee a global order of writes.

## Data model

A space holds one database. The database holds objects, relations between them, feeds of append-only records, and collections that organize objects for people. An object is an instance of a schema; it can point at other objects through refs, which name their target by a DXN or a space-relative EID rather than holding it.

{{echo-model}}

Refs are what make the graph lazy: an object loads without its targets, and a ref resolves (and subscribes to) its target only when something reads it. A relation is itself an object with a source and a target, so it can carry fields of its own, such as the anchor of a comment on a document.

## Schema

Types are Effect schemas annotated with a typename and a version (`org.dxos.type.document` at `0.1.0`). The schema is the single source for TypeScript types, runtime validation and the JSON Schema stored with the space, so a client that has never seen a type can still render and edit it.

Schema changes are versioned. A migration maps objects from one version to the next and runs eagerly when a space opens, so an app never sees two shapes of the same type at once. Types an app defines at runtime (user-defined tables, for example) are stored as schema objects in the space and replicate like any other object.

## Replication

Each object is an Automerge document. A device applies a change to its own copy, persists it to SQLite, and sends it to every peer it is connected to: other devices of the same space over the MESH swarm, and EDGE, which keeps every space available while its members are offline.

{{echo-sync}}

Peers exchange the heads of a space's collection of documents first, then only the documents whose heads differ, so a device that rejoins after a week sends and receives just what changed. EDGE's Subduction service compacts long histories into snapshots, so a new device downloads a space in proportion to its size rather than its age.

## Queries

A query is a filter over a space (by type, by property, by relation, by text or by meaning) that returns a live result. The client sends it to the echo-host's query service, which plans it against the indexes and streams matching objects back; the result is an atom, so a view that renders it updates as objects are added, edited or deleted, on this device or any other.

{{echo-query}}

The host keeps three indexes up to date as documents change: a type index for filters by typename, a full-text index, and a vector index for semantic search. Indexing runs off the edit path, so a burst of typing never waits on it.

## Spaces and security

Membership of a space is a chain of signed credentials rooted in the identity that created it. HALO, the identity layer, holds each person's keys and devices; admitting a member, adding a device or changing a role is a credential appended to the space's control feed, which every peer verifies before it accepts data from that member.

Data in transit is encrypted between peers, and a device only replicates a space with peers whose credentials it has verified. EDGE holds a space's documents to keep it available but authenticates every request against the same credentials, so a stolen URL or an unauthorized device gets nothing.

## Performance

The targets below are measured on a mid-range laptop with a space of 10,000 objects. Each benchmark runs in CI, and a change that misses its target fails the build.

{{echo-benchmarks}}

Opening a space is dominated by loading the collection's heads and the documents the first view needs; everything else loads on demand. The slowest path today is the first full-text query after a cold start, which waits for the index to catch up.

## Roadmap

- **Partial replication.** Devices sync only the documents a view needs, so very large spaces open on phones.
- **Schema registry.** Shared, versioned types published once and reused across spaces and apps.
- **Fine-grained permissions.** Read-only members and per-collection access, enforced by the same credential chain.
- **Query federation.** One query over several spaces, merged on the device.

Open questions: how far partial replication can go before offline editing of a never-opened object becomes impossible, and whether vector indexes belong on the device or on EDGE.
