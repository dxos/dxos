# @dxos/index-core

## 0.12.0

### Patch Changes

- 4fc8f3a: Stop re-persisting already-stored Automerge data on startup, and halve the indexer's per-pass reads.

  **Reload no longer rewrites the whole document history.** `SubductionSource` dedupes writes against `entry.knownHashes`, which starts empty every process and was never seeded from disk, so the first save after reattaching a document treated its entire on-disk sedimentree as new and wrote all of it back. The pinned `@automerge/automerge-repo@2.6.0-subduction.40` patch now mirrors the attach-time hash scan into `knownHashes` (ports upstream automerge/automerge-repo#712). Measured on a real profile, `subduction-commits-*` / `subduction-fragments-*` inserts on boot drop to zero.

  Note this does not cover `subduction-remote-heads-*` records, which are deduped through a separate in-memory cache with the same cold-start blindness and are still rewritten each boot.

  **Indexer reads halved per pass.** Document heads are read once per `IndexEngine.update` and shared across the `fts5` and `reverseRef` indexes instead of being re-scanned for each, and each source's cursors load in a single statement rather than one per index. Cursor state remains per-index, so what gets indexed is unchanged; the heads snapshot lives only for the duration of one pass, so it cannot go stale. On a real boot this took `indexCursor` from 4 to 2 reads and the unbounded `automerge_heads` scan from 2 to 1 per pass.

  The index-pass completion log now reports `reasons`, `durationMs`, and `invalidates`, attributing each run to what scheduled it — `DeferredTask` coalesces callers, so the reason is recorded as a multiset.

- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [df93cc2]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/context@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/sql-sqlite@0.11.1

## 0.11.0

### Patch Changes

- 7b270f2: Feed removals now index a body-preserving tombstone: a `{ id, '@deleted': true }` block is merged onto the object's prior snapshot (and its meta row keeps the original type/kind/relation/parent) instead of replacing it wholesale. Queries with `deleted: 'include'` therefore return the deleted feed object with its type and body intact, so it hydrates as a deleted object (`Obj.isDeleted === true`) rather than being dropped.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/context@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/invariant@0.11.0
