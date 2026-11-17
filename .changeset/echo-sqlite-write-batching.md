---
'@dxos/feed': patch
---

Indexing and storage issue fewer SQLite statements: `FeedStore.trimAll` skips feeds without options when no host cap is set, the entity-meta and reverse-ref indexes write each batch in a few statements instead of several per object, and the OPFS worker reuses prepared statements.
