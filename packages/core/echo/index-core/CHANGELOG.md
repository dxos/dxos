# @dxos/index-core

## 0.12.0

### Minor Changes

- 4ececc6: Projects and chat sessions can be archived. An archived object leaves the navigation tree but stays
  listed in the space's Database section, where its card shows an "Archived" badge and an Unarchive
  action. Types opt in with `ArchivableAnnotation`; the archive state is `ArchivedAnnotation` in the
  object's meta. `Filter.annotation(annotation)` matches entities carrying any meta annotation, and
  `Filter.annotation(annotation, value)` those whose scalar value is equal, in memory and in SQL.
- 5cfa37d: A feed query with a `limit` now reads bounded work: the planner pushes the cap into the index scan (`ORDER BY objectId … LIMIT n`, with the deleted filter folded in), so asking a feed for 10 items reads 10 rows and decodes 10 snapshots instead of materialising every block in the feed to hand back 10. Measured on a 40-item feed, the two tail reads `Cursor.seedDedupSet` issues per sync go from 40 index hits and 40 decoded documents each to 5 and 5.

  The cap moves into the scan only where the planner can prove it sound — a feed-only scope, a natural (insertion-order) ordering in either direction, and no step between the select and the limit that would prune the page. Anything else keeps the previous behaviour.

  A queue read is now scoped by the space that owns the queue. `objectMeta` and the FTS index previously matched a feed on `queueId` alone, so a queue id occurring in two spaces would have read both spaces' rows; the feed URI already carries the space, and the query now uses it. An unqualified feed URI (`echo:///<id>`) names no space to scope to and still matches on the id alone.

  `QueueWindow` in `@dxos/index-core` is now a tagged union: `{ kind: 'cursor', after, before?, limit? }` for a positional cursor read (its previous shape, plus the tag) and `{ kind: 'natural', direction, limit, deleted? }` for a bounded natural read. `queryAll` / `queryTypes` / the FTS query take `queues: QueueRef[]` (`{ queueId, spaceId? }`) in place of `queueIds: string[]`, and a new `objectMeta(spaceId, queueId, objectId)` index backs the natural read.

- 9b0d4b5: Full-text search matches an object's text content instead of its JSON. Indexing the JSON made
  every property name a search term, so `title` or `name` matched any object that merely had such a
  field, and under a trigram tokenizer any 3-character window of a key (`des` of `description`)
  matched too. The index now stores only the string values an object contains — property names,
  identifiers, typenames, reference URIs and numbers are dropped — and rebuilds itself on first open
  after the upgrade.

### Patch Changes

- eb2fd6d: Fix indexing failing outright against Durable Object SQLite, where batched index writes exceeded the runtime's bound-variable limit of 100 and every indexing pass threw before completing. Statements are now sized by the variables they bind rather than by a row count.
- 4fc8f3a: Stop re-persisting already-stored Automerge data on startup, and halve the indexer's per-pass reads.

  **Reload no longer rewrites the whole document history.** `SubductionSource` dedupes writes against `entry.knownHashes`, which starts empty every process and was never seeded from disk, so the first save after reattaching a document treated its entire on-disk sedimentree as new and wrote all of it back. The pinned `@automerge/automerge-repo@2.6.0-subduction.40` patch now mirrors the attach-time hash scan into `knownHashes` (ports upstream automerge/automerge-repo#712). Measured on a real profile, `subduction-commits-*` / `subduction-fragments-*` inserts on boot drop to zero.

  Note this does not cover `subduction-remote-heads-*` records, which are deduped through a separate in-memory cache with the same cold-start blindness and are still rewritten each boot.

  **Indexer reads halved per pass.** Document heads are read once per `IndexEngine.update` and shared across the `fts5` and `reverseRef` indexes instead of being re-scanned for each, and each source's cursors load in a single statement rather than one per index. Cursor state remains per-index, so what gets indexed is unchanged; the heads snapshot lives only for the duration of one pass, so it cannot go stale. On a real boot this took `indexCursor` from 4 to 2 reads and the unbounded `automerge_heads` scan from 2 to 1 per pass.

  The index-pass completion log now reports `reasons`, `durationMs`, and `invalidates`, attributing each run to what scheduled it — `DeferredTask` coalesces callers, so the reason is recorded as a multiset.

- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [f82c78f]
- Updated dependencies [63fc847]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [7575cb6]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [472ca95]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [256f286]
- Updated dependencies [690dcaa]
- Updated dependencies [df93cc2]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [56276cd]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/context@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

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
