# ECHO storage metrics & garbage collection

Status: **draft / v1**. Tracking: DX-1151.

This document specifies three per-space maintenance APIs on the ECHO `Database`:

- `Database.stats()` — a snapshot of what a space occupies on the host (objects,
  automerge documents, feeds, feed blocks).
- `Database.runGarbageCollection()` — reclaims storage held by soft-deleted
  objects and the documents / feed blocks that are no longer reachable.
- `Database.retainObjects(keep)` — replaces the set of objects the space
  directory tracks, dropping the rest for collection to reclaim. Destructive of
  live data, so it is described separately below rather than as a mode of GC.

The first two are routed through the `DataService` RPC, so the client
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
| Automatic reclamation on peers                     | implemented                     |
| `retainObjects()` — drop all but the retained ids  | implemented (client-side)       |

The EDGE host implements neither of the two RPC APIs yet (each returns a
not-implemented error); this document is the reference for that work.
`retainObjects` runs on the client and needs no host counterpart.

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
  `deleted` flag and a `recordId`. Dependent stores key off `recordId`: the object
  snapshots (`objectSnapshot`), the full-text index over them (`ftsIndex`, which
  tracks how far it has re-tokenized as a cursor over `objectMeta.version`) and
  reverse-refs (`reverseRef`). `IndexTracker` stores per-document indexing cursors keyed by
  `documentId`.
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

Wiping one document commits as a single transaction: its heads row, its
classical chunks, and its subduction ranges. A partial wipe would be
unrecoverable rather than merely incomplete — the orphan scan below enumerates
the heads table, so chunks that outlive their heads row can never be found
again. Interrupting the pass _between_ documents is safe: what was unlinked but
not yet wiped is an orphan, which the next pass finds by the same scan.

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
`objectId`), cascading to `objectSnapshot`, `ftsIndex` and
`reverseRef` (by `recordId`) and the `IndexTracker` cursor (by `documentId`).
This keeps the index from carrying tombstone rows for storage that no longer
exists.

Correctness note: query correctness for deleted objects already holds before GC
(soft-deleted objects carry `deleted = 1` and are filtered out). Step 5 is
space reclamation, not a correctness fix — it is gated by `options.index`.

## Automatic reclamation

Collection is explicit, but its _result_ propagates. Removing an object's entry
from the space directory is an ordinary automerge change, so it replicates like
any other; a peer that receives it wipes the documents that change orphaned,
without being asked and without running a pass of its own. One collection
therefore frees the same bytes everywhere.

This does not make deletion ambient. The soft-to-hard promotion is decided by
whoever ran the collection and arrives here as replicated data; a receiving peer
applies a decision already taken rather than taking one, which is why it needs no
opt-out.

The hook is the space's document-list update. Two cases reach it:

- **A document left the directory** — an unlink replicating in from the peer that
  collected. The departed set is diffed against the previous listing.
- **A new root was applied** (an epoch). The retired root is expanded to its
  whole closure rather than trusting the diff: the listing is debounced, so a
  document linked and orphaned in quick succession may never appear in one at
  all. Walking the retired root makes an epoch deterministic regardless of what
  this peer happened to observe.

Both re-check reachability against the _live_ directory before deleting, because
a document can be re-linked between the event and the deferred task. A directory
that cannot be read is treated as unknown reachability and skips the pass, never
as an empty one — the epoch case expands a whole closure, so reading "nothing is
reachable" there would wipe documents the new root carried forward. Failures are
logged rather than propagated — a peer that fails to reclaim is only still
holding disk.

This is safe because a directory change is atomic and causally delivered.
Concurrent removals of several keys arrive as one change, and automerge holds a
change whose dependencies are missing rather than applying it, so no peer ever
observes a half-unlinked directory and reclaims something still referenced.

## `retainObjects()`

`retainObjects(keep)` replaces the set of objects the space directory tracks.
It is **not** garbage collection: GC reclaims what was already soft-deleted,
whereas this drops live objects on the caller's instruction. Collection is what
reclaims the result, so clearing a space is `retainObjects` followed by
`runGarbageCollection`.

The directory's `objects` and `links` maps already name every object in the
space, so the drop set is diffed against their keys and removed in a single
change — one root write, never a scan of the contents, no object loaded and no
`deleted` flag written per object. The dropped documents are orphaned, and steps
2 and 5 above reclaim them. Because the change replicates like any other, peers
reclaim the same bytes through automatic reclamation without being told to.

**It runs on the client, not the host.** The host can perform the identical
directory rewrite, and the storage outcome is correct when it does — but the
objects keep answering queries afterwards. Nothing rebuilds a client's view of a
space from the directory, so its working set still holds them, and deleting the
index rows does not help because the working set is consulted first. A drop has
to originate where the objects live. `retainObjects` therefore evicts the ids it
removed from the working set, keyed off what the call actually dropped rather
than re-derived from the directory: `_createDocumentForObject` binds an object
before writing its link, so a directory-derived eviction set would drop objects
mid-creation.

