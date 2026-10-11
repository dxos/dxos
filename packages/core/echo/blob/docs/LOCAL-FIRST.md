# Local-first blob storage

The `edge` blob backend stores every blob on the device first and treats EDGE as an optional,
asynchronous copy. Before this, the backend was online-only — a write or a read with EDGE
unreachable rejected — and the only offline-capable storage was `inline`, which keeps the bytes
inside the object's Automerge document.

## Why

Inline storage is what failed. A sync that stored a few hundred ~100 KB photos inline grew the
documents until the tab crashed, and after the crash the database came back empty. Bytes of that
size do not belong in a CRDT: every change is replicated and kept in history, and every load pays
for all of it.

The hosted backend already kept bytes out of the documents, but needed the network for every read
and write. Making it local-first gives the property inline storage had — works offline — without
putting the bytes in Automerge.

## Shape

A client writes to the store on its device and is done. Replication with EDGE is a separate layer in
the client services host, present only when an EDGE URL is configured; without it the client is
complete on its own.

```text
 tab / app                               worker (client services host)
┌──────────────────────────────┐        ┌─────────────────────────────────────────┐
│ BlobManager                  │        │ BlobStoreService (RPC)                  │
│   └─ createEdgeBlobBackend   │  RPC   │   ├─ LocalBlobStore ── blobs table      │
│        └─ createRpcBlobStore ├───────►│   │                    (OPFS SQLite)    │
└──────────────────────────────┘        │   └─ BlobReplication ─ async ──► EDGE   │
                                        │      (only with an EDGE URL)            │
                                        └─────────────────────────────────────────┘
```

- **`BlobStore`** (`@dxos/blob`) is what a client needs: content-addressed `put`/`get`/`has`.
  **`LocalBlobStore`** extends it with the upload ledger (`listPending`, `markUploaded`);
  `createMemoryBlobStore` implements it in memory.
- **`createEdgeBlobBackend({ store, finalizeUpload? })`** is the client's backend. It talks only to the
  store; `finalizeUpload` (adopting a direct upload) is the one EDGE call it can make.
- **`BlobStoreService`** (`@dxos/protocols/rpc`) is served by three layers in `client-services`:
  - `LocalBlobStoreLayer` — the `blobs` table. Always present.
  - `BlobReplicationLayer` — only in a stack with an EDGE endpoint; without one,
    `BlobReplicationNoopLayer` serves reads from the local store and leaves writes in the ledger. Runs `createBlobReplicator`
    (`@dxos/blob/hosted`), which pushes the ledger to EDGE, and `withReadThrough`, which fills local
    misses from EDGE. It starts on `NetworkReady`, once the worker's EDGE client is authenticated.
  - `BlobStoreServiceLayer` — the RPC handlers. A `put` is confirmed once the local store holds the
    bytes, and only then is replication woken; it never waits on the network.

### Table

```sql
CREATE TABLE IF NOT EXISTS blobs (
  hash TEXT PRIMARY KEY,   -- lowercase hex SHA-256, the same key EDGE uses
  type TEXT,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  uploaded_at INTEGER      -- NULL while EDGE does not yet hold the bytes
);
CREATE INDEX IF NOT EXISTS blobs_pending ON blobs (created_at) WHERE uploaded_at IS NULL;
```

Snake-case columns match the other tables in the client database. The partial index is the upload
ledger, so scanning for pending work never reads the bytes.

## Behaviour

| Operation   | Without EDGE URL                | With EDGE                                                                   |
| ----------- | ------------------------------- | --------------------------------------------------------------------------- |
| `put`       | local write, confirmed          | local write, confirmed; then replication is woken                           |
| `get`       | local                           | local; on a miss the host fetches from EDGE and caches it as already pushed |
| `has`       | local                           | local, else EDGE                                                            |
| `getUrl`    | object URL over the local bytes | same, after the host's read-through                                         |
| replication | absent; entries stay pending    | drains the ledger; jittered exponential backoff, 1 s to 5 min               |

URIs are unchanged — `ni:///sha-256;…` — so existing blobs resolve and EDGE addressing is the same.
Uploads are idempotent because the key is the content hash, which is why the replication loop and
`flush()` can safely overlap.

The ledger lives in the database rather than in memory, so a write made offline is uploaded by
whichever later session replicates — including one that only gains an EDGE URL later.

`getUrl` returns an object URL over the local bytes so a blob renders offline. Each URL is created
once per hash and revoked when the backend closes; the bytes it holds stay in memory until then.

## Decisions

1. **The table lives in the client services database, reached over RPC.** The backend runs in the
   tab, but the database belongs to the worker (OPFS sync handles are exclusive). A dedicated
   four-verb RPC is narrower than reusing `SqlService`, whose statement screening is built for
   untrusted operations.
2. **Replication runs in the host, as its own layer.** A client write is confirmed once the bytes
   are stored locally; pushing to EDGE is asynchronous replication, like document sync, and is
   absent from a stack with no EDGE URL. One replicator per host rather than per tab, using the
   worker's EDGE client, which is authenticated once the identity loads.
3. **The backend is the default storage with or without EDGE.** Bytes always land locally first, so
   a client with no EDGE URL no longer falls back to inline storage. The trade: without EDGE, another
   peer cannot fetch those bytes (inline bytes replicated with the document); a peer-to-peer blob
   transfer would close that.
4. **No `remove` on `BlobBackend`.** Not needed for local-first reads and writes, so not added.

## Known gaps

- **The local store only grows.** Content-addressed bytes can be shared by several `Blob` objects
  and nothing counts references, so nothing knows when an entry is safe to evict. Eviction needs
  `BlobBackend.remove` plus reference counting or a mark-and-sweep over the spaces' `Blob` objects.
- **One failing blob stalls the queue.** Replication works the ledger oldest first and retries the
  whole pass on any failure, so a blob EDGE rejects permanently blocks the ones behind it. Sizes are
  checked before the write (`MAX_EDGE_BLOB_SIZE`), which removes the obvious cause.
- **Directly uploaded blobs are not copied locally until first read** (`adoptUpload`), since the bytes
  never passed through this process.
- **No connectivity signal.** Replication learns that EDGE is back only when its next retry
  succeeds, up to five minutes later; an `online` event could wake it sooner.
- **Peer-to-peer blob transfer** — see decision 3.
