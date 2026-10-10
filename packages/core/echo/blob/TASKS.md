# @dxos/blob — Tasks

_Resume: local-first storage (Phase 5) implemented; next is its eviction gap, then the File
properties panel and the `edge`/`ni:` → `blob` migration. Uncommitted: none. Last: the `edge`
backend stores bytes in the worker's SQLite first and uploads to EDGE in the background._

Design and the decisions behind it: [docs/DESIGN.md](./docs/DESIGN.md).

## Phase 1: Extract the package

One home for the blob contract and the backends, replacing a spread across `echo-protocol`,
`echo-client`, `sdk/client` and two plugins.

### Tasks

- [x] **`BlobTransport`** — the hosted backend takes four operations (`url`/`put`/`get`/`has`)
      instead of a 33-method `EdgeHttpClient`. `@dxos/client` adapts at the single registration site.
      Side benefit: the backend's tests dropped their `as unknown as EdgeHttpClient` double casts.
- [x] **`@dxos/blob` created and published** — `0.11.1` on npm with trusted publishing configured.
      Contract moved out of `@dxos/echo-protocol` with all seven call sites repointed, no shim.
- [x] **URI encoding and both backends moved in** — `ni-uri` at the root, `./s3`, `./hosted`.
      `@dxos/echo-client`'s `./blob-s3` subpath retired; consumers import `@dxos/blob/s3`.
      Package deps are `@dxos/keys`, `@dxos/invariant`, `@dxos/util` — deliberately no `@dxos/echo`.
- [x] **`BlobManager` left in `@dxos/echo-client`** — a constraint, not an omission. See DESIGN.md;
      moving it reports `project_graph::would_cycle`.

## Phase 2: File properties

- [ ] **Custom Properties surface for `File.File`** — show the stored blob URI (which backend and
      bucket actually hold the bytes) alongside the resolved fetch URL. The URI is stable; the
      presigned URL expires, so the panel has to say so rather than present it as permanent.

## Phase 3: The `edge`/`ni:` → `blob` migration

Both names are persisted on existing `Blob` objects, so this is a migration, not a rename. Ship it
in one pass — the storage name and the scheme live on the same objects, and splitting them doubles
the compatibility surface for no benefit.

### Tasks

- [ ] **Dual-read** — the hosted backend declares `schemes: ['blob', 'ni']` and emits `blob:` for new
      writes. `ni:` stays supported read-side indefinitely.
- [ ] **Alias the storage name** — `Blob.Storage.blob`, with `edge` resolving to the same backend so
      existing space settings keep working.
- [ ] **User-visible label last** — decided separately from the wire format.

## Phase 5: Local-first storage

Blob bytes live on the device first, in the client services database, and EDGE becomes an optional
asynchronous copy — so blobs work offline without putting their bytes in Automerge, which is what
crashed a tab when hundreds of photos were stored inline. Design: [docs/LOCAL-FIRST.md](./docs/LOCAL-FIRST.md).

### Tasks

- [x] **`LocalBlobStore` contract and in-memory store** — content-addressed `put`/`get`/`has` plus the
      upload ledger (`listPending`, `markUploaded`); `createMemoryBlobStore` for tests.
- [x] **Local-first `createEdgeBlobBackend`** — writes local, uploads in the background with jittered
      backoff, reads through from EDGE and caches, `getUrl` as an object URL; `transport` optional.
- [x] **`blobs` table and `BlobStoreService`** — migration `blobs_migrations/0001_init` in
      `client-services`, served over the client services RPC.
- [x] **Registered by `@dxos/client` with or without EDGE**, as the default storage.
- [ ] **Eviction** — needs `BlobBackend.remove` and reference counting (or a mark-and-sweep over the
      spaces' `Blob` objects); until then the local store only grows.
- [ ] **Per-blob failure isolation** — one blob EDGE rejects permanently stalls the ledger behind it.
- [ ] **Wake the uploader on connectivity** (`online` event) rather than waiting out the backoff.
- [ ] **Peer-to-peer transfer** for spaces with no EDGE, where another peer cannot fetch the bytes.

## Phase 4: Backlog

- [ ] **Multiple backends per space** — `BlobManager` already dispatches reads by scheme and
      `createBlob` takes a per-call `storage`, so the blob layer supports this today. The gap is how
      the choice is offered and recorded; likely distinct app-graph groups. Design question first:
      is the backend a property of the collection, the object, or the upload action?
- [ ] **wnfs backend takes a blockstore accessor** rather than a `Client` — the last backend still
      holding a client.
- [ ] **`edge-client` subpath split** into its six method groups (identity, queue, blob, compute,
      registry, gateway); measure the boot budget either side.
- [ ] **Multi-store resolution** — one reference served from several backends (an IPFS mirror).
      Foreclosed by scheme-names-the-backend; needs its own mechanism if wanted. The local cache no
      longer needs it: it lives inside the hosted backend (Phase 5).

### References

- [docs/DESIGN.md](./docs/DESIGN.md) — naming decision, custody table, package graph, migration.
- [docs/LOCAL-FIRST.md](./docs/LOCAL-FIRST.md) — local-first storage for the hosted backend.
- PR [#12789](https://github.com/dxos/dxos/pull/12789).
