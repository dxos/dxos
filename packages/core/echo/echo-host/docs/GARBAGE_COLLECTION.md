# ECHO storage metrics & garbage collection

Status: **draft / v1**. Tracking: DX-1151.

This document specifies two per-space maintenance APIs on the ECHO `Database`:

- `Database.stats()` — a snapshot of what a space occupies on the host (objects,
  automerge documents, feeds, feed blocks).
- `Database.runGarbageCollection()` — reclaims storage held by soft-deleted
  objects and the documents / feed blocks that are no longer reachable.

Both are **per-space** and routed through the `DataService` RPC, so the client
API surface is identical whether the host is in-process (the local client
worker) or remote (EDGE). Only the **local host implements them today**; the EDGE
handlers return a not-implemented error (see the status table below). The
algorithm is written to be re-implementable on EDGE, which holds the same logical
storage (automerge documents + feeds) behind a different physical store.

## Implementation status (local host)

| Capability                                         | Status                          |
| -------------------------------------------------- | ------------------------------- |
| `stats()` — objects, documents, feeds, feed blocks | implemented                     |
| GC step 1 — unlink soft-deleted objects            | implemented                     |
| GC step 2 — wipe unreachable owned documents       | implemented                     |
| GC step 5 — delete stale index rows                | implemented (`index` option)    |
| GC steps 3–4 — feed purge                          | specified, deferred (see below) |

The EDGE host implements neither API yet (both return a not-implemented error);
this document is the reference for that work.

## Why GC is needed

Deletion in ECHO is **soft**: `db.remove(obj)` sets `system.deleted = true` on
the object's `EntityStructure` and (eventually) drops the object's link from the
space directory, but nothing is reclaimed from disk. Over a space's lifetime this
accumulates:

- Automerge documents whose only object was deleted stay on disk (chunks +
  heads) forever — nothing ever calls the storage adapter's `removeRange`.
- The object-metadata index keeps a `deleted = 1` row per removed object
  indefinitely.
- Feeds accumulate superseded and tombstoned blocks that are never reclaimed
  (`FeedStore` has only a manual `deleteOldestBlocks` trim primitive).

GC is the explicit, opt-in maintenance pass that reclaims all of the above for a
single space.

## Storage model (as it exists on the host)

GC has to reason about the concrete stores, so they are enumerated here.

### Automerge documents

