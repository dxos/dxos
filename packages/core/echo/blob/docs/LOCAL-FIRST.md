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

```text
 tab / app                                      worker (client services host)
┌──────────────────────────────────┐          ┌────────────────────────────────┐
│ BlobManager ── createEdgeBlobBackend         │                                │
│                 │   │                        │  BlobStoreService (RPC)        │
│     local ──────┘   └── transport ──► EDGE   │   └─ blobs table in the DXOS   │
│  (createRpcBlobStore) ─────────────────────► │      OPFS SQLite database      │
└──────────────────────────────────┘          └────────────────────────────────┘
```

- **`LocalBlobStore`** (`@dxos/blob`) is the contract: content-addressed `put`/`get`/`has`, plus the
  upload ledger (`listPending`, `markUploaded`). `createMemoryBlobStore` implements it in memory for
  tests and for hosts with no durable store.
- **`BlobStoreService`** (`@dxos/protocols/rpc`) serves that contract from the `blobs` table of the
  client services host's database — in the browser, the OPFS database the dedicated worker opens.
  `@dxos/client` adapts the RPC to `LocalBlobStore` (`createRpcBlobStore`).
- **`createEdgeBlobBackend({ local, transport? })`** composes the two. `transport` is optional: with no
  EDGE endpoint configured the backend is local-only.

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

| Operation | Local-only (no EDGE URL)          | With EDGE                                                                     |
| --------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `put`     | local write                       | local write, then wake the uploader; never waits on the network               |
| `get`     | local                             | local; on a miss fetch from EDGE and cache it as already uploaded             |
| `has`     | local                             | local, else EDGE                                                              |
| `getUrl`  | object URL over the local bytes   | same, after a read-through; if EDGE cannot be reached, EDGE's own URL         |
| upload    | entries stay pending indefinitely | background loop drains the ledger; jittered exponential backoff, 1 s to 5 min |

URIs are unchanged — `ni:///sha-256;…` — so existing blobs resolve and EDGE addressing is the same.
Uploads are idempotent because the key is the content hash, which is why the background loop and
`flush()` can safely overlap, and why a duplicate upload from two tabs costs bandwidth, not
correctness.

The ledger lives in the database rather than in memory, so a write made offline is uploaded by
whichever later session has a transport — including a session that only gains an EDGE URL later.

`getUrl` returns an object URL over the local bytes so a blob renders offline. Each URL is created
once per hash and revoked when the backend closes; the bytes it holds stay in memory until then.

## Decisions

1. **The table lives in the client services database, reached over RPC.** The backend runs in the
   tab, but the database belongs to the worker (OPFS sync handles are exclusive). A dedicated
   four-verb RPC is narrower than reusing `SqlService`, whose statement screening is built for
   untrusted operations.
2. **The uploader runs in the client, not the host.** It needs the authenticated `EdgeHttpClient`
   the client already holds, and it keeps the backend testable against an in-memory store and
   transport. The cost is one uploader per open client — idempotent, so harmless.
3. **The backend is the default storage with or without EDGE.** Bytes always land locally first, so
   a client with no EDGE URL no longer falls back to inline storage. The trade: without EDGE, another
   peer cannot fetch those bytes (inline bytes replicated with the document); a peer-to-peer blob
   transfer would close that.
4. **No `remove` on `BlobBackend`.** Not needed for local-first reads and writes, so not added.

## Known gaps

- **The local store only grows.** Content-addressed bytes can be shared by several `Blob` objects
  and nothing counts references, so nothing knows when an entry is safe to evict. Eviction needs
  `BlobBackend.remove` plus reference counting or a mark-and-sweep over the spaces' `Blob` objects.
- **One failing blob stalls the queue.** The uploader works the ledger oldest first and retries the
  whole pass on any failure, so a blob EDGE rejects permanently blocks the ones behind it. Sizes are
  checked before the write (`MAX_EDGE_BLOB_SIZE`), which removes the obvious cause.
- **Directly uploaded blobs are not copied locally until first read** (`adoptUpload`), since the bytes
  never passed through this process.
- **No connectivity signal.** The uploader learns that EDGE is back only when its next retry
  succeeds, up to five minutes later; an `online` event could wake it sooner.
- **Peer-to-peer blob transfer** — see decision 3.
