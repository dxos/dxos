---
'@dxos/echo': patch
---

ECHO's object snapshots move out of the full-text index into their own `ObjectSnapshotIndex`, an
index in its own right with its own `objectSnapshot` table and its own indexing cursor. Indexing
becomes two steps: the first writes metadata, snapshots and reverse-refs from automerge and feeds;
the second re-tokenizes the full-text index from what the first wrote. That second step reads the
index back through an ordinary index source, ordered by the monotonic `objectMeta.version` counter
the first step stamps, so a secondary index tracks its cursor in `indexCursor` and is retired and
rebuilt exactly like a primary one.

Queries, snapshot hydration and the sub-trigram `LIKE` fallback all read the snapshot store, which
is written on the indexing pass and so stays current on every write. The trigram re-tokenization —
which FTS5 cannot do in place, and which rewrote every trigram of an object on each save — runs on
an idle moment or before the next `MATCH`, whichever comes first, so a search never sees a stale
index and a burst of edits is caught up once rather than per save. `Database.flush` gains a
`secondaryIndexes` option for a caller that needs the full-text index current on the spot. Editing a 113KB document with a
burst of 300 keystrokes writes 17% fewer bytes and reads 49% fewer; the index path's own share of
that burst falls from 4.10MB and 310ms to 0.66MB and 65ms.

Existing databases refill the new table by re-indexing, which the retired cursor name triggers on
the next pass.
