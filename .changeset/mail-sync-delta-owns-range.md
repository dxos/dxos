---
'@dxos/link': patch
---

Mail sync no longer loses new mail that arrives with an old date, such as an imported message, and never commits a message twice: the incremental delta keeps every message dated at or after the backfill's low mark, leaves older ones to the backfill, advances its token on capped runs, and the cursor records the delta ids a held token would replay.
