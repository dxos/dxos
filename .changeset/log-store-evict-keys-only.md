---
'@dxos/log-store-idb': patch
---

`IdbLogStore` eviction no longer reads the stored log payloads. A chunk's UTF-8 byte length is measured once when the chunk is written and kept in its key, so a sweep reads `getAllKeys()` alone instead of pulling every row and re-encoding it to size it. On a full 50 MB store each sweep was allocating roughly twice that.

Writes no longer trigger a sweep either. Eviction now runs only on the `evictionInterval` timer and on an explicit `evictNow()` or export, where a flush used to trigger one, so sweeps ran several times a second under load.

The chunk key gained a field, so the IndexedDB schema is at version 3. The upgrade discards existing rows, as the version 2 upgrade did: retained logs are expendable diagnostics, and rows keyed without a byte length would force the sweep to read payloads back for them.
