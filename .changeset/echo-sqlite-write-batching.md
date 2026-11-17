---
'@dxos/feed': patch
---

Indexing, sync and storage issue far fewer SQLite statements. `FeedStore.append` creates a pulled batch's feeds in bulk and skips slot eviction when nothing collides, `FeedStore.trimAll` skips feeds without options when no host cap is set, the entity-meta and reverse-ref indexes write each batch in a few statements instead of several per object, and the OPFS worker reuses prepared statements.
