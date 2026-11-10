---
'@dxos/link': patch
---

Mail sync without a filter no longer loses new mail that arrives with an old date, such as an imported message, and its delta never commits a message twice: the delta keeps messages dated at or after the backfill's low mark and leaves older ones to the backfill, its token advances on capped runs, and the cursor records the delta ids a held token would replay.
