# Automerge-object optimization track

Storage kind: `db.add(obj)` — default `placement: 'linked-doc'`, one Automerge document per object.

## How this was measured

CPU profile of a synthetic workload (250 insert / 250 point-select / 50 filtered-scan / 250 update
/ 250 delete against `TestSchema.Expando`, via `EchoTestBuilder` over a real file-backed SQLite
store) captured with `DX_PROFILE_TESTS=1 moon run echo-client-e2e:test --force -- <file>`
(`test-perf-leaks` skill). All operations used `db.flush({ indexes: false })` to remove the
index-engine RPC as a shared confound between tracks — see "Confound found" below.

32,031 samples / 37.4s wall for the full workload. Bucket breakdown:

| Bucket                                      | Share     |
| ------------------------------------------- | --------- |
| bs58check + noble-hashes (doc-ID checksums) | **20.1%** |
| idle (I/O wait)                             | 21.9%     |
| Automerge WASM (all)                        | 10.4%     |
| SQLite driver                               | 9.8%      |
| Effect runtime                              | 6.4%      |
| gc                                          | 1.1%      |

Related benchmark: `packages/core/echo/echo-client-e2e/src/echo.bench.ts`'s "automerge object"
describe block (PR #12649, #12668) — vitest-native `bench()` numbers for insert / select / scan /
update / delete, plus a batched-insert variant.

## Current findings

### 1. Doc-ID checksum overhead — the single biggest bucket (~20%)

`bs58check`'s `encode`/`decode` (`base-x/src/esm/index.js:22`, `:67`) and the two SHA-256 passes
they require (`@noble/hashes/esm/_sha2.js`) dominate the profile. Root cause, traced through
`node_modules/.pnpm/@automerge+automerge-repo.../dist/AutomergeUrl.js` (no memoization anywhere)
and `Repo.create2()`: every new document does `stringifyAutomergeUrl` immediately followed by
`parseAutomergeUrl` — encoding an ID and then decoding it right back, redundantly. This fires once
per object created (one Automerge doc per object under `linked-doc` placement), and again wherever
a `DocumentId`/`AutomergeUrl` round-trips through `interpretAsDocumentId`
(`AutomergeUrl.js:166`, 0.61% on its own in this profile).

Top self-time lines from the profile (`packages/core/echo/echo-client-e2e` hotspot harness,
32,031-sample run):

- `encode @ base-x/src/esm/index.js:22` — 4.55%
- `createView @ @noble/hashes/esm/utils.js:14` — 4.07%
- `update @ @noble/hashes/esm/_sha2.js:31` — 3.05%
- `process @ @noble/hashes/esm/sha256.js:59` — 2.63%
- `uint8ArrayFromHexString @ automerge-repo/dist/helpers/bufferFromHex.js:1` — 1.88%
- `encode @ bs58check/src/esm/base.js:5` — 1.84%
- `digestInto @ @noble/hashes/esm/_sha2.js:57` — 1.21%
- `decodeUnsafe @ base-x/src/esm/index.js:67` — 0.76%
- `parse @ packages/common/keys/src/EID.ts:41` — 0.74%
- `interpretAsDocumentId @ automerge-repo/dist/AutomergeUrl.js:166` — 0.61%

### 2. `db.flush()`'s disk-flush path is un-scoped, not O(dirty), O(all loaded docs)

`EntityManager.flush()` (`packages/core/echo/echo-client/src/core-db/entity-manager.ts:662-685`)
passes `_getAllDocHandles()` to both `this._repoProxy.flush()` and `DataService.flush`:

```ts
async flush({ disk = true, indexes = true, updates = false }: Database.FlushOptions = {}): Promise<void> {
  ...
  if (disk) {
    await this._repoProxy.flush();
    await runServiceCall(this._runtime, this._dataService['DataService.flush']({
      documentIds: this._getAllDocHandles().map((handle) => handle.documentId).filter(...),
    }), { timeout: RPC_TIMEOUT });
  }
  ...
}
```

`_getAllDocHandles()` (`entity-manager.ts:1420-1424`):

```ts
private _getAllDocHandles(): DocHandleProxy<DatabaseDirectory>[] {
  return this._spaceRootDocHandle != null
    ? [this._spaceRootDocHandle, ...new Set(this._objectDocumentHandles.values())]
    : [];
}
```

This returns the space-root handle **plus every per-object document handle ever loaded into the
space** — not just the one touched by the current operation. Automerge-repo's own `Repo.flush()`
(`node_modules/.pnpm/@automerge+automerge-repo.../dist/Repo.js:690-715`) explicitly supports a
scoped `documents` array for exactly this case:

```js
async flush(documents) {
  const ids = documents ?? Object.keys(this.#queries);
  ...
  await Promise.all(ids.map(async (id) => {
    const state = this.#queries[id]?.peek();
    if (state?.state === "ready") { await this.storageSubsystem.saveDoc(id, state.handle.fullDoc()); }
  }));
  ...
}
```

DXOS's `EntityManager.flush()` never passes that `documents` array, so every `db.flush()` call
walks `#shouldSave` (`StorageSubsystem.js:267`) for **every** loaded document, not just the dirty
one. In a loop of N sequential create-then-flush calls this is O(N) work per flush call, O(N²)
total — visible in the profile as `flush @ Repo.js:702/706` (0.48%/0.96%) and `#shouldSave @
StorageSubsystem.js:267` (0.88%) even though only one document actually changed per call.

### 3. Automerge WASM itself (10.4%) — architectural, not a bug

`automerge_getHeads`, hexane B-tree slab lookups (`find_slab`/`update_slab`), and doc mutation
machinery. This is the inherent cost of "one Automerge document per object" and won't move without
either fixing #1/#2 (which ride on top of it) or changing the placement default.

### Confound already isolated

The original merged benchmark (`echo.bench.ts` pre-#12668) used `db.flush()`'s default
`indexes: true`, which fires a full-DB `DataService.updateIndexes` RPC on **every** timed
operation for both storage kinds identically. That diluted the real signal enough that the
original numbers showed feed inserts _slower_ than automerge inserts, which contradicts the
architecture. Re-running with `flush({ indexes: false })` restored the expected direction (feed
~2.3x faster wall-clock for an equivalent workload — see FEED-TRACK.md). Index-engine code is
<0.2% of this profile, confirming the isolation is clean; it is not a residual factor in findings
1-3 above.

## Proposed optimizations (ranked)

1. **Memoize / avoid the redundant bs58check round-trip.** Either cache `encode`/`decode` results
   for Automerge document IDs (small LRU keyed by the raw bytes — IDs are immutable once minted),
   or fix `Repo.create2()` to not encode-then-immediately-decode a freshly minted ID. Expected to
   remove most of the 20% checksum bucket, since a large share of it is this specific redundant
   round trip rather than checksums genuinely needed for wire/storage encoding.
2. **Scope `EntityManager.flush()`'s disk-flush to the touched document(s).** Thread the specific
   `DocumentId`(s) affected by the current mutation through to `_repoProxy.flush(documentIds)` and
   `DataService.flush({ documentIds })`, instead of `_getAllDocHandles()`. Turns O(loaded docs) into
   O(1) per flush call. Requires tracking "which doc handle did this op touch" at the call site
   (likely already knowable from the mutation/creation path) rather than reusing the
   "all handles" helper.
3. **(Lower priority, architectural)** If per-object Automerge overhead remains the dominant cost
   after 1-2, consider whether `linked-doc` should stay the default placement for high-volume
   append-style writes, vs. steering those call sites toward feed placement (see FEED-TRACK.md).

## Status

Analysis complete (findings 1-3 verified against source + profile). No code changes made yet
beyond the benchmark harness itself (PR #12649, #12668). Optimizations 1 and 2 are not yet
implemented — pending a go-ahead to touch `automerge-repo`'s dist patch / `AutomergeUrl.js` (1)
and `EntityManager.flush()` (2), both outside `echo-client-e2e`.
