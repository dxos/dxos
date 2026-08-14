---
'@dxos/echo-host': patch
'@dxos/index-core': patch
---

Stop re-persisting already-stored Automerge data on startup, and halve the indexer's per-pass reads.

**Reload no longer rewrites the whole document history.** `SubductionSource` dedupes writes against `entry.knownHashes`, which starts empty every process and was never seeded from disk, so the first save after reattaching a document treated its entire on-disk sedimentree as new and wrote all of it back. The pinned `@automerge/automerge-repo@2.6.0-subduction.40` patch now mirrors the attach-time hash scan into `knownHashes` (ports upstream automerge/automerge-repo#712). Measured on a real profile, `subduction-commits-*` / `subduction-fragments-*` inserts on boot drop to zero.

Note this does not cover `subduction-remote-heads-*` records, which are deduped through a separate in-memory cache with the same cold-start blindness and are still rewritten each boot.

**Indexer reads halved per pass.** Document heads are read once per `IndexEngine.update` and shared across the `fts5` and `reverseRef` indexes instead of being re-scanned for each, and each source's cursors load in a single statement rather than one per index. Cursor state remains per-index, so what gets indexed is unchanged; the heads snapshot lives only for the duration of one pass, so it cannot go stale. On a real boot this took `indexCursor` from 4 to 2 reads and the unbounded `automerge_heads` scan from 2 to 1 per pass.

The index-pass completion log now reports `reasons`, `durationMs`, and `invalidates`, attributing each run to what scheduled it — `DeferredTask` coalesces callers, so the reason is recorded as a multiset.
