---
'@dxos/echo': patch
---

ECHO's object snapshots move out of the full-text index into their own `ObjectSnapshotIndex`, an
index in its own right with its own `objectSnapshot` table and its own indexing cursor. `FtsIndex`
is now only the trigram index, derived from that store rather than fed from the data source.

Queries, snapshot hydration and the sub-trigram `LIKE` fallback all read the snapshot store, which
is written on the indexing pass and so stays current on every write. The trigram re-tokenization —
which FTS5 cannot do in place, and which rewrote every trigram of an object on each save — is marked
dirty in the same transaction and rebuilt on an idle moment or before the next `MATCH`, whichever
comes first. Editing a 113KB document with a burst of 300 keystrokes writes 17% fewer bytes and
reads 49% fewer; the index path's own share of that burst falls from 4.10MB and 310ms to 0.66MB and
65ms.

Migrations create the table, backfill it from the existing index and rename the old `fts6` cursor,
so no document is re-read and nothing is re-tokenized on upgrade.