- Every space has a **root document** (`DatabaseDirectory`, a.k.a. the "space
  directory"). It holds objects inlined in `objects` and, for every object stored
  in its own document, a `links[objectId] → automerge-url` entry. It also holds a
  `branches` registry of per-object branch document urls.
- Each **linked document** is created per object (`_createDocumentForObject`) and
  carries `access.spaceId` identifying its owning space — this is what lets GC
  attribute a loose document to a space safely.
- Physical storage: `SqliteStorageAdapter` (`automerge_chunks` table, keyed by a
  `[documentId, ...chunkPath]` prefix) plus `SqliteHeadsStore` (`automerge_heads`,
  one row per document). Enumerate every stored document via
  `AutomergeHost.listDocumentHeads()`; delete a document's chunks via
  `SqliteStorageAdapter.removeRange([documentId])` and its heads row via
  `SqliteHeadsStore.remove(documentId)`.

> **Note on the issue's model.** DX-1151 describes feeds as "reflected as an
> automerge document, its being missing means it was deleted." On the current
> DXOS host that reflection does not exist — feeds are a first-class SQLite store
> (below). The GC algorithm is therefore specified against the real store; the
> automerge-per-feed phrasing is preserved only as EDGE guidance where that model
> may hold.

### Feeds

- Feeds are SQLite rows (`feeds(feedPrivateId, spaceId, feedId, feedNamespace)`).
  Blocks are `blocks(insertionId, feedPrivateId, position, sequence, …, data)`,
  one row per appended block, payload optionally sealed.
- Deletion of a feed object is itself a block: `deleteFromFeed` appends a
  tombstone `{ id, '@deleted': true }`. The tombstone gets a non-null `position`
  once it has been assigned a global order (i.e. replicated / durably ordered);
  an unpositioned (`position IS NULL`) block has not.
- Counts available today: `countBlocks`, `countNamespaceBlocks`,
  `countUnpositionedBlocks`; enumerate with `getAllFeedsForSpace`; trim with
  `deleteOldestBlocks`.

### Index

- `EntityMetaIndex` (`objectMeta` table) has one row per indexed object with a
  `deleted` flag and a `recordId`. Dependent indexes key off `recordId`: FTS
  (`ftsIndex`) and reverse-refs (`reverseRef`). `IndexTracker` stores per-document
  indexing cursors keyed by `documentId`.
- Today nothing ever deletes an `objectMeta` row; a deleted object simply flips
  `deleted = 1` and stays. GC deletes the rows for objects it reclaims.

## `stats()`

Returns a per-space snapshot:

```ts
type DatabaseStats = {
  objects: {
    /** Live (non-deleted) objects across the root and all linked documents. */
    alive: number;
    /** Soft-deleted objects not yet reclaimed. */
    deleted: number;
  };
  /** Automerge documents owned by the space (root + linked + branch documents). */
  documents: number;
  /** Feeds registered for the space. */
  feeds: number;
  /** Total feed blocks stored locally for the space. */
  feedBlocks: number;
};
```

Computation (host side, per space):

1. Resolve the space root (`SpaceStateManager.getRootBySpaceId`). If the space is
   not open on the host, `stats()` opens the root document.
2. `objects`: iterate the root's inlined `objects` and every linked document's
   `objects`, bucketing by `EntityStructure.isDeleted`.
3. `documents`: the distinct set of `{ root } ∪ links ∪ branch-member-docs`.
4. `feeds` / `feedBlocks`: `getAllFeedsForSpace(spaceId)` (feed count and summed
   block count).

`stats()` is read-only and never mutates storage.

## `runGarbageCollection()`

Signature:

```ts
runGarbageCollection(options?: {
  /** Also delete stale index rows for reclaimed documents/objects. @default true */
  index?: boolean;
  /** Also purge feed blocks for positioned deletion markers. @default true */
  feeds?: boolean;
}): Promise<GcReport>;

type GcReport = {
  /** Soft-deleted objects unlinked from the space directory. */
  unlinkedObjects: number;
  /** Automerge documents wiped from storage (chunks + heads). */
  removedDocuments: number;
  /** Index rows deleted. */
  removedIndexEntries: number;
  /** Feed blocks purged. */
  purgedFeedBlocks: number;
};
```

The pass runs the following ordered steps for one space. Order matters:
unlinking (step 1) is what makes documents unreachable for step 2, and both feed
into the index sweep (step 5).

### 1. Unlink soft-deleted objects from the space directory

Load the root and every linked document. For each object marked
`system.deleted`:

- If it is an **inlined** object in a document, delete it from that document's
  `objects` map.
- If it is the sole object of its own **linked** document, remove the
  `links[objectId]` entry from the root. The document is now unreachable and is
  reclaimed in step 2.

The mutation is applied on the host's copy of the document via the document
handle; it replicates like any other change.

### 2. Wipe unreachable documents owned by the space

Compute the **reachable set** by walking the space directory transitively from
the root: `{ root } ∪ links ∪ branch-member-docs`, following any nested links.

Enumerate every document on the host (`listDocumentHeads()`). A document is an
**orphan of this space** — and is wiped — iff:

- it is **not** in the reachable set, **and**
- its `access.spaceId` equals the target space id.

The `access.spaceId` check is the safety boundary: GC never touches a document it
cannot positively attribute to the space (documents with no `access`, or owned by
another space, are left alone). This also cleans up "prior" orphans — documents
unlinked in an earlier session whose bytes were never reclaimed.

Wiping = `SqliteStorageAdapter.removeRange([documentId])` **and**
`SqliteHeadsStore.remove(documentId)` (both, or the heads row is orphaned).

### 3. Purge feeds not present in the space

On a store where each feed is reflected as an automerge document (EDGE), a feed
whose reflecting document is gone has been deleted: purge the feed and all its
blocks. On the current SQLite host there is no such reflection — feeds are scoped
to the space by their `spaceId` column and a space's feeds are removed only when
the whole space is removed — so this step is a no-op for a live space and is
documented here for the EDGE implementation.

### 4. Purge blocks of deleted feed objects

For each feed in the space, find tombstone blocks (`@deleted: true`). For every
tombstone that has a **non-null `position`**, purge every block for that object
id (the tombstone and all superseded content blocks).

> **Safety invariant.** Skip any tombstone whose `position IS NULL`. An
> unpositioned deletion marker has not been durably ordered / replicated;
> purging on the strength of it risks discarding data that a peer has not yet
> reconciled. Only a positioned marker is authoritative enough to purge behind.

### 5. Update the index

For every document wiped in step 2 and every object removed in step 1, delete the
corresponding index rows: `objectMeta` (by `spaceId` + `documentId`, or by
`objectId`), cascading to `ftsIndex` and `reverseRef` (by `recordId`) and the
`IndexTracker` cursor (by `documentId`). This keeps the index from carrying
tombstone rows for storage that no longer exists.

Correctness note: query correctness for deleted objects already holds before GC
(soft-deleted objects carry `deleted = 1` and are filtered out). Step 5 is
space reclamation, not a correctness fix — it is gated by `options.index`.

## Safety & invariants

- **Attribution before deletion.** A document is only wiped when its
  `access.spaceId` matches the target space. No global/cross-space sweep.
- **Reachability is computed from the synced directory**, so a document still
  referenced by any live object (including via branches) is never wiped.
- **Unpositioned tombstones are never acted on** (step 4) — this is the guard
  against purging behind an unreplicated deletion marker.
- **Idempotent.** Running GC twice reclaims nothing the second time; the report's
  counts go to zero.
- **Additive & opt-in.** GC only runs when called. It changes no existing read or
  write path; a space that never calls it behaves exactly as before.

## Cost

`stats()` and step 2 load the space's documents and enumerate the host's heads
store. This is O(documents-in-space) plus O(documents-on-host) for the orphan
sweep — acceptable for an explicit maintenance operation, not something to call
on a hot path. Callers should treat both APIs as occasional/administrative.

## EDGE implications

EDGE stores the same logical data behind Cloudflare-backed storage. The
`DataService` routing means the client API is identical; only the host handler
differs. When implementing on EDGE:

- Steps 1–2 map onto EDGE's automerge document store (attribute by
  `access.spaceId`, wipe unreachable documents).
- Step 3 becomes meaningful if feeds are reflected as automerge documents there;
  otherwise it mirrors the SQLite no-op.
- Step 4's positioned-tombstone invariant is storage-independent and must be
  preserved.
- Step 5 targets whatever index EDGE maintains.

## Deferred / future work

- **Feed purge (steps 3–4).** Deferred on the local host. Two blockers: (a) this
  host's feeds are SQLite-backed rather than reflected as automerge documents, so
  step 3's "feed reflecting document is gone" signal does not exist here; (b) feed
  `blocks` rows store an **opaque, optionally AES-sealed** payload with **no
  object-id column**, so "purge every block for a deleted object id" cannot be
  expressed as a keyed delete without either decoding every payload (needs the
  space keys) or a schema migration that indexes the object id. `runGarbageCollection`
  already accepts a `feeds` option and reports `purgedFeedBlocks`; the count is `0`
  until this lands. The positioned-tombstone safety invariant (step 4) must be
  honored when it does.
- Incremental / budgeted GC (bounded work per call) for very large spaces.
- Automerge document **compaction** (rewrite a live document to drop deleted
  history) — distinct from wiping whole documents.
- A scheduled/automatic GC trigger (this spec covers only the explicit API).
