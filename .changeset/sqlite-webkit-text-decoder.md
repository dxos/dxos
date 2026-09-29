---
'@dxos/sql-sqlite': patch
---

Fix SQLite reads failing with `RangeError: Bad value` in long-running Safari 18 (WebKit) workers. The wa-sqlite module now decodes strings through a `TextDecoder` it replaces before WebKit's per-instance 2 GiB running total is reached, and a row that still fails to decode logs the column name, storage class and byte length that raised it.
