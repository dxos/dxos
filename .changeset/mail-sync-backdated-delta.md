---
'@dxos/link': patch
---

Mail sync no longer drops new mail that arrives dated inside the already-synced range (for example an imported message keeping its original date): messages from an incremental delta are deduplicated by identity, and they no longer mark older, unscanned ranges as synced.
