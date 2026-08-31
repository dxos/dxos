---
'@dxos/echo': patch
---

Make `SqliteStorageAdapter`'s prefix queries plain index range seeks.

`loadRange` and `removeRange` matched with `key = ? OR key GLOB ?`. The `OR` plans as `MULTI-INDEX OR`, which discards index ordering, so `ORDER BY key ASC` materialized a temp B-tree on every call. Both now select the exact key and its descendant range as two range seeks, with `loadRange` sorting in JS — free at the sizes it returns, which are usually one or two rows. Measured against a 19.5k-row table with production key shapes: 0.0148 ms → 0.0075 ms for a single-row result, 0.0372 ms → 0.0295 ms for 18 rows.

The range bounds are anchored on the segment separator (`[prefix + '-', prefix + '.')`), not on the prefix itself. That distinction is load-bearing: bounds anchored on the prefix degrade to a raw string-prefix match, which never inspects the character after the prefix and so also returns siblings whose segment merely begins with the same text — a different document's chunks. Anchoring on the separator makes the match exact for any segment content rather than relying on ids being fixed-length, which matters because the composite key layout is protocol.
