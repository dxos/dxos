---
'@dxos/echo': minor
---

Query results are backed by the index's JSON copy of each object, with the object's Automerge document held as stored changes the tab has not loaded. The first write or document read (cursors, history, version checkout) loads those changes synchronously, makes the first write at the heads the object was shown at, and subscribes the document from there. This is how every query loads its results; there is no switch back.

- The index keeps each object's meta and the heads its JSON was read at; existing databases re-index once to fill them. A row's document changes are read from storage when the row is sent, not copied into the index.
- `Uint8Array` values in an object's indexed JSON use the `{ '/': { bytes } }` form the feed serializer writes.
- A database can opt in to `eviction`, which returns idle documents to stored changes. Off by default.
