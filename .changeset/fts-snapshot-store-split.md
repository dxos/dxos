---
'@dxos/echo': patch
---

ECHO's object snapshots move out of the full-text index into their own `objectSnapshot` table, so
`ftsIndex` is now only an index. Queries, snapshot hydration and the sub-trigram `LIKE` fallback all
read the new table and stay current on every write, while the trigram re-tokenization — which FTS5
cannot do in place, and which rewrote every trigram of an object on each save — is queued and applied
on an idle moment or before the next `MATCH`, whichever comes first. Editing a 113KB document with a
burst of 300 keystrokes writes 17% fewer bytes and reads 49% fewer; the index path's own share of
that burst falls from 4.10MB and 310ms to 0.66MB and 65ms.

A migration creates the table and backfills it from the existing index; no re-indexing is needed.
