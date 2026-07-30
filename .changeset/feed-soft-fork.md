---
'@dxos/echo': minor
---

Add soft-fork support to feeds: `Feed.append(feed, items, { parent })` continues a feed from an earlier item, and `Feed.history(items)` resolves the live branch at read time. Feeds that set no parent are unaffected.