Two consequences worth stating plainly:

- **It is permanent.** The objects are dropped, not flagged, so there is no
  tombstone to restore from and no undo.
- **Root history is retained.** The directory keeps the change that removed the
  entries, so the root document itself does not shrink. The bytes reclaimed are
  the linked documents', which is where a space's size actually lives. Dropping
  the root's own history requires a new epoch, which is a separate operation.

A remote peer applying the replicated change reclaims the storage but does not
prune its own working set — same root url, and only a root-url change triggers
the client's reconciliation today. Its view corrects on reload.

## Retired documents

A document that cannot be loaded (Automerge's WASM heap runs out of memory
inflating it) would stall every start that reaches it, on every peer. The host
handles it without reading it. Quarantine lasts one session; retirement is
permanent. Retirement replaces a whole linked document, never one object, and
objects inline in the space root are never retired.

```
        TRIGGER                      QUARANTINED                     RETIRED
                              (in memory, cleared on restart)   (permanent, in the space root)

 ┌────────────────────┐        ┌─────────────────────┐   index has  ┌──────────────────────┐
 │ load runs out of   │───────►│ reason: load-failed │─────────────►│ rebuilt from index   │
 │ memory, and stored │        └─────────────────────┘ all objects  │ reason: load-failed  │
 │ bytes hold ≥100K   │                  │                          └──────────┬───────────┘
 │ ops                │                  │                                     │
 └────────────────────┘                  │                                     │
                                         │ index lacks objects                 │
                                         ▼                                     │
                                 restart → load again                          │
                                 → out of memory again → retry                 │
                                                                               │
 ┌────────────────────┐                                             ┌──────────┴───────────┐
 │ cursor loads with  │                                             │ rebuilt from its     │
 │ ≥100K ops, ≥4×     │────────────────────────────────────────────►│ current state        │
 │ state, cursors only│                                             │ reason: history      │
 └────────────────────┘                                             └──────────┬───────────┘
                                                                               │
 ┌────────────────────┐                                                        │
 │ peer's retirement  │───────────────────────────────────────────────────────►│
 │ arrives            │                                                        │
 └────────────────────┘                                                        ▼
                                                                 ┌───────────────────────────┐
                                                                 │ every peer, every open:   │
                                                                 │ wipe bytes + index rows,  │
                                                                 │ quarantine (retired)      │
                                                                 │ unless still linked or    │
                                                                 │ indexed by another space  │
                                                                 └───────────────────────────┘
```

1. **Quarantine.** `AutomergeHost` listens for `document-load-failed` (a DXOS
   patch on automerge-repo; the repo otherwise swallows the error and leaves
   the load waiting forever). An out-of-memory failure quarantines the document
   for the life of the host: loads resolve as unavailable, and nothing
   replicates or advertises it. Other failures are only logged, since they may
   not repeat. Once the heap is full every load fails, so the host first counts
   the document's ops from its stored chunks, without loading it, and
   quarantines it only at `QUARANTINE_MIN_OPS` (100K) or more; a smaller
   document is a bystander and is only logged. The classical store and the
   Subduction store are counted apart, since either may hold the whole
   document, and the larger count decides.
2. **Retire.** `EchoHost` rebuilds each linked, quarantined document from the
   index (the last indexed JSON of each of its objects) into a replacement whose
   id is derived from the original, so peers retiring concurrently converge on
   one document. It re-points the objects' links and records
   `retired[<documentId>] = { replacedBy, reason }` in the space directory, the
   reason (`load-failed` or `history`) as a plain, non-CRDT string. History is
   dropped, and so is any change the index had not caught up with: the document
   cannot be loaded, so the index is the newest state this peer can read, and
   waiting for it to match the stored heads would leave the document stuck. When
   the index lacks any of the objects, the document stays
   quarantined and is not retired; after a restart it fails to load once more
   before it is quarantined again.
3. **Wipe, everywhere.** Every peer that sees a `retired` entry in a space's
   directory quarantines the document with reason `retired` and wipes its index
   rows and bytes without loading it. The directory naming the document is the
   attribution: loading it to read `access.spaceId` is what retirement avoids.
   An entry naming a document another space or a live link still uses is
   ignored: the directory, space root or credentials of any space this host
   holds, a link or branch of an open directory, or a document the index holds
   under another space (which covers the links of directories not yet opened).
   Any member can write a directory, and a genuine retirement re-points the
   links in the same change.

The space directory is the only durable record: there is no local quarantine
table. The `retired` map is append-only and stays in the directory, so every
open re-quarantines its documents, and a peer that syncs late, or restarts
mid-wipe, still finishes the wipe.

### Documents whose history outgrew their state

A document can still load and yet be mostly history: the unfixed
`Cursor.writeSnapshot` re-inserted its whole snapshot map on every write, so a
cursor with 660 KB of state reached 45.7M ops. Such a document is retired the
same way, before it stops loading:

- Every load from disk reports the document's op count (`documentLoaded`).
  One with at least `HISTORY_BLOAT_MIN_OPS` ops becomes a candidate.
- The next retirement pass rebuilds a candidate from its own current state, so
  no change is lost, but only if it holds just the objects linked to it, every
  one of a type in `HISTORY_RETIREMENT_TYPES` (sync cursors: machine-written
  state), and its ops are at least `HISTORY_BLOAT_RATIO` times the size of that
  state. Otherwise the candidate is dropped.

### Peers retiring at once

- **Same replacement.** The replacement's id is derived from the original, and
  its single change uses an actor derived from its content and a fixed
  timestamp. Peers that rebuild the same state write byte-identical changes,
  which merge into one; peers whose index state differs write distinct changes,
  and Automerge keeps one value per key, the same on every peer.
- **Replacement already delivered.** A peer that already holds the replacement
  reuses it rather than importing a second history over it.
- **Lost entries.** Two peers that each create the `retired` map concurrently
  leave only one map in the merge. Each host remembers the retirements it wrote
  or saw this session, and each retirement pass (the merged change re-points
  links, so it triggers one) writes back any entry the directory lacks.

## Safety & invariants

- **Attribution before deletion.** A document is only wiped when its
  `access.spaceId` matches the target space, or when the space's own directory
  lists it under `retired` and no other space or live link uses it (see
  [Retired documents](#retired-documents)). No global/cross-space sweep.
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
- **Prerequisite:** `SpaceStateMachine.getAutomergeRoot` selects the root by
  DO-KV key order, which is arbitrary once a space has more than one epoch. It
  must order by `Epoch.number` before anything GC-critical runs there.

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
- A scheduled/automatic GC **trigger** (this spec covers only the explicit API;
  automatic _reclamation_ of an already-collected result is implemented above).
- **Reconcile a client's working set on same-root content changes.** A peer that
  applies a replicated `retainObjects` reclaims the storage but keeps showing the
  dropped objects until reload: `_handleSpaceRootDocumentChange` is reached only
  from `updateSpaceState`, which early-returns unless the root url changed, so it
  fires on an epoch and never on a content change to the same root. Any fix must
  be guarded against the window in `_createDocumentForObject` where an object is
  bound before its link is written.
- **Index rows can outlive their documents.** Wiping a document and deleting its
  index rows are separate stores and separate transactions, so a process that
  dies between them leaves rows describing storage that is gone; nothing
  recomputes them. A stale row, not lost data. The document wipe itself is
  atomic — see the interruption note under step 2.
- **Reclaim pages to the filesystem.** Deleting rows returns pages to SQLite's
  freelist, so collection frees space for the database to reuse but does not
  shrink the file on disk. `VACUUM` would, at the cost of rewriting the whole
  file, and it cannot run inside a transaction — so it belongs to a maintenance
  path rather than to a collection pass.
- **Two-peer convergence tests.** Automatic reclamation is covered single-host;
  the replicated path is exercised only by construction.
- **Age guard on the orphan scan.** Document creation and the link write are
  separate operations across the network, so a document created but not yet
  linked is theoretically collectable. Narrowed by the storage-only load and the
  `access.spaceId` check, not closed.
- **Space purge.** Deleting a space leaves its documents and `echo_spaces` row on
  disk. Prerequisite: `acceptSpace` asserts `!isSpaceDeleted`, so a space you
  deleted can never be re-joined — a tombstone must become re-joinable by
  explicit invitation before any purge lands, or the data is unrecoverable.
- **Two races on the epoch root swap.** Applying an epoch clears the client's
  root handle before loading the replacement, leaving a window in which no
  document can be attributed: `EntityManager.getObjectDocumentId` asserts on the
  null handle and fails whichever query is in flight, and
  `SpaceProxy._createEpochInternal` resolves before the swap lands, so callers
  cannot tell when the space is writable again. Both are reachable today via
  `compactDocumentsEpochMigration`; neither is on any path in this document,
  which is why they are recorded rather than fixed here.
- **Fixed: epoch migrations kept deleted inline objects.** The former
  `MigrationBuilder` removed deleted ids from `links` only, so an object inlined
  in the root survived the migration that deleted it. `Migration.Transaction`
  (`db.beginMigration()`) removes it from the inline `objects` map as well.
